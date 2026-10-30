import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState';
import { findSolution } from '../core/solver';
import type { GameSnapshot } from '../core/types';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { createStats } from '../profile/Stats';
import { createProgress } from '../progress/Progress';
import { applyAttempt, AttemptTracker, type Records } from './AttemptTracker';

const LEVEL_COUNT = LEVELS.length;

// a and b are blocked by c; c is free.
const fork = levelFromMap(1, [
  '.  .  .  .  .',
  'a  a> c  .  .',
  '.  .  c  .  .',
  'b  b> cv .  .',
  '.  .  .  .  .',
]);

function fakeClock() {
  let now = 0;
  return { clock: () => now, advance: (ms: number) => (now += ms) };
}

function freshRecords(): Records {
  return { progress: createProgress(), stats: createStats(new Date('2026-01-01T00:00:00Z')) };
}

/** Plays `taps` on a fresh state of the fork level and returns the final snapshot. */
function play(taps: string[]): GameSnapshot {
  const state = new GameState(fork);
  taps.forEach((id) => state.tryMove(id));
  return state.snapshot();
}

/** One timed attempt: begin, become interactive, play for `ms`, finish. */
function attempt(tracker: AttemptTracker, t: ReturnType<typeof fakeClock>, ms: number, outcome: 'won' | 'failed' | 'abandoned', snapshot: GameSnapshot) {
  tracker.begin(1, 1);
  tracker.interactive();
  t.advance(ms);
  return tracker.finish(outcome, snapshot)!;
}

describe('AttemptTracker', () => {
  it('times only the interactive part of an attempt and stops at the end', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    tracker.begin(1, 1);
    t.advance(500); // screen transition
    tracker.interactive();
    t.advance(2000);
    const summary = tracker.finish('won', play(['c', 'a', 'b']))!;
    expect(summary.timeMs).toBe(2000);
    t.advance(9999);
    expect(tracker.timer.elapsed()).toBe(2000);
    expect(tracker.isOpen).toBe(false);
  });

  it('ends an attempt exactly once', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    attempt(tracker, t, 1000, 'won', play(['c', 'a', 'b']));
    expect(tracker.finish('abandoned', play([]))).toBeNull(); // e.g. leaving after the dialog
  });

  it('is disposed when leaving: an abandoned attempt freezes the timer', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    tracker.begin(1, 1);
    tracker.interactive();
    t.advance(1200);
    const summary = tracker.finish('abandoned', play(['c']))!;
    t.advance(60_000);
    expect(summary.timeMs).toBe(1200);
    expect(tracker.timer.running).toBe(false);
  });

  it('checkpoints play time without counting it twice', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    tracker.begin(1, 1);
    tracker.interactive();
    t.advance(3000);
    expect(tracker.checkpoint()).toBe(3000); // app backgrounded
    expect(tracker.checkpoint()).toBe(0);
    t.advance(1000);
    const summary = tracker.finish('won', play(['c', 'a', 'b']))!;
    expect(summary.timeMs).toBe(4000);
    expect(summary.uncountedTimeMs).toBe(1000);
  });
});

describe('applyAttempt', () => {
  it('records stars, mistakes and time for a completed run', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    const summary = attempt(tracker, t, 42_000, 'won', play(['a', 'c', 'b']));
    const { records, completion } = applyAttempt(freshRecords(), summary, LEVEL_COUNT);
    expect(records.progress.completed[1]).toMatchObject({ bestStars: 2, bestMistakes: 1, bestTimeMs: 42_000 });
    expect(completion).toMatchObject({ newBestTime: true, newBestStars: true, previousBestTimeMs: null });
  });

  it('updates the best time only when improved', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    const flawless = play(['c', 'a', 'b']);
    let records = applyAttempt(freshRecords(), attempt(tracker, t, 40_000, 'won', flawless), LEVEL_COUNT).records;
    const slower = applyAttempt(records, attempt(tracker, t, 55_000, 'won', flawless), LEVEL_COUNT);
    expect(slower.records.progress.completed[1].bestTimeMs).toBe(40_000);
    expect(slower.completion?.newBestTime).toBe(false);
    records = slower.records;
    const faster = applyAttempt(records, attempt(tracker, t, 31_500, 'won', flawless), LEVEL_COUNT);
    expect(faster.records.progress.completed[1].bestTimeMs).toBe(31_500);
    expect(faster.completion).toMatchObject({ newBestTime: true, previousBestTimeMs: 40_000 });
  });

  it('never lets a failed or abandoned attempt touch a personal best', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    let records = applyAttempt(freshRecords(), attempt(tracker, t, 50_000, 'won', play(['c', 'a', 'b'])), LEVEL_COUNT).records;
    const before = records.progress;
    // A very quick failure and a quick restart (abandon): neither may set a "best".
    const state = new GameState(LEVELS[9]);
    let failed: GameSnapshot = state.snapshot();
    for (const a of LEVELS[9].arrows) {
      if (state.isFailed) break;
      state.tryMove(a.id);
      failed = state.snapshot();
    }
    expect(failed.status).toBe('failed');
    records = applyAttempt(records, attempt(tracker, t, 3000, 'failed', { ...failed, levelId: 1 }), LEVEL_COUNT).records;
    records = applyAttempt(records, attempt(tracker, t, 1000, 'abandoned', play(['c'])), LEVEL_COUNT).records;
    expect(records.progress).toBe(before);
    expect(records.progress.completed[1].bestTimeMs).toBe(50_000);
  });

  it('keeps best stars and best time independent', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    // 3 stars in 50 s, then 2 stars in 35 s.
    let records = applyAttempt(freshRecords(), attempt(tracker, t, 50_000, 'won', play(['c', 'a', 'b'])), LEVEL_COUNT).records;
    const second = applyAttempt(records, attempt(tracker, t, 35_000, 'won', play(['a', 'c', 'b'])), LEVEL_COUNT);
    records = second.records;
    expect(records.progress.completed[1]).toMatchObject({ bestStars: 3, bestTimeMs: 35_000 });
    expect(second.completion).toMatchObject({ newBestTime: true, newBestStars: false });
  });

  it('updates statistics for every outcome and aggregates replays', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    let records = freshRecords();
    records = applyAttempt(records, attempt(tracker, t, 10_000, 'won', play(['c', 'a', 'b'])), LEVEL_COUNT).records; // flawless
    records = applyAttempt(records, attempt(tracker, t, 12_000, 'won', play(['a', 'b', 'c'])), LEVEL_COUNT).records; // replay, chain of 2
    records = applyAttempt(records, attempt(tracker, t, 4000, 'abandoned', play(['c'])), LEVEL_COUNT).records;
    expect(records.stats).toMatchObject({
      successfulRuns: 2,
      failedRuns: 0,
      flawlessRuns: 1,
      playTimeMs: 26_000,
      arrowsCleared: 3 + 3 + 1,
      chainClears: 2,
    });
    // Unique levels completed stays 1, however many times it is replayed.
    expect(Object.keys(records.progress.completed)).toEqual(['1']);
  });

  it('counts failed attempts', () => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    const state = new GameState(LEVELS[9]);
    for (const a of LEVELS[9].arrows) if (!state.isFailed) state.tryMove(a.id);
    const records = applyAttempt(freshRecords(), attempt(tracker, t, 8000, 'failed', state.snapshot()), LEVEL_COUNT).records;
    expect(records.stats).toMatchObject({ failedRuns: 1, successfulRuns: 0, playTimeMs: 8000 });
    expect(records.progress).toEqual(createProgress());
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i plays to a recorded completion', (_id, level) => {
    const t = fakeClock();
    const tracker = new AttemptTracker(t.clock);
    const state = new GameState(level);
    tracker.begin(level.id, level.revision ?? 1);
    tracker.interactive();
    for (const id of findSolution(level)!) {
      state.tryMove(id);
      t.advance(400);
    }
    const summary = tracker.finish('won', state.snapshot())!;
    const { records } = applyAttempt(freshRecords(), summary, LEVEL_COUNT);
    expect(records.progress.completed[level.id]).toMatchObject({ bestStars: 3, bestTimeMs: level.arrows.length * 400 });
  });
});
