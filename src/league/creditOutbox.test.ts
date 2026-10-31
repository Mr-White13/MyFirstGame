import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { createProgress } from '../progress/Progress';
import { createStats } from '../profile/Stats';
import { Rewards, REWARDS_KEY } from '../rewards/Rewards';
import { LEAGUE_KEY, LeagueService } from './LeagueService';
import { MemoryStore } from '../testing/memoryStore';

/**
 * League credits travel to the wallet through an outbox (see LeagueService).
 * These tests record what happens today when the Rewards save fails or the
 * Rewards record is read-only, including the loss the audit calls B4: the
 * retry sees the transaction as a duplicate, reports it delivered, and the
 * outbox drops it although the saved wallet never got it.
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

  it('a failed Rewards save keeps the transaction in the outbox, but (B4) the retry drops it without saving the wallet', () => {
    const store = new MemoryStore();
    const { rewards, league, savedWallet, savedOutbox } = setup(store);
    store.failWrites = (key) => key === REWARDS_KEY;
    league.flush();
    expect(rewards.credits).toBe(50); // applied in memory
    expect(savedWallet()).toBeNull();
    expect(league.current.outbox).toEqual([TX]);

    store.failWrites = false;
    league.flush(); // earn() reports a duplicate, grant() says true
    expect(league.current.outbox).toEqual([]);
    expect(savedOutbox()).toEqual([]);
    expect(savedWallet()).toBeNull(); // nothing re-saved the wallet
    expect(rewards.credits).toBe(50); // only the in-memory record has it (saved by the next Rewards change)
  });

  it('a read-only (newer) Rewards record: the outbox drains on the second flush and the credit is never saved (B4)', () => {
    const store = new MemoryStore();
    const newer = JSON.stringify({ version: 2, wallet: { credits: 7, earned: 7, applied: [] } });
    store.data.set(REWARDS_KEY, newer);
    const { rewards, league, savedOutbox } = setup(store);
    league.flush();
    expect(league.current.outbox).toEqual([TX]); // the save was refused
    league.flush();
    expect(league.current.outbox).toEqual([]);
    expect(savedOutbox()).toEqual([]);
    expect(store.data.get(REWARDS_KEY)).toBe(newer); // the newer save is protected, the credit is gone
    expect(store.data.get(`${REWARDS_KEY}.backup`)).toBe(newer);
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
