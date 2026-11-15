import type { LevelData } from '../core/types';
import type { DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import type { PlayerStats } from '../profile/Stats';
import { formatNumber, t, type MessageKey } from '../i18n/translate';
import { completedCount, MAX_STARS, perfectLevels, totalStars, type Progress } from '../progress/Progress';

export type AchievementCategory = 'gameplay' | 'performance' | 'daily';
const CATEGORY_ORDER: Record<AchievementCategory, number> = { gameplay: 0, performance: 1, daily: 2 };

/** Everything achievements are measured from. All of it already exists in the saves. */
export interface AchievementContext {
  readonly levels: readonly LevelData[];
  readonly progress: Progress;
  readonly stats: PlayerStats;
  readonly daily: DailyState;
  /** Most red arrows released by one chain reaction, ever. */
  readonly bestChain: number;
}

export interface AchievementDefinition {
  readonly id: string;
  /** Name in the current language (looked up on each read). */
  readonly title: string;
  /** Description in the current language (looked up on each read). */
  readonly description: string;
  readonly category: AchievementCategory;
  /** Symbol id in index.html (`#icon-…`). */
  readonly icon: string;
  /** Energy Credits for unlocking. */
  readonly reward: number;
  /** Progress needed to unlock. */
  readonly target: number;
  /** Current progress (clamped to the target for display). */
  progress(context: AchievementContext): number;
}

/** Levels with at least this many arrows count for Speed Runner (levels 4–10 today). */
export const SPEED_RUN_MIN_ARROWS = 10;
export const SPEED_RUN_MS = 30_000;
/** Speed Demon: the same levels, in under this. */
export const SPEED_DEMON_MS = 20_000;

/** Levels with 10+ arrows finished faster than `ms` (best time). */
const fastLevels = (c: AchievementContext, ms: number) =>
  c.levels.filter((l) => {
    const best = c.progress.completed[l.id]?.bestTimeMs;
    return l.arrows.length >= SPEED_RUN_MIN_ARROWS && typeof best === 'number' && best < ms;
  }).length;

type Tier = readonly [target: number, reward: number];
type Measure = (c: AchievementContext) => number;

/** An achievement's name, by id (`rewards.ach-<id>`), in the current language. */
const achievementTitle = (id: string): string => t(`rewards.ach-${id}` as MessageKey);

/**
 * A definition whose title and description are looked up when read (getters),
 * so they follow the language without calling t() while modules load.
 */
function define(base: Omit<AchievementDefinition, 'title' | 'description'>, describe: () => string): AchievementDefinition {
  return {
    ...base,
    get title() {
      return achievementTitle(base.id);
    },
    get description() {
      return describe();
    },
  };
}

/**
 * A ladder of achievements on one measure. Rewards grow with the effort:
 * the easy first rungs pay a few credits, the long-haul ones the most.
 * Names are `rewards.ach-<key>-<target>`.
 */
function ladder(
  key: string,
  category: AchievementCategory,
  icon: string,
  describe: (target: number) => string,
  measure: Measure,
  tiers: readonly Tier[],
): AchievementDefinition[] {
  return tiers.map(([target, reward]) => define({ id: `${key}-${target}`, category, icon, reward, target, progress: measure }, () => describe(target)));
}

const completed: Measure = (c) => completedCount(c.progress, c.levels.length);
const perfect: Measure = (c) => perfectLevels(c.progress, c.levels.length);
const MINUTE = 60_000;
const describeLevels = (count: number) => t('rewards.descLevels', { count });
const describePerfect = (count: number) => t('rewards.descPerfect', { count, stars: MAX_STARS });
const describeStreak = (count: number) => t('rewards.descStreak', { count });
const describeDays = (count: number) => t('rewards.descDays', { count });
const describeSpeed = (ms: number) => t('rewards.descSpeed', { arrows: SPEED_RUN_MIN_ARROWS, seconds: ms / 1000 });
const describePlayTime = (minutes: number) =>
  minutes < 60 ? t('rewards.descPlayMinutes', { count: minutes }) : t('rewards.descPlayHours', { count: minutes / 60 });

/** Added in the second wave: more goals along the way, cheapest first. Ids never change once shipped. */
const MORE_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...ladder('levels', 'gameplay', 'icon-grid', describeLevels, completed, [
    [3, 5], // Warming Up
    [15, 40], // Getting Serious
    [20, 50], // Maze Walker
    [25, 60], // Quarter Century
    [30, 70], // Pathfinder
    [40, 85], // Grid Master
    [50, 100], // Half a Hundred
    [60, 120], // Neon Navigator
    [70, 140], // Escape Artist
    [80, 160], // Legend of the Grid
  ]),
  ...ladder('perfect', 'performance', 'icon-spark', describePerfect, perfect, [
    [3, 10], // Sharp Eye
    [10, 60], // Precision
    [20, 90], // Perfectionist
    [30, 120], // Flawless Mind
    [50, 160], // Untouchable
  ]),
  ...ladder('stars', 'performance', 'icon-star', (count) => t('rewards.descStars', { count }), (c) => totalStars(c.progress, c.levels.length), [
    [10, 10], // Stargazer
    [25, 25], // Constellation
    [50, 45], // Star Collector
    [100, 80], // Galaxy
    [150, 120], // Supernova
    [200, 160], // Universe
  ]),
  ...ladder('wins', 'gameplay', 'icon-trophy', (count) => t('rewards.descWins', { count }), (c) => c.stats.successfulRuns, [
    [25, 25], // Regular
    [50, 45], // Persistent
    [100, 80], // Centurion
    [250, 150], // Unstoppable
  ]),
  ...ladder('flawless', 'performance', 'icon-heart', (count) => t('rewards.descFlawless', { count }), (c) => c.stats.flawlessRuns, [
    [1, 5], // Clean Slate
    [10, 30], // Steady Hand
    [25, 60], // Calm and Precise
    [50, 100], // Zen Master
  ]),
  ...ladder('arrows', 'gameplay', 'icon-next', (n) => t('rewards.descArrows', { count: formatNumber(n) }), (c) => c.stats.arrowsCleared, [
    [100, 5], // Arrow Apprentice
    [500, 20], // Arrow Adept
    [1000, 40], // Arrow Expert
    [2500, 70], // Arrow Master
    [5000, 110], // Arrow Storm
    [10000, 160], // Arrow Legend
  ]),
  ...ladder('chains', 'gameplay', 'icon-bolt', (count) => t('rewards.descChains', { count }), (c) => c.stats.chainClears, [
    [10, 15], // Spark Plug
    [50, 50], // Live Wire
    [100, 90], // Power Grid
  ]),
  ...ladder('playtime', 'daily', 'icon-clock', describePlayTime, (c) => Math.floor(c.stats.playTimeMs / MINUTE), [
    [10, 5], // Getting Started
    [30, 15], // Hooked
    [60, 30], // Night Owl
    [180, 70], // Marathon
    [600, 150], // Devoted
  ]),
  ...ladder('claims', 'daily', 'icon-calendar', (count) => t('rewards.descClaims', { count }), (c) => c.daily.claims, [
    [5, 15], // Collector
    [15, 40], // Loyal
    [30, 80], // Faithful
  ]),
  ...ladder('streak', 'daily', 'icon-flame', describeStreak, (c) => c.daily.longestStreak, [
    [14, 90], // Two-Week Streak
    [30, 160], // Monthly Streak
  ]),
  ...ladder('days', 'daily', 'icon-target', describeDays, (c) => c.daily.daysPlayed, [
    [7, 20], // Regular Visitor
    [30, 100], // Neon Resident
    [60, 160], // Lifer
  ]),
  ...ladder(
    'fast',
    'performance',
    'icon-clock',
    (count) => t('rewards.descFast', { count, arrows: SPEED_RUN_MIN_ARROWS, seconds: SPEED_RUN_MS / 1000 }),
    (c) => fastLevels(c, SPEED_RUN_MS),
    [[5, 60]], // Quick Fingers
  ),
  define(
    { id: 'speed-demon', category: 'performance', icon: 'icon-clock', reward: 50, target: 1, progress: (c) => (fastLevels(c, SPEED_DEMON_MS) > 0 ? 1 : 0) },
    () => describeSpeed(SPEED_DEMON_MS),
  ),
];

/**
 * The achievements. Adjusted to the real rules:
 * - A chain reaction can release at most **two** arrows: only two red arrows
 *   can exist while a life is left (the third mistake ends the level). So the
 *   suggested "3 / 5 arrows in one chain" are impossible and became
 *   "release a red arrow automatically" and "release two in one chain"
 *   (reachable from level 2 on; a test proves it).
 * - Speed Runner only counts levels with 10+ arrows, so the 5-arrow tutorial
 *   doesn't make it trivial.
 */
const FIRST_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  define({ id: 'first-escape', category: 'gameplay', icon: 'icon-check', reward: 15, target: 1, progress: (c) => completedCount(c.progress, c.levels.length) }, () =>
    t('rewards.descFirstEscape'),
  ),
  define({ id: 'perfect-run', category: 'gameplay', icon: 'icon-spark', reward: 20, target: 1, progress: (c) => perfectLevels(c.progress, c.levels.length) }, () =>
    t('rewards.descPerfectRun'),
  ),
  define({ id: 'chain-reaction', category: 'gameplay', icon: 'icon-bolt', reward: 20, target: 1, progress: (c) => Math.max(c.stats.chainClears, c.bestChain) }, () =>
    t('rewards.descChainReaction'),
  ),
  define({ id: 'double-chain', category: 'gameplay', icon: 'icon-bolt', reward: 40, target: 2, progress: (c) => c.bestChain }, () => t('rewards.descDoubleChain')),
  define({ id: 'puzzle-explorer', category: 'gameplay', icon: 'icon-grid', reward: 30, target: 5, progress: (c) => completedCount(c.progress, c.levels.length) }, () =>
    describeLevels(5),
  ),
  define({ id: 'puzzle-veteran', category: 'gameplay', icon: 'icon-trophy', reward: 60, target: 10, progress: (c) => completedCount(c.progress, c.levels.length) }, () =>
    describeLevels(10),
  ),
  define({ id: 'speed-runner', category: 'performance', icon: 'icon-clock', reward: 40, target: 1, progress: (c) => (fastLevels(c, SPEED_RUN_MS) > 0 ? 1 : 0) }, () =>
    describeSpeed(SPEED_RUN_MS),
  ),
  define({ id: 'flawless-five', category: 'performance', icon: 'icon-star', reward: 50, target: 5, progress: (c) => perfectLevels(c.progress, c.levels.length) }, () =>
    describePerfect(5),
  ),
  define({ id: 'first-check-in', category: 'daily', icon: 'icon-calendar', reward: 10, target: 1, progress: (c) => c.daily.claims }, () => t('rewards.descFirstCheckIn')),
  define({ id: 'three-day-streak', category: 'daily', icon: 'icon-flame', reward: 20, target: 3, progress: (c) => c.daily.longestStreak }, () => describeStreak(3)),
  define({ id: 'weekly-explorer', category: 'daily', icon: 'icon-flame', reward: 50, target: 7, progress: (c) => c.daily.longestStreak }, () => describeStreak(7)),
  define({ id: 'dedicated-player', category: 'daily', icon: 'icon-target', reward: 60, target: 14, progress: (c) => c.daily.daysPlayed }, () => describeDays(14)),
];

/** Every achievement, grouped by category and cheapest (easiest) first within each. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [...FIRST_ACHIEVEMENTS, ...MORE_ACHIEVEMENTS].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.reward - b.reward);

export const achievementTransactionId = (id: string) => `achievement:${id}`;

/** Unlocked achievements: id → the day it was unlocked. */
export type UnlockedAchievements = Readonly<Record<string, DayKey>>;

export interface AchievementView {
  readonly definition: AchievementDefinition;
  readonly progress: number;
  readonly unlocked: boolean;
  readonly unlockedOn: DayKey | null;
}

/** Every achievement with its current progress, for display. Unlocked ones stay unlocked. */
export function achievementViews(unlocked: UnlockedAchievements, context: AchievementContext): AchievementView[] {
  return ACHIEVEMENTS.map((definition) => {
    const on = unlocked[definition.id] ?? null;
    const raw = Math.max(0, Math.floor(definition.progress(context)));
    return {
      definition,
      progress: on ? definition.target : Math.min(definition.target, raw),
      unlocked: on !== null,
      unlockedOn: on,
    };
  });
}

/** Achievements whose target is now met but which aren't unlocked yet. */
export function newlyUnlocked(unlocked: UnlockedAchievements, context: AchievementContext): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.progress(context) >= a.target);
}
