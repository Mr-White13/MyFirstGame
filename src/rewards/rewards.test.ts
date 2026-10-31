import { describe, expect, it } from 'vitest';
import { applyAttempt, type AttemptSummary } from '../app/AttemptTracker';
import { GameState } from '../core/GameState';
import { addDays } from '../daily/dayKey';
import { LEVELS } from '../levels';
import { createProfile, PROFILE_KEY, ProfileStorage, withNickname } from '../profile/Profile';
import { createStats, STATS_KEY, StatsStorage, type PlayerStats } from '../profile/Stats';
import { createProgress, recordCompletion, type Progress } from '../progress/Progress';
import { STORAGE_KEY as PROGRESS_KEY, ProgressStorage } from '../progress/ProgressStorage';
import { SETTINGS_KEY, SettingsStore } from '../settings/Settings';
import type { KeyValueStore } from '../storage/SafeStore';
import { achievementViews, ACHIEVEMENTS, newlyUnlocked, SPEED_RUN_MS, type AchievementContext } from './Achievements';
import { findChain } from './chainFeasibility';
import { readRewards, REWARDS_KEY, REWARDS_VERSION, Rewards, serializeRewards, createRewards } from './Rewards';
import { createWallet, earn, MAX_TRANSACTION, readWallet, spend, type Wallet, type WalletResult } from './Wallet';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  writes: string[] = [];
  failWrites = false;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.writes.push(key);
    this.data.set(key, value);
  }
}

const DAY = '2026-10-31';

/** The wallet from a successful transaction (fails the test otherwise). */
function ok(result: WalletResult): Wallet {
  if (!result.ok) throw new Error(`transaction failed: ${result.reason}`);
  return result.wallet;
}

/** A Rewards service over in-memory records the test can change, like App does. */
function setup(store = new MemoryStore()) {
  const records = { progress: createProgress() as Progress, stats: createStats(new Date(Date.UTC(2026, 0, 1))) as PlayerStats };
  const rewards = new Rewards({ levels: LEVELS, records: () => records }, store);
  return { rewards, records, store };
}

const win = (progress: Progress, levelId: number, stars = 3, timeMs = 60_000) =>
  recordCompletion(progress, levelId, { moves: 5, stars, mistakes: 3 - stars, timeMs }, LEVELS.length, LEVELS[levelId - 1].revision ?? 1).progress;

function context(over: Partial<AchievementContext> = {}): AchievementContext {
  return { levels: LEVELS, progress: createProgress(), stats: createStats(), daily: createRewards().daily, bestChain: 0, ...over };
}

describe('wallet', () => {
  it('adds credits once per transaction id', () => {
    const a = earn(createWallet(), { id: 'daily:2026-10-31', amount: 20 });
    expect(a).toMatchObject({ ok: true, wallet: { credits: 20, earned: 20 } });
    if (!a.ok) throw new Error();
    expect(earn(a.wallet, { id: 'daily:2026-10-31', amount: 20 })).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects invalid amounts and ids', () => {
    const w = createWallet();
    for (const amount of [0, -5, 1.5, NaN, MAX_TRANSACTION + 1]) expect(earn(w, { id: 'x', amount })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(earn(w, { id: '', amount: 5 })).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('is ready for spending later: never below zero, never twice', () => {
    const rich = ok(earn(createWallet(), { id: 'a', amount: 50 }));
    expect(spend(rich, { id: 'spend:hint-1', amount: 80 })).toEqual({ ok: false, reason: 'insufficient' });
    const spent = spend(rich, { id: 'spend:hint-1', amount: 30 });
    expect(spent).toMatchObject({ ok: true, wallet: { credits: 20, earned: 50 } });
    if (spent.ok) expect(spend(spent.wallet, { id: 'spend:hint-1', amount: 5 })).toMatchObject({ reason: 'duplicate' });
  });

  it('keeps only recent daily ids but every achievement id', () => {
    let wallet = ok(earn(createWallet(), { id: 'achievement:first-escape', amount: 15 }));
    for (let i = 0; i < 40; i++) wallet = ok(earn(wallet, { id: `daily:${addDays(DAY, i)}`, amount: 10 }));
    expect(wallet.applied).toContain('achievement:first-escape');
    expect(wallet.applied.filter((t) => t.startsWith('daily:'))).toHaveLength(30);
    expect(wallet.credits).toBe(415);
  });

  it('never trusts a stored balance above what was earned', () => {
    expect(readWallet({ credits: 9999, earned: 40, applied: ['daily:x', 7] })).toEqual({ credits: 40, earned: 40, applied: ['daily:x'] });
    expect(readWallet('garbage')).toEqual(createWallet());
  });
});

describe('daily reward claims', () => {
  it('first check-in, then one claim per date', () => {
    const { rewards } = setup();
    expect(rewards.checkIn(DAY)).toBe('first');
    expect(rewards.status(DAY)).toBe('available');
    const result = rewards.claimDaily(DAY)!;
    expect(result.reward).toMatchObject({ day: 1, credits: 10 });
    expect(result.unlocked.map((a) => a.id)).toEqual(['first-check-in']);
    expect(rewards.credits).toBe(10 + 10);
    expect(rewards.claimDaily(DAY)).toBeNull();
    expect(rewards.credits).toBe(20);
  });

  it('opening the game never pays by itself, even on a new day', () => {
    const { rewards } = setup();
    rewards.checkIn(DAY);
    rewards.checkIn(addDays(DAY, 1));
    rewards.checkIn(addDays(DAY, 2));
    expect(rewards.current.daily.claims).toBe(0);
    expect(rewards.current.wallet.applied.some((t) => t.startsWith('daily:'))).toBe(false);
    expect(rewards.current.daily.streak).toBe(3);
    // The only credits are the Three-Day Streak achievement's.
    expect(rewards.credits).toBe(ACHIEVEMENTS.find((a) => a.id === 'three-day-streak')!.reward);
  });

  it('pays the cycle amounts over a week', () => {
    const { rewards } = setup();
    const paid: number[] = [];
    for (let i = 0; i < 8; i++) {
      const day = addDays(DAY, i);
      rewards.checkIn(day);
      paid.push(rewards.claimDaily(day)!.reward.credits);
    }
    expect(paid).toEqual([10, 15, 20, 25, 30, 40, 75, 10]);
  });

  it('saves the claim and its credits in one write', () => {
    const store = new MemoryStore();
    const { rewards } = setup(store);
    rewards.checkIn(DAY);
    store.writes = [];
    rewards.claimDaily(DAY);
    expect(store.writes).toEqual([REWARDS_KEY]); // one atomic setItem
    const saved = readRewards(store.data.get(REWARDS_KEY)!).value;
    expect(saved.daily.lastClaim).toBe(DAY);
    expect(saved.wallet.applied).toContain('daily:2026-10-31');
    expect(saved.wallet.credits).toBe(20);
  });

  it('cannot be claimed again after a refresh', () => {
    const store = new MemoryStore();
    setup(store).rewards.checkIn(DAY);
    setup(store).rewards.claimDaily(DAY);
    const reloaded = setup(store).rewards;
    reloaded.checkIn(DAY);
    expect(reloaded.status(DAY)).toBe('claimed');
    expect(reloaded.claimDaily(DAY)).toBeNull();
    expect(reloaded.credits).toBe(20);
  });

  it('an interrupted (failed) write never leaves a claim without credits or credits without a claim', () => {
    const store = new MemoryStore();
    const { rewards } = setup(store);
    rewards.checkIn(DAY);
    store.failWrites = true;
    rewards.claimDaily(DAY); // works for this session, but nothing was saved
    store.failWrites = false;
    const reloaded = readRewards(store.data.get(REWARDS_KEY)!).value;
    expect(reloaded.daily.lastClaim).toBeNull();
    expect(reloaded.wallet.credits).toBe(0);
  });

  it('even with a hand-edited daily record, the wallet refuses to pay the same date twice', () => {
    const store = new MemoryStore();
    setup(store).rewards.checkIn(DAY);
    setup(store).rewards.claimDaily(DAY);
    const record = JSON.parse(store.data.get(REWARDS_KEY)!);
    record.daily.lastClaim = null;
    record.daily.claimedDays = [];
    store.data.set(REWARDS_KEY, JSON.stringify(record));
    const rewards = setup(store).rewards;
    expect(rewards.status(DAY)).toBe('available');
    expect(rewards.claimDaily(DAY)).toBeNull();
    expect(rewards.credits).toBe(20);
  });

  it('a clock moved back to an unclaimed earlier date pays nothing', () => {
    const { rewards } = setup();
    rewards.checkIn(DAY);
    rewards.claimDaily(DAY);
    expect(rewards.checkIn('2026-10-25')).toBe('clock-back');
    expect(rewards.status('2026-10-25')).toBe('clock-back');
    expect(rewards.claimDaily('2026-10-25')).toBeNull();
  });
});

describe('achievements', () => {
  it('has 12 achievements with modest rewards and unique ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(12);
    for (const a of ACHIEVEMENTS) {
      expect(a.reward).toBeGreaterThan(0);
      expect(a.reward).toBeLessThanOrEqual(75);
      expect(a.description.length).toBeGreaterThan(5);
    }
  });

  it('reports progress toward each target', () => {
    let progress = createProgress();
    progress = win(progress, 1, 3);
    progress = win(progress, 2, 2);
    const views = achievementViews({}, context({ progress }));
    const byId = Object.fromEntries(views.map((v) => [v.definition.id, v]));
    expect(byId['puzzle-explorer'].progress).toBe(2);
    expect(byId['flawless-five'].progress).toBe(1);
    expect(byId['puzzle-veteran'].progress).toBe(2);
    expect(newlyUnlocked({}, context({ progress })).map((a) => a.id)).toEqual(['first-escape', 'perfect-run']);
  });

  it('Speed Runner needs a 10+ arrow level under 30 seconds', () => {
    let progress = win(createProgress(), 1, 3, 5_000); // the 5-arrow tutorial doesn't count
    expect(newlyUnlocked({}, context({ progress })).some((a) => a.id === 'speed-runner')).toBe(false);
    const level = LEVELS.find((l) => l.arrows.length >= 10)!;
    for (let id = 2; id <= level.id; id++) progress = win(progress, id, 3, id === level.id ? SPEED_RUN_MS - 1 : 90_000);
    expect(newlyUnlocked({}, context({ progress })).some((a) => a.id === 'speed-runner')).toBe(true);
  });

  it('daily achievements follow streaks and days played', () => {
    const { rewards } = setup();
    for (let i = 0; i < 7; i++) rewards.checkIn(addDays(DAY, i));
    const unlocked = Object.keys(rewards.current.achievements);
    expect(unlocked).toEqual(expect.arrayContaining(['three-day-streak', 'weekly-explorer']));
    expect(unlocked).not.toContain('dedicated-player');
    for (let i = 9; i < 16; i++) rewards.checkIn(addDays(DAY, i)); // a gap, then 7 more days: 14 distinct
    expect(rewards.current.daily.daysPlayed).toBe(14);
    expect(Object.keys(rewards.current.achievements)).toContain('dedicated-player');
  });

  it('unlock once and pay once, however often the level is replayed', () => {
    const { rewards, records } = setup();
    records.progress = win(records.progress, 1);
    const first = rewards.afterAttempt(DAY, 0).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['first-escape', 'perfect-run']));
    const credits = rewards.credits;
    expect(credits).toBe(15 + 20);
    for (let i = 0; i < 5; i++) {
      records.progress = win(records.progress, 1);
      expect(rewards.afterAttempt(DAY, 0)).toEqual([]);
    }
    expect(rewards.credits).toBe(credits);
    expect(rewards.current.achievements['first-escape']).toBe(DAY);
  });

  it('pays an achievement once even if its unlock record is lost', () => {
    const store = new MemoryStore();
    const { rewards, records } = setup(store);
    records.progress = win(records.progress, 1);
    rewards.afterAttempt(DAY, 0);
    const record = JSON.parse(store.data.get(REWARDS_KEY)!);
    record.achievements = {};
    store.data.set(REWARDS_KEY, JSON.stringify(record));
    const again = new Rewards({ levels: LEVELS, records: () => records }, store);
    again.sync(DAY);
    expect(again.current.achievements['first-escape']).toBe(DAY); // shown as unlocked again…
    expect(again.credits).toBe(35); // …but not paid twice
  });

  it('chain achievements come from the longest chain of any attempt', () => {
    const { rewards, records } = setup();
    records.stats = { ...records.stats, chainClears: 1 };
    expect(rewards.afterAttempt(DAY, 1).map((a) => a.id)).toEqual(['chain-reaction']);
    expect(rewards.afterAttempt(DAY, 2).map((a) => a.id)).toEqual(['double-chain']);
    expect(rewards.current.bestChain).toBe(2);
    rewards.afterAttempt(DAY, 0);
    expect(rewards.current.bestChain).toBe(2); // never goes down
  });

  it('every chain achievement is reachable, and longer chains are not (two red arrows at most)', () => {
    expect(findChain(LEVELS[1], 2)).not.toBeNull();
    for (const level of LEVELS.slice(0, 5)) expect(findChain(level, 3)).toBeNull();
    // Replaying the found taps really reports a 2-arrow chain.
    const taps = findChain(LEVELS[1], 2)!;
    const state = new GameState(LEVELS[1]);
    taps.forEach((id) => state.tryMove(id));
    expect(state.snapshot().longestChain).toBe(2);
    expect(state.snapshot().lives).toBeGreaterThan(0);
  });
});

describe('integration with records', () => {
  it('a real winning attempt flows through statistics into achievements', () => {
    const { rewards, records } = setup();
    const summary: AttemptSummary = {
      levelId: 1, revision: LEVELS[0].revision ?? 1, outcome: 'won', timeMs: 20_000, uncountedTimeMs: 20_000,
      moves: 5, stars: 3, directClears: 4, autoClears: 1, cascadeClears: 0, longestChain: 1, mistakes: 0,
    };
    const { records: next } = applyAttempt(records, summary, LEVELS.length);
    records.progress = next.progress;
    records.stats = next.stats;
    const unlocked = rewards.afterAttempt(DAY, summary.longestChain).map((a) => a.id);
    expect(unlocked).toEqual(expect.arrayContaining(['first-escape', 'perfect-run', 'chain-reaction']));
    expect(records.stats.chainClears).toBe(1); // statistics unchanged by rewards
  });

  it('gives existing players their earned achievements on first start, paid once', () => {
    const { rewards, records } = setup();
    for (let id = 1; id <= 5; id++) records.progress = win(records.progress, id);
    const unlocked = rewards.sync(DAY).map((a) => a.id);
    expect(unlocked).toEqual(expect.arrayContaining(['first-escape', 'perfect-run', 'puzzle-explorer', 'flawless-five']));
    expect(rewards.sync(DAY)).toEqual([]);
  });
});

describe('rewards storage', () => {
  it('round-trips', () => {
    const { rewards, store } = setup();
    rewards.checkIn(DAY);
    rewards.claimDaily(DAY);
    expect(readRewards(store.data.get(REWARDS_KEY)!)).toEqual({ value: rewards.current, status: 'current' });
    expect(JSON.parse(serializeRewards(rewards.current)).version).toBe(REWARDS_VERSION);
  });

  it('recovers from corrupted data and keeps a backup', () => {
    const store = new MemoryStore();
    store.setItem(REWARDS_KEY, '{"version":1,"daily":');
    const { rewards } = setup(store);
    expect(rewards.current).toEqual(createRewards());
    expect(store.data.get(`${REWARDS_KEY}.backup`)).toBe('{"version":1,"daily":');
    for (const raw of ['[]', '{}', '{"version":"1"}', 'null']) expect(readRewards(raw).status).toBe('corrupt');
  });

  it('drops unknown achievements and bad fields but keeps the rest', () => {
    const raw = JSON.stringify({ version: 1, achievements: { 'first-escape': DAY, 'retired-badge': DAY, 'perfect-run': 5 }, bestChain: -1, wallet: { credits: 30, earned: 30, applied: [] } });
    const { value } = readRewards(raw);
    expect(value.achievements).toEqual({ 'first-escape': DAY });
    expect(value.bestChain).toBe(0);
    expect(value.wallet.credits).toBe(30);
    expect(value.wallet.applied).toContain('achievement:first-escape');
  });

  it('never overwrites a save from a newer version', () => {
    const store = new MemoryStore();
    const future = JSON.stringify({ version: REWARDS_VERSION + 1, wallet: { credits: 500 } });
    store.setItem(REWARDS_KEY, future);
    const { rewards } = setup(store);
    rewards.checkIn(DAY);
    rewards.claimDaily(DAY);
    expect(store.data.get(REWARDS_KEY)).toBe(future);
  });

  it('works without storage', () => {
    const rewards = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, null);
    rewards.checkIn(DAY);
    expect(rewards.claimDaily(DAY)).not.toBeNull();
  });

  it('adding rewards leaves every existing save untouched', () => {
    const store = new MemoryStore();
    new ProgressStorage(LEVELS.length, store).save(win(createProgress(), 1));
    new ProfileStorage(store).save(withNickname(createProfile(), 'Ada'));
    new StatsStorage(store).save(createStats(new Date(Date.UTC(2026, 0, 1))));
    new SettingsStore(store).update({ theme: 'light' });
    const before = new Map(store.data);

    const records = { progress: new ProgressStorage(LEVELS.length, store).load(), stats: new StatsStorage(store).load() };
    const rewards = new Rewards({ levels: LEVELS, records: () => records }, store);
    rewards.checkIn(DAY);
    rewards.claimDaily(DAY);

    for (const key of [PROGRESS_KEY, PROFILE_KEY, STATS_KEY, SETTINGS_KEY]) expect(store.data.get(key)).toBe(before.get(key));
    expect(rewards.current.achievements['first-escape']).toBe(DAY); // earned from the existing progress
  });
});
