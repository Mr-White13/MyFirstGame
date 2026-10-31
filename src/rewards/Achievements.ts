import type { LevelData } from '../core/types';
import type { DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import type { PlayerStats } from '../profile/Stats';
import { completedCount, MAX_STARS, perfectLevels, type Progress } from '../progress/Progress';

export type AchievementCategory = 'gameplay' | 'performance' | 'daily';

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
  readonly title: string;
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
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-escape',
    title: 'First Escape',
    description: 'Complete your first level.',
    category: 'gameplay',
    icon: 'icon-check',
    reward: 15,
    target: 1,
    progress: (c) => completedCount(c.progress, c.levels.length),
  },
  {
    id: 'perfect-run',
    title: 'Perfect Run',
    description: 'Finish a level with 3 stars.',
    category: 'gameplay',
    icon: 'icon-spark',
    reward: 20,
    target: 1,
    progress: (c) => perfectLevels(c.progress, c.levels.length),
  },
  {
    id: 'chain-reaction',
    title: 'Chain Reaction',
    description: 'Free a red arrow so it leaves on its own.',
    category: 'gameplay',
    icon: 'icon-bolt',
    reward: 20,
    target: 1,
    progress: (c) => Math.max(c.stats.chainClears, c.bestChain),
  },
  {
    id: 'double-chain',
    title: 'Double Chain',
    description: 'Release 2 red arrows in a single chain reaction.',
    category: 'gameplay',
    icon: 'icon-bolt',
    reward: 40,
    target: 2,
    progress: (c) => c.bestChain,
  },
  {
    id: 'puzzle-explorer',
    title: 'Puzzle Explorer',
    description: 'Complete 5 different levels.',
    category: 'gameplay',
    icon: 'icon-grid',
    reward: 30,
    target: 5,
    progress: (c) => completedCount(c.progress, c.levels.length),
  },
  {
    id: 'puzzle-veteran',
    title: 'Puzzle Veteran',
    description: 'Complete all 10 levels.',
    category: 'gameplay',
    icon: 'icon-trophy',
    reward: 60,
    target: 10,
    progress: (c) => completedCount(c.progress, c.levels.length),
  },
  {
    id: 'speed-runner',
    title: 'Speed Runner',
    description: `Complete a level with ${SPEED_RUN_MIN_ARROWS}+ arrows in under ${SPEED_RUN_MS / 1000} seconds.`,
    category: 'performance',
    icon: 'icon-clock',
    reward: 40,
    target: 1,
    progress: (c) =>
      c.levels.some((l) => {
        const best = c.progress.completed[l.id]?.bestTimeMs;
        return l.arrows.length >= SPEED_RUN_MIN_ARROWS && typeof best === 'number' && best < SPEED_RUN_MS;
      })
        ? 1
        : 0,
  },
  {
    id: 'flawless-five',
    title: 'Flawless Five',
    description: `Earn ${MAX_STARS} stars on 5 different levels.`,
    category: 'performance',
    icon: 'icon-star',
    reward: 50,
    target: 5,
    progress: (c) => perfectLevels(c.progress, c.levels.length),
  },
  {
    id: 'first-check-in',
    title: 'First Check-in',
    description: 'Claim a daily reward.',
    category: 'daily',
    icon: 'icon-calendar',
    reward: 10,
    target: 1,
    progress: (c) => c.daily.claims,
  },
  {
    id: 'three-day-streak',
    title: 'Three-Day Streak',
    description: 'Play on 3 days in a row.',
    category: 'daily',
    icon: 'icon-flame',
    reward: 20,
    target: 3,
    progress: (c) => c.daily.longestStreak,
  },
  {
    id: 'weekly-explorer',
    title: 'Weekly Explorer',
    description: 'Play on 7 days in a row.',
    category: 'daily',
    icon: 'icon-flame',
    reward: 50,
    target: 7,
    progress: (c) => c.daily.longestStreak,
  },
  {
    id: 'dedicated-player',
    title: 'Dedicated Player',
    description: 'Play on 14 different days.',
    category: 'daily',
    icon: 'icon-target',
    reward: 60,
    target: 14,
    progress: (c) => c.daily.daysPlayed,
  },
];

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
