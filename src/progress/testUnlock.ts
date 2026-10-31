import { isUnlocked, type Progress } from './Progress';

/**
 * TESTING ONLY. While true, every level can be opened from level select,
 * whatever the saved unlocks say. Set it to false for a release: nothing else
 * needs to change.
 *
 * It never touches saved progress. A level opened only because of this flag
 * is a "test play": its result is shown but not recorded (no completion,
 * stars, best time, unlock or statistics), so real progression stays exactly
 * as the player earned it. Levels the player has really unlocked are played
 * and recorded as normal.
 */
export const UNLOCK_ALL_LEVELS_FOR_TESTING = true;

/** True if the level may be opened now (really unlocked, or any level while testing). */
export function canPlayLevel(progress: Progress, levelId: number, levelCount: number, unlockAll = UNLOCK_ALL_LEVELS_FOR_TESTING): boolean {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > levelCount) return false;
  return unlockAll || isUnlocked(progress, levelId);
}

/** True when the level is playable only because of the testing flag: its result must not be recorded. */
export function isTestPlay(progress: Progress, levelId: number, unlockAll = UNLOCK_ALL_LEVELS_FOR_TESTING): boolean {
  return unlockAll && !isUnlocked(progress, levelId);
}
