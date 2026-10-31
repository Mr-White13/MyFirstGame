import { describe, expect, it } from 'vitest';
import { readLeague, serializeLeague, LEAGUE_KEY, LEAGUE_VERSION } from '../league/LeagueService';
import { readProfile, serializeProfile, PROFILE_KEY, PROFILE_VERSION } from '../profile/Profile';
import { readStats, serializeStats, STATS_KEY, STATS_VERSION } from '../profile/Stats';
import { BACKUP_KEY, readProgress, SAVE_VERSION, serializeProgress, STORAGE_KEY } from '../progress/ProgressStorage';
import { DAILY_LOG_KEY, DAILY_LOG_VERSION, readDailyLog, serializeDailyLog } from '../recap/DailyLog';
import { readRecap, RECAP_KEY, RECAP_VERSION } from '../recap/insights';
import { readRewards, REWARDS_KEY, REWARDS_VERSION, serializeRewards } from '../rewards/Rewards';
import { readSettings, serializeSettings, SETTINGS_KEY, SETTINGS_VERSION } from '../settings/Settings';
import { SPLASH_SESSION_KEY } from '../branding/StudioSplash';
import { golden, plain } from '../testing/golden';
import type { SaveStatus } from './SafeStore';

/**
 * Every saved-data reader, fed the same hostile inputs plus hand-written
 * records in each supported format. The golden file records today's status
 * and value for each, including the known gaps (B6: completions above the
 * level count are dropped while the status stays 'current'; Rewards accepts
 * any NNNN-NN-NN text as a day). Storage keys and versions are pinned too.
 */

const NOW = new Date('2026-10-31T09:30:00.000Z');
const TODAY = '2026-10-31';
const LEVEL_COUNT = 30;

type Read = (raw: string | null) => { value: unknown; status: SaveStatus };

interface Reader {
  readonly key: string;
  readonly version: number;
  readonly read: Read;
  /** Writes a value back, to check that what was read survives a save unchanged. */
  readonly write?: (value: never) => string;
  /** Hand-written saves in this reader's format(s). */
  readonly fixtures: Record<string, unknown>;
}

const READERS: Record<string, Reader> = {
  progress: {
    key: STORAGE_KEY,
    version: SAVE_VERSION,
    read: (raw) => {
      const { progress, status } = readProgress(raw, LEVEL_COUNT);
      return { value: progress, status };
    },
    write: serializeProgress,
    fixtures: {
      'v1 move counts only': { version: 1, highestUnlocked: 4, completed: { 1: { bestMoves: 5 }, 2: { bestMoves: 9 }, 3: { bestMoves: 7 } } },
      'v2 with revisions': { version: 2, highestUnlocked: 3, completed: { 1: { bestMoves: 5, revision: 1 }, 2: { bestMoves: 4, revision: 2 } } },
      'v3 with stars': { version: 3, highestUnlocked: 5, completed: { 1: { bestMoves: 5, revision: 1, bestStars: 3, bestMistakes: 0 }, 2: { bestMoves: 4, revision: 3, bestStars: 2, bestMistakes: 1 }, 4: { bestMoves: 9, revision: 5, bestStars: null, bestMistakes: 2 } } },
      'v4 current': { version: 4, highestUnlocked: 7, completed: { 1: { bestMoves: 5, revision: 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 4210 }, 6: { bestMoves: 20, revision: 5, bestStars: 1, bestMistakes: 2, bestTimeMs: 61000.5 } } },
      'v4 bad entries dropped or defaulted': {
        version: 4,
        highestUnlocked: 'many',
        completed: { 0: { bestMoves: 1 }, '-2': { bestMoves: 1 }, abc: { bestMoves: 1 }, 2: { bestMoves: 0 }, 3: null, 4: { bestMoves: 3.5 }, 5: { bestMoves: 3, revision: 0, bestStars: 4, bestMistakes: -1, bestTimeMs: -5 }, 6: { bestMoves: 3, bestStars: 2, bestMistakes: 1.5, bestTimeMs: 0 } },
      },
      'v4 completions above the level count (B6)': { version: 4, highestUnlocked: 40, completed: { 29: { bestMoves: 30, revision: 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 1000 }, 31: { bestMoves: 3, revision: 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 1000 }, 35: { bestMoves: 3 } } },
      'v4 unlocks behind completions': { version: 4, highestUnlocked: 1, completed: { 9: { bestMoves: 12, revision: 1, bestStars: 2, bestMistakes: 1, bestTimeMs: 9000 } } },
      'v4 completed not an object': { version: 4, highestUnlocked: 3, completed: 'all' },
    },
  },
  settings: {
    key: SETTINGS_KEY,
    version: SETTINGS_VERSION,
    read: (raw) => readSettings(raw),
    write: serializeSettings,
    fixtures: {
      'v1 every field': { version: 1, theme: 'colorful', motion: 'reduce', effects: 'low', muted: true, music: false, sfx: false, musicVolume: 0.2, sfxVolume: 1, haptics: false, showTimer: false, confirmRestart: false, showRecap: false },
      'v1 partial': { version: 1, theme: 'light' },
      'v1 invalid values': { version: 1, theme: 'neon', motion: 'fast', effects: 'max', muted: 'yes', musicVolume: 7, sfxVolume: -1, showTimer: 0 },
      'v1 odd volumes': { version: 1, musicVolume: 0.333, sfxVolume: 0.676 },
      'v1 system theme': { version: 1, theme: 'system', motion: 'full', effects: 'off' },
    },
  },
  profile: {
    key: PROFILE_KEY,
    version: PROFILE_VERSION,
    read: readProfile,
    write: serializeProfile,
    fixtures: {
      'v1 valid': { version: 1, nickname: 'Neo', avatar: 'bot', country: 'RO' },
      'v1 messy nickname': { version: 1, nickname: '  Ne\u0000o ​  the   One with a very long name ', avatar: 'unknown-avatar', country: 'XX' },
      'v1 empty nickname': { version: 1, nickname: '   ', country: null },
    },
  },
  stats: {
    key: STATS_KEY,
    version: STATS_VERSION,
    read: (raw) => readStats(raw, NOW),
    write: serializeStats,
    fixtures: {
      'v1 valid': { version: 1, successfulRuns: 12, failedRuns: 3, flawlessRuns: 7, playTimeMs: 123456.5, arrowsCleared: 400, chainClears: 21, trackedSince: '2026-09-01T10:00:00.000Z' },
      'v1 invalid counters': { version: 1, successfulRuns: -1, failedRuns: 2.5, flawlessRuns: '3', playTimeMs: -10, arrowsCleared: null, trackedSince: 'yesterday' },
    },
  },
  rewards: {
    key: REWARDS_KEY,
    version: REWARDS_VERSION,
    read: readRewards,
    write: serializeRewards,
    fixtures: {
      'v1 valid': {
        version: 1,
        daily: { lastCheckIn: '2026-10-30', streak: 3, longestStreak: 5, daysPlayed: 9, lastClaim: '2026-10-30', claims: 8, claimedDays: ['2026-10-29', '2026-10-30'], history: ['2026-10-28', '2026-10-29', '2026-10-30'] },
        wallet: { credits: 120, earned: 200, applied: ['daily:2026-10-30', 'achievement:first-escape'] },
        achievements: { 'first-escape': '2026-10-01' },
        bestChain: 4,
      },
      'v1 weak day check and unknown achievements': {
        version: 1,
        achievements: { 'first-escape': '2026-13-45', 'perfect-run': 'today', 'no-such-achievement': '2026-10-01' },
        wallet: { credits: 500, earned: 100, applied: ['x', '', 7, 'x'] },
        bestChain: -3,
      },
      'v1 broken daily': { version: 1, daily: { lastCheckIn: 'nope', streak: 4, claimedDays: ['2026-10-02', '2026-10-01', '2026-10-01', 'bad'], history: 'x' }, wallet: null },
    },
  },
  league: {
    key: LEAGUE_KEY,
    version: LEAGUE_VERSION,
    read: readLeague,
    write: serializeLeague,
    fixtures: {
      'v1 mid-competition': {
        version: 1,
        tier: 2,
        highestTier: 3,
        inactiveStreak: 0,
        lastDay: '2026-10-31',
        current: { date: '2026-10-31', startTier: 2, collected: ['2026-10-31:1:L4/b', '2026-10-31:1:L4/c'], completed: [1], sweepRewarded: false, pool: 5 },
        history: [{ date: '2026-10-30', days: 1, points: 9, challenges: 3, startTier: 1, endTier: 2, outcome: 'promoted' }],
        lifetime: { points: 30, promotions: 2, relegations: 0, challengesCompleted: 7 },
        milestones: ['reach:silver'],
        outbox: [{ id: 'league:reach:gold', amount: 50 }],
        notice: { fromTier: 1, toTier: 2, daysSettled: 1, promotions: 1, relegations: 0, lastPlayed: { date: '2026-10-30', points: 9, outcome: 'promoted' } },
      },
      'v1 before pools existed': { version: 1, tier: 0, current: { date: '2026-10-20', startTier: 0, collected: ['2026-10-20:2:L6/a', 'other:x'], completed: [3, 1, 1, 4] } },
      'v1 unknown pool and bad tiers': { version: 1, tier: 99, highestTier: -1, current: { date: '2026-10-20', startTier: 1, collected: [], completed: [], pool: 9 }, lastDay: '2026-10-25', outbox: [{ id: 'a', amount: 0 }, { id: 'b', amount: 5 }, 'c'], notice: { fromTier: 0 } },
    },
  },
  dailyLog: {
    key: DAILY_LOG_KEY,
    version: DAILY_LOG_VERSION,
    read: (raw) => readDailyLog(raw, TODAY),
    write: serializeDailyLog,
    fixtures: {
      'v1 valid': { version: 1, since: '2026-10-01', days: { '2026-10-30': { playMs: 60000.5, runs: 4, wins: 3, flawless: 1, arrows: 80 }, '2026-10-31': { playMs: 0, runs: 0, wins: 0, flawless: 0, arrows: 0 } } },
      'v1 bad days dropped': { version: 1, since: '2026-10-01', days: { 'not-a-day': { playMs: 1, runs: 1, wins: 1, flawless: 1, arrows: 1 }, '2026-10-29': { playMs: -1, runs: 1, wins: 1, flawless: 1, arrows: 1 }, '2026-10-28': null } },
      'v1 bad since': { version: 1, since: 'October', days: {} },
    },
  },
  recap: {
    key: RECAP_KEY,
    version: RECAP_VERSION,
    read: readRecap,
    fixtures: {
      'v1 valid': { version: 1, next: 3 },
      'v1 wraps around': { version: 1, next: 25 },
      'v1 invalid': { version: 1, next: -2 },
    },
  },
};

/** Inputs every reader must survive. `{v}` / `{v+1}` stand for its own version and the next one. */
const COMMON: Record<string, string | null> = {
  missing: null,
  'empty string': '',
  'not JSON': '{"version": 1,',
  'JSON null': 'null',
  'JSON array': '[1,2]',
  'JSON number': '42',
  'JSON string': '"hello"',
  'empty object': '{}',
  'version 0': '{"version":0}',
  'version as text': '{"version":"{v}"}',
  'fractional version': '{"version":1.5}',
  'negative version': '{"version":-1}',
  'own version, no fields': '{"version":{v}}',
  'next version (newer)': '{"version":{v+1}}',
  'far future version': '{"version":99}',
};

function readAll() {
  return Object.fromEntries(
    Object.entries(READERS).map(([name, reader]) => {
      const inputs: Record<string, string | null> = {};
      for (const [label, raw] of Object.entries(COMMON)) inputs[label] = raw?.replaceAll('{v+1}', String(reader.version + 1)).replaceAll('{v}', String(reader.version)) ?? null;
      for (const [label, data] of Object.entries(reader.fixtures)) inputs[label] = JSON.stringify(data);
      return [name, Object.fromEntries(Object.entries(inputs).map(([label, raw]) => [label, plain(reader.read(raw))]))];
    }),
  );
}

describe('saved-data readers', () => {
  const actual = readAll();
  const expected = golden(new URL('./readers.golden.json', import.meta.url), actual);

  it.each(Object.keys(READERS))('%s: recorded status and value for every input', (name) => {
    expect(actual[name]).toEqual(expected[name]);
  });

  it.each(Object.keys(READERS))('%s: hostile input never throws and never reports "current" for garbage', (name) => {
    for (const label of ['empty string', 'not JSON', 'JSON null', 'JSON array', 'JSON number', 'JSON string', 'empty object', 'version 0', 'negative version']) {
      expect(actual[name][label].status, label).toBe('corrupt');
    }
    expect(actual[name]['missing'].status).toBe('empty');
    expect(actual[name]['next version (newer)'].status).toBe('newer');
    expect(actual[name]['far future version'].status).toBe('newer');
  });

  it.each(Object.entries(READERS).filter(([, r]) => r.write).map(([name]) => name))('%s: a record read and saved again reads back identically', (name) => {
    const reader = READERS[name];
    for (const [label, data] of Object.entries(reader.fixtures)) {
      const first = reader.read(JSON.stringify(data));
      if (first.status !== 'current' && first.status !== 'migrated') continue;
      const again = reader.read(reader.write!(first.value as never));
      expect(plain(again), label).toEqual(plain({ value: first.value, status: 'current' }));
    }
  });
});

describe('storage keys and versions', () => {
  it('are unchanged (renaming a key or bumping a version without a migration loses player data)', () => {
    const actual = {
      keys: { progress: STORAGE_KEY, progressBackup: BACKUP_KEY, settings: SETTINGS_KEY, profile: PROFILE_KEY, stats: STATS_KEY, rewards: REWARDS_KEY, league: LEAGUE_KEY, dailyLog: DAILY_LOG_KEY, recap: RECAP_KEY, splash: SPLASH_SESSION_KEY },
      versions: Object.fromEntries(Object.entries(READERS).map(([name, r]) => [name, r.version])),
    };
    expect(actual).toEqual({
      keys: {
        progress: 'neon-escape.progress',
        progressBackup: 'neon-escape.progress.backup',
        settings: 'neon-escape.settings',
        profile: 'neon-escape.profile',
        stats: 'neon-escape.stats',
        rewards: 'neon-escape.rewards',
        league: 'neon-escape.league',
        dailyLog: 'neon-escape.daily-stats',
        recap: 'neon-escape.recap',
        splash: 'neon-escape.splash-shown',
      },
      versions: { progress: 4, settings: 1, profile: 1, stats: 1, rewards: 1, league: 1, dailyLog: 1, recap: 1 },
    });
  });
});
