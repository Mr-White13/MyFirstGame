import { isUnlocked, type Progress } from './Progress';

/**
 * Whether the testing unlock is on for a build: in development (the Vite dev
 * server and the tests), or in a build made on purpose for testing with
 * `VITE_UNLOCK_ALL_LEVELS=1` (`npm run android:apk:unlocked`, see
 * .env.unlocked). A normal production build (`npm run build`, every release)
 * never has it. Pure, so it can be tested.
 */
export function testUnlockEnabled(env: { readonly DEV?: boolean; readonly PROD?: boolean; readonly VITE_UNLOCK_ALL_LEVELS?: string }): boolean {
  return (env.DEV === true && env.PROD !== true) || env.VITE_UNLOCK_ALL_LEVELS === '1';
}

/**
 * TESTING ONLY. While true, every level can be opened from level select,
 * whatever the saved unlocks say. On in development and in explicit testing
 * builds only (see testUnlockEnabled): `npm run build`, and so every normal
 * APK or release, has it off, with the normal unlock rules. A test checks this.
 *
 * It never touches saved progress. A level opened only because of this flag
 * is a "test play": its result is shown but not recorded (no completion,
 * stars, best time, unlock or statistics), so real progression stays exactly
 * as the player earned it, and boosters there are free without touching the
 * real wallet. Levels the player has really unlocked are played and recorded
 * as normal.
 */
export const UNLOCK_ALL_LEVELS_FOR_TESTING: boolean = testUnlockEnabled(import.meta.env);

/** True if the level may be opened now (really unlocked, or any level while testing). */
export function canPlayLevel(progress: Progress, levelId: number, levelCount: number, unlockAll = UNLOCK_ALL_LEVELS_FOR_TESTING): boolean {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > levelCount) return false;
  return unlockAll || isUnlocked(progress, levelId);
}

/** True when the level is playable only because of the testing flag: its result must not be recorded. */
export function isTestPlay(progress: Progress, levelId: number, unlockAll = UNLOCK_ALL_LEVELS_FOR_TESTING): boolean {
  return unlockAll && !isUnlocked(progress, levelId);
}
