import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { createProgress } from '../progress/Progress';
import { createStats } from '../profile/Stats';
import { Rewards, REWARDS_KEY } from '../rewards/Rewards';
import { LEAGUE_KEY, LeagueService } from './LeagueService';
import { MemoryStore } from '../testing/memoryStore';

/**
 * League credits travel to the wallet through an outbox (see LeagueService).
 * A credit leaves the outbox only once the wallet holding it is saved, also
 * when the Rewards save fails or the Rewards record is read-only (B4: a retry
 * used to see a duplicate, report it delivered and drop it unsaved).
 */

const DAY = '2026-10-31';
const TX = { id: 'league:test-credit', amount: 50 };

function setup(store: MemoryStore) {
  store.data.set(LEAGUE_KEY, JSON.stringify({ version: 1, tier: 0, lastDay: DAY, outbox: [TX] }));
  const rewards = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats(new Date('2026-10-01T00:00:00Z')) }) }, store);
  const league = new LeagueService(LEVELS, (tx) => rewards.grant(DAY, tx), store);
  const savedWallet = () => (store.data.has(REWARDS_KEY) ? JSON.parse(store.data.get(REWARDS_KEY)!).wallet : null);
  const savedOutbox = () => JSON.parse(store.data.get(LEAGUE_KEY)!).outbox;
  return { rewards, league, savedWallet, savedOutbox };
}

describe('league credit outbox', () => {
  it('normally: the wallet is saved with the credit, then the outbox is emptied', () => {
    const store = new MemoryStore();
    const { rewards, league, savedWallet, savedOutbox } = setup(store);
    league.flush();
    expect(rewards.credits).toBe(50);
    expect(savedWallet()).toMatchObject({ credits: 50, earned: 50, applied: [TX.id] });
    expect(league.current.outbox).toEqual([]);
    expect(savedOutbox()).toEqual([]);
  });

  it('a failed Rewards save keeps the credit in the outbox; the retry saves the wallet, then drains it (B4)', () => {
    const store = new MemoryStore();
    const { rewards, league, savedWallet, savedOutbox } = setup(store);
    store.failWrites = (key) => key === REWARDS_KEY;
    league.flush();
    league.flush(); // still failing: still owed
    expect(rewards.credits).toBe(50); // applied in memory, once
    expect(savedWallet()).toBeNull();
    expect(league.current.outbox).toEqual([TX]);
    expect(savedOutbox()).toEqual([TX]);

    store.failWrites = false;
    league.flush();
    expect(savedWallet()).toMatchObject({ credits: 50, earned: 50, applied: [TX.id] }); // saved now...
    expect(league.current.outbox).toEqual([]); // ...and only then delivered
    expect(savedOutbox()).toEqual([]);
    expect(rewards.credits).toBe(50); // never paid twice
  });

  it('a read-only (newer) Rewards record: the credit stays owed in the outbox and the newer save is untouched (B4)', () => {
    const store = new MemoryStore();
    const newer = JSON.stringify({ version: 2, wallet: { credits: 7, earned: 7, applied: [] } });
    store.data.set(REWARDS_KEY, newer);
    const { league, savedOutbox } = setup(store);
    for (let i = 0; i < 3; i++) league.flush();
    expect(league.current.outbox).toEqual([TX]);
    expect(savedOutbox()).toEqual([TX]); // kept for a version that can save the wallet
    expect(store.data.get(REWARDS_KEY)).toBe(newer);
    expect(store.data.get(`${REWARDS_KEY}.backup`)).toBe(newer);
  });

  it('a credit already in the saved wallet (delivered before an interruption) is delivered without paying again', () => {
    const store = new MemoryStore();
    store.data.set(REWARDS_KEY, JSON.stringify({ version: 1, wallet: { credits: 50, earned: 50, applied: [TX.id] } }));
    const { rewards, league, savedOutbox } = setup(store);
    league.flush();
    expect(league.current.outbox).toEqual([]);
    expect(savedOutbox()).toEqual([]);
    expect(rewards.credits).toBe(50);
  });

  it('a grant that throws keeps the transaction for next time', () => {
    const store = new MemoryStore();
    store.data.set(LEAGUE_KEY, JSON.stringify({ version: 1, tier: 0, lastDay: DAY, outbox: [TX] }));
    let calls = 0;
    const league = new LeagueService(LEVELS, () => {
      calls++;
      throw new Error('boom');
    }, store);
    league.flush();
    league.flush();
    expect(calls).toBe(2);
    expect(league.current.outbox).toEqual([TX]);
  });

  it('invalid transactions are reported delivered and dropped', () => {
    const store = new MemoryStore();
    const { rewards } = setup(store);
    expect(rewards.grant(DAY, { id: '', amount: 5 })).toBe(true);
    expect(rewards.credits).toBe(0);
  });
});
