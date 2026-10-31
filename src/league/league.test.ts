import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GameState } from '../core/GameState';
import { validateLevel } from '../core/levelValidation';
import { findSolution } from '../core/solver';
import type { ArrowData, MoveResult } from '../core/types';
import { addDays, DayClock, dayKey } from '../daily/dayKey';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { createProfile, PROFILE_KEY, ProfileStorage } from '../profile/Profile';
import { createStats, STATS_KEY, StatsStorage } from '../profile/Stats';
import { createProgress, recordCompletion } from '../progress/Progress';
import { STORAGE_KEY as PROGRESS_KEY, ProgressStorage } from '../progress/ProgressStorage';
import { REWARDS_KEY, Rewards } from '../rewards/Rewards';
import type { KeyValueStore } from '../storage/SafeStore';
import { challengePool, CHALLENGES_PER_DAY, dailyChallenges, ENERGY_PER_CHALLENGE, MAX_DAILY_POINTS, type DailyChallenge } from './challenges';
import {
  applyInactivity,
  collect,
  collectedIn,
  completeChallenge,
  createLeague,
  evaluateDay,
  points,
  settle,
  type LeagueState,
} from './League';
import { BRONZE, LEAGUE_REWARDS, LEAGUES, TOP_TIER } from './leagues';
import { LEAGUE_KEY, LEAGUE_VERSION, LeagueService, readLeague } from './LeagueService';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.data.set(key, value);
  }
}

const DAY = '2026-10-31';
const TIER = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, elite: 5 };

/** A league already open on `day` in `tier`, with `n` points collected. */
function day(tier: number, n: number, date = DAY, extra: Partial<LeagueState> = {}): LeagueState {
  const base = settle({ ...createLeague(), tier, highestTier: tier, ...extra }, date, true).state;
  const collected = Array.from({ length: n }, (_, i) => `${date}:${1 + Math.floor(i / 4)}:L4/x${i}`);
  return { ...base, current: { ...base.current!, collected } };
}

/** Settles `state` on the next day and returns the new tier. */
const next = (state: LeagueState, date = addDays(DAY, 1)) => settle(state, date, true).state;

// ------------------------------------------------------------------ challenges

describe('daily challenges', () => {
  const challenges = dailyChallenges(DAY, LEVELS);

  it('has three challenges with exactly four distinct Energy Arrows each', () => {
    expect(challenges).toHaveLength(CHALLENGES_PER_DAY);
    for (const c of challenges) {
      expect(new Set(c.energyArrowIds).size).toBe(ENERGY_PER_CHALLENGE);
      expect(c.level.arrows.filter((a) => a.energy)).toHaveLength(ENERGY_PER_CHALLENGE);
      expect(c.level.arrows.filter((a) => a.energy).map((a) => a.id)).toEqual(c.energyArrowIds);
    }
    expect(MAX_DAILY_POINTS).toBe(12);
  });

  it('is deterministic: the same date gives the same challenges and Energy Arrows', () => {
    expect(dailyChallenges(DAY, LEVELS)).toEqual(challenges);
    expect(challenges.map((c) => c.id)).toEqual(challenges.map((c) => `${DAY}:${c.number}:L${c.sourceLevelId}`));
  });

  it('never uses the same layout twice in a day, and only levels with 10+ arrows', () => {
    expect(challengePool(LEVELS, 1).map((l) => l.id)).toEqual([4, 5, 6, 7, 8, 9, 10]); // the original pool
    const pool = challengePool(LEVELS).map((l) => l.id);
    expect(pool).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]); // current: up to 12×12
    for (let i = 0; i < 400; i++) {
      const set = dailyChallenges(addDays('2026-01-01', i), LEVELS);
      expect(new Set(set.map((c) => c.sourceLevelId)).size).toBe(3);
      for (const c of set) expect(pool).toContain(c.sourceLevelId);
    }
  });

  it('different dates usually give a different selection or placement', () => {
    const signatures = new Set(
      Array.from({ length: 60 }, (_, i) => JSON.stringify(dailyChallenges(addDays(DAY, i), LEVELS).map((c) => [c.sourceLevelId, c.energyArrowIds]))),
    );
    expect(signatures.size).toBeGreaterThan(55);
  });

  it('never changes the curated levels', () => {
    const before = JSON.stringify(LEVELS);
    dailyChallenges(DAY, LEVELS);
    expect(JSON.stringify(LEVELS)).toBe(before);
    expect(LEVELS.every((l) => l.arrows.every((a) => !a.energy))).toBe(true);
  });

  it('Energy Arrows keep collision, blocking, chains and solvability identical', () => {
    const strip = (r: MoveResult) => JSON.parse(JSON.stringify(r));
    for (let i = 0; i < 20; i++) {
      for (const c of dailyChallenges(addDays(DAY, i), LEVELS)) {
        const source = LEVELS[c.sourceLevelId - 1];
        expect(() => validateLevel(c.level)).not.toThrow();
        expect(findSolution(c.level)).toEqual(findSolution(source));
        // The same taps (including mistakes and chains) give exactly the same results.
        const a = new GameState(source);
        const b = new GameState(c.level);
        const taps = [...source.arrows].reverse().map((x) => x.id);
        for (const id of [...taps, ...taps]) expect(strip(b.tryMove(id))).toEqual(strip(a.tryMove(id)));
        expect(b.snapshot()).toEqual(a.snapshot());
      }
    }
  });

  it('every Energy Arrow is collectible: solving the level removes all four', () => {
    for (const c of dailyChallenges(DAY, LEVELS)) {
      const state = new GameState(c.level);
      const removed: string[] = [];
      state.onRemove((arrow) => arrow.energy && removed.push(arrow.id));
      for (const id of findSolution(c.level)!) state.tryMove(id);
      expect(state.isWon).toBe(true);
      expect(removed.sort()).toEqual([...c.energyArrowIds].sort());
    }
  });
});

// ------------------------------------------------------------------ collection

/** a and b are both blocked only by c (from the GameState tests); here a and b are Energy Arrows. */
const fork = levelFromMap(2, ['.  .  .  .  .', 'a  a> c  .  .', '.  .  c  .  .', 'b  b> cv .  .', '.  .  .  .  .']);
const forkChallenge: DailyChallenge = {
  id: `${DAY}:1:L2`,
  date: DAY,
  number: 1,
  sourceLevelId: 2,
  energyArrowIds: ['a', 'b', 'c'],
  level: { ...fork, arrows: fork.arrows.map((a): ArrowData => ({ ...a, energy: true })) },
};

describe('Energy Point collection', () => {
  function play(challenge: DailyChallenge, league: LeagueState) {
    let state = league;
    const statuses: string[] = [];
    const game = new GameState(challenge.level);
    game.onRemove((arrow, auto) => {
      const r = collect(state, DAY, challenge, arrow.id);
      state = r.state;
      statuses.push(`${arrow.id}:${auto ? 'chain' : 'tap'}:${r.status}`);
    });
    return { game, statuses, get state() { return state; } };
  }

  it('awards a point for a directly cleared Energy Arrow, at the moment the rules remove it', () => {
    const run = play(forkChallenge, day(0, 0));
    run.game.tryMove('c');
    expect(run.statuses).toEqual(['c:tap:awarded']);
    expect(points(run.state.current)).toBe(1);
  });

  it('awards points for Energy Arrows released by a chain reaction', () => {
    const run = play(forkChallenge, day(0, 0));
    run.game.tryMove('a'); // blocked: red
    run.game.tryMove('b'); // blocked: red
    run.game.tryMove('c'); // frees both: chain
    expect(run.statuses).toEqual(['c:tap:awarded', 'a:chain:awarded', 'b:chain:awarded']);
    expect(points(run.state.current)).toBe(3);
  });

  it('normal arrows award nothing', () => {
    const c = dailyChallenges(DAY, LEVELS)[0];
    const normal = c.level.arrows.find((a) => !a.energy)!;
    expect(collect(day(0, 0), DAY, c, normal.id).status).toBe('not-energy');
  });

  it('each Energy Arrow pays once per challenge per day: replays, restarts and failures change nothing', () => {
    let league = day(0, 0);
    const first = play(forkChallenge, league);
    first.game.tryMove('c');
    league = first.state;
    // Restart (a fresh attempt) and replay: the same arrow is a duplicate.
    const replay = play(forkChallenge, league);
    replay.game.tryMove('c');
    expect(replay.statuses).toEqual(['c:tap:duplicate']);
    expect(points(replay.state.current)).toBe(1);
    // A failed attempt keeps the points already collected.
    const failing = new GameState(dailyChallenges(DAY, LEVELS)[0].level);
    for (const a of failing.getArrows()) failing.tryMove(a.id);
    expect(points(replay.state.current)).toBe(1);
    expect(collectedIn(replay.state, forkChallenge)).toBe(1);
  });

  it('the daily score can never exceed 12', () => {
    const big: DailyChallenge = { ...forkChallenge, energyArrowIds: Array.from({ length: 20 }, (_, i) => `e${i}`) };
    let state = day(0, 0);
    const results = big.energyArrowIds.map((id) => {
      const r = collect(state, DAY, big, id);
      state = r.state;
      return r.status;
    });
    expect(results.filter((r) => r === 'awarded')).toHaveLength(12);
    expect(results.slice(12).every((r) => r === 'full')).toBe(true);
    expect(points(state.current)).toBe(12);
  });

  it('only counts on the challenge\'s own day', () => {
    const tomorrow = settle(day(0, 0), addDays(DAY, 1), true).state;
    expect(collect(tomorrow, addDays(DAY, 1), forkChallenge, 'c').status).toBe('wrong-day');
    expect(collect(createLeague(), DAY, forkChallenge, 'c').status).toBe('wrong-day'); // locked: no competition
  });

  it('records completed challenges once and queues the all-three bonus once', () => {
    const [c1, c2, c3] = dailyChallenges(DAY, LEVELS);
    let s = day(0, 0);
    for (const c of [c1, c1, c2, c3, c3]) s = completeChallenge(s, DAY, c).state;
    expect(s.current!.completed).toEqual([1, 2, 3]);
    expect(s.lifetime.challengesCompleted).toBe(3);
    expect(s.outbox).toEqual([{ id: `daily:league-sweep:${DAY}`, amount: LEAGUE_REWARDS.dailySweep }]);
  });
});

// ------------------------------------------------------------------ league rules

describe('promotion and relegation', () => {
  it('uses the configured thresholds', () => {
    expect(LEAGUES.map((l) => [l.name, l.promoteAt, l.relegateBelow])).toEqual([
      ['Bronze', 5, null],
      ['Silver', 7, 2],
      ['Gold', 9, 3],
      ['Platinum', 10, 4],
      ['Diamond', 11, 5],
      ['Neon Elite', null, 6],
    ]);
  });

  it('Bronze: promotes at 5, never relegates', () => {
    expect(evaluateDay(TIER.bronze, 5)).toEqual({ tier: TIER.silver, outcome: 'promoted' });
    expect(evaluateDay(TIER.bronze, 4)).toEqual({ tier: TIER.bronze, outcome: 'retained' });
    expect(evaluateDay(TIER.bronze, 1)).toEqual({ tier: TIER.bronze, outcome: 'retained' });
  });

  it('Silver: promotes at 7, keeps 2–6, relegates below 2', () => {
    expect(evaluateDay(TIER.silver, 7).outcome).toBe('promoted');
    expect(evaluateDay(TIER.silver, 6).outcome).toBe('retained');
    expect(evaluateDay(TIER.silver, 2).outcome).toBe('retained');
    expect(evaluateDay(TIER.silver, 1)).toEqual({ tier: TIER.bronze, outcome: 'relegated' });
  });

  it('Diamond promotes at 11; Neon Elite is the top', () => {
    expect(evaluateDay(TIER.diamond, 11)).toEqual({ tier: TIER.elite, outcome: 'promoted' });
    expect(evaluateDay(TIER.diamond, 10).outcome).toBe('retained');
    expect(evaluateDay(TIER.elite, 12)).toEqual({ tier: TIER.elite, outcome: 'retained' });
    expect(evaluateDay(TIER.elite, 5)).toEqual({ tier: TIER.diamond, outcome: 'relegated' });
  });

  it('moves at most one league per day, whatever the score', () => {
    for (let tier = BRONZE; tier <= TOP_TIER; tier++) {
      for (let score = 1; score <= 12; score++) expect(Math.abs(evaluateDay(tier, score).tier - tier)).toBeLessThanOrEqual(1);
    }
    expect(next(day(TIER.bronze, 12)).tier).toBe(TIER.silver);
  });

  it('settles a played day into history with points, leagues and outcome', () => {
    const s = next(day(TIER.gold, 9));
    expect(s.tier).toBe(TIER.platinum);
    expect(s.history.at(-1)).toMatchObject({ date: DAY, points: 9, startTier: TIER.gold, endTier: TIER.platinum, outcome: 'promoted', days: 1 });
    expect(s.current).toMatchObject({ date: addDays(DAY, 1), startTier: TIER.platinum, collected: [] }); // no carry-over
    expect(s.lifetime.promotions).toBe(1);
    expect(s.highestTier).toBe(TIER.platinum);
  });
});

describe('inactivity', () => {
  it('forgives one inactive day, then relegates one league per further day', () => {
    expect(applyInactivity(TIER.gold, 0, 1)).toEqual({ tier: TIER.gold, streak: 1, relegations: 0 });
    expect(applyInactivity(TIER.gold, 0, 2)).toEqual({ tier: TIER.silver, streak: 2, relegations: 1 });
    expect(applyInactivity(TIER.gold, 0, 3)).toEqual({ tier: TIER.bronze, streak: 3, relegations: 2 });
    expect(applyInactivity(TIER.gold, 0, 50)).toMatchObject({ tier: TIER.bronze, streak: 50, relegations: 2 }); // never below Bronze
    expect(applyInactivity(TIER.gold, 1, 1)).toEqual({ tier: TIER.silver, streak: 2, relegations: 1 }); // protection already used
  });

  it('an opened day without points counts as inactive, and so do days the game was not opened', () => {
    const opened = next(day(TIER.gold, 0));
    expect(opened.tier).toBe(TIER.gold); // protected
    expect(opened.history.at(-1)).toMatchObject({ outcome: 'inactive', days: 1 });
    expect(next(opened, addDays(DAY, 2)).tier).toBe(TIER.silver);
  });

  it('settles several missed days at once when the player returns', () => {
    const s = settle(day(TIER.platinum, 10), addDays(DAY, 4), true).state; // played the 31st (promoted), missed 1–3 Nov
    expect(s.tier).toBe(TIER.gold); // Platinum → Diamond, then 3 missed: 1 protected, 2 relegations → Gold
    expect(s.history.map((h) => [h.outcome, h.days])).toEqual([
      ['promoted', 1],
      ['inactive', 3],
    ]);
    expect(s.notice).toMatchObject({ fromTier: TIER.platinum, toTier: TIER.gold, promotions: 1, relegations: 2, daysSettled: 4 });
    expect(s.current!.date).toBe(addDays(DAY, 4));
  });

  it('participating resets the protection', () => {
    let s = next(day(TIER.gold, 0)); // inactive, protected
    s = { ...s, current: { ...s.current!, collected: [`${addDays(DAY, 1)}:1:L4/a`, `${addDays(DAY, 1)}:1:L4/b`, `${addDays(DAY, 1)}:1:L4/c`] } };
    s = next(s, addDays(DAY, 2)); // played (3 points: kept Gold)
    expect(s.inactiveStreak).toBe(0);
    expect(next(s, addDays(DAY, 3)).tier).toBe(TIER.gold); // protected again
  });
});

describe('settlement over time', () => {
  it('is idempotent: settling again on the same day changes nothing', () => {
    const once = next(day(TIER.silver, 7));
    const twice = settle(once, addDays(DAY, 1), true);
    expect(twice.status).toBe('unchanged');
    expect(twice.state).toBe(once);
  });

  it('handles month, year and daylight-saving boundaries as single days', () => {
    expect(settle(day(TIER.bronze, 5, '2026-12-31'), '2027-01-01', true).state.tier).toBe(TIER.silver);
    expect(settle(day(TIER.bronze, 5, '2026-02-28'), '2026-03-01', true).state.history.at(-1)?.outcome).toBe('promoted');
    // Europe/Bucharest: 29 Mar (23 h) and 25 Oct (25 h) 2026 are ordinary single days.
    expect(settle(day(TIER.bronze, 5, '2026-03-29'), '2026-03-30', true).state.history).toHaveLength(1);
    expect(settle(day(TIER.bronze, 5, '2026-10-25'), '2026-10-26', true).state.history).toHaveLength(1);
  });

  it('ignores a clock moved backwards, and treats a forward jump as missed days', () => {
    const s = day(TIER.gold, 9);
    expect(settle(s, addDays(DAY, -1), true)).toEqual({ state: s, status: 'clock-back' });
    expect(collect(s, addDays(DAY, -1), forkChallenge, 'c').status).toBe('wrong-day');
    const jumped = settle(s, addDays(DAY, 10), true).state;
    expect(jumped.history.map((h) => h.outcome)).toEqual(['promoted', 'inactive']);
    expect(jumped.tier).toBe(TIER.bronze);
  });

  it('does nothing while locked', () => {
    expect(settle(createLeague(), DAY, false)).toEqual({ state: createLeague(), status: 'locked' });
  });

  it('detects local midnight while the game is open and settles exactly once', () => {
    vi.useFakeTimers();
    let now = new Date(2026, 9, 31, 23, 59, 30);
    const clock = new DayClock(() => now, null);
    const store = new MemoryStore();
    const league = new LeagueService(LEVELS, () => true, store);
    league.settle(clock.today, true);
    const c = league.challenges(clock.today)[0];
    for (const id of c.energyArrowIds) league.collect(clock.today, c, id);
    clock.onChange((today) => league.settle(today, true));
    clock.start();
    now = new Date(2026, 10, 1, 0, 0, 5);
    vi.advanceTimersByTime(40_000);
    expect(dayKey(now)).toBe('2026-11-01');
    expect(league.current.history).toHaveLength(1);
    expect(league.current.history[0]).toMatchObject({ date: DAY, points: 4, outcome: 'retained' });
    expect(league.current.current).toMatchObject({ date: '2026-11-01', collected: [] });
    clock.refresh();
    league.settle(clock.today, true);
    expect(league.current.history).toHaveLength(1);
    clock.stop();
    vi.useRealTimers();
  });
});

// ------------------------------------------------------------------ storage and rewards

describe('league storage', () => {
  it('saves every collection at once and keeps history across reloads', () => {
    const store = new MemoryStore();
    const league = new LeagueService(LEVELS, () => true, store);
    league.settle(DAY, true);
    const c = league.challenges(DAY)[1];
    store.writes = [];
    league.collect(DAY, c, c.energyArrowIds[0]);
    expect(store.writes).toEqual([LEAGUE_KEY]);
    for (const id of c.energyArrowIds.slice(1)) league.collect(DAY, c, id);
    league.complete(DAY, c);
    league.settle(addDays(DAY, 1), true);
    const reloaded = new LeagueService(LEVELS, () => true, store);
    expect(reloaded.current.history).toEqual(league.current.history);
    expect(reloaded.current.lifetime).toMatchObject({ points: 4, challengesCompleted: 1 });
    expect(reloaded.settle(addDays(DAY, 1), true)).toBe('unchanged');
  });

  it('recovers from corrupted data and keeps a backup', () => {
    const store = new MemoryStore();
    store.setItem(LEAGUE_KEY, '{"version":1,"tier":');
    const league = new LeagueService(LEVELS, () => true, store);
    expect(league.current).toEqual(createLeague());
    expect(store.data.get(`${LEAGUE_KEY}.backup`)).toBe('{"version":1,"tier":');
    const bad = readLeague(JSON.stringify({ version: 1, tier: 99, highestTier: -1, current: { date: 'x' }, history: [{ date: DAY }], outbox: [{ id: 'x', amount: -5 }] })).value;
    expect(bad).toMatchObject({ tier: 0, highestTier: 0, current: null, history: [], outbox: [] });
    const capped = readLeague(JSON.stringify({ version: 1, current: { date: DAY, startTier: 0, collected: Array.from({ length: 30 }, (_, i) => `${DAY}:1:L4/x${i}`) } })).value;
    expect(capped.current!.collected).toHaveLength(12);
  });

  it('never overwrites a save from a newer version', () => {
    const store = new MemoryStore();
    const future = JSON.stringify({ version: LEAGUE_VERSION + 1, tier: 5 });
    store.setItem(LEAGUE_KEY, future);
    const league = new LeagueService(LEVELS, () => true, store);
    league.settle(DAY, true);
    expect(store.data.get(LEAGUE_KEY)).toBe(future);
  });

  it('works without storage', () => {
    const league = new LeagueService(LEVELS, () => true, null);
    expect(league.settle(DAY, true)).toBe('started');
  });

  it('never touches progress, best times, profile, statistics or rewards records', () => {
    const store = new MemoryStore();
    new ProgressStorage(LEVELS.length, store).save(recordCompletion(createProgress(), 10, { moves: 5, stars: 2, mistakes: 1, timeMs: 42_000 }, LEVELS.length).progress);
    new ProfileStorage(store).save(createProfile());
    new StatsStorage(store).save(createStats(new Date(Date.UTC(2026, 0, 1))));
    const before = new Map(store.data);
    store.writes = [];
    const league = new LeagueService(LEVELS, () => true, store);
    league.settle(DAY, true);
    for (const c of league.challenges(DAY)) {
      for (const id of c.energyArrowIds) league.collect(DAY, c, id);
      league.complete(DAY, c);
    }
    league.settle(addDays(DAY, 1), true);
    for (const key of [PROGRESS_KEY, PROFILE_KEY, STATS_KEY]) expect(store.data.get(key)).toBe(before.get(key));
    expect(new Set(store.writes)).toEqual(new Set([LEAGUE_KEY]));
  });
});

describe('league milestone credits', () => {
  function setup(store = new MemoryStore()) {
    const records = { progress: createProgress(), stats: createStats(new Date(Date.UTC(2026, 0, 1))) };
    const rewards = new Rewards({ levels: LEVELS, records: () => records }, store);
    let failing = false;
    const league = new LeagueService(LEVELS, (tx) => !failing && rewards.grant(DAY, tx), store);
    return { rewards, league, store, fail: (on: boolean) => (failing = on) };
  }

  /** Plays `n` points today and settles tomorrow. */
  function playDay(league: LeagueService, date: string, n: number) {
    league.settle(date, true);
    const ids = league.challenges(date).flatMap((c) => c.energyArrowIds.map((id) => [c, id] as const));
    for (const [c, id] of ids.slice(0, n)) league.collect(date, c, id);
  }

  it('pays first promotion and each new highest league once, never for bouncing between leagues', () => {
    const { rewards, league } = setup();
    let date = DAY;
    for (const score of [5, 1, 5, 1, 5]) {
      // Bronze → Silver, Silver → Bronze, Bronze → Silver …
      playDay(league, date, score);
      date = addDays(date, 1);
    }
    league.settle(date, true);
    expect(league.current.lifetime.promotions).toBe(3);
    expect(rewards.credits).toBe(LEAGUE_REWARDS.firstPromotion + LEAGUE_REWARDS.newHighest.silver!);
  });

  it('pays the all-three bonus once per date', () => {
    const { rewards, league } = setup();
    league.settle(DAY, true);
    for (const c of league.challenges(DAY)) for (let i = 0; i < 2; i++) league.complete(DAY, c);
    expect(rewards.credits).toBe(LEAGUE_REWARDS.dailySweep);
  });

  it('survives an interrupted hand-over: owed credits are retried, never doubled', () => {
    const store = new MemoryStore();
    const first = setup(store);
    first.fail(true); // the wallet write "crashes"
    playDay(first.league, DAY, 5);
    first.league.settle(addDays(DAY, 1), true);
    expect(first.league.current.outbox).toHaveLength(2); // kept for later
    expect(first.rewards.credits).toBe(0);

    const second = setup(store); // the app restarts
    second.league.settle(addDays(DAY, 1), true); // same day: settlement is a no-op, but the outbox is delivered
    second.league.flush();
    expect(second.league.current.outbox).toHaveLength(0);
    const paid = LEAGUE_REWARDS.firstPromotion + LEAGUE_REWARDS.newHighest.silver!;
    expect(second.rewards.credits).toBe(paid);

    // Even if the league record were rolled back and delivered again, the wallet refuses duplicates.
    const third = setup(store);
    expect(third.rewards.grant(DAY, { id: 'league:first-promotion', amount: LEAGUE_REWARDS.firstPromotion })).toBe(true);
    expect(third.rewards.credits).toBe(paid);
    expect(store.data.has(REWARDS_KEY)).toBe(true);
  });
});

// DST checks use a zone with daylight saving.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Bucharest';
});
afterAll(() => {
  process.env.TZ = originalTz;
});
afterEach(() => vi.useRealTimers());
