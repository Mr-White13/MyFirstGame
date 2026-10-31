import type { LevelData } from '../../core/types';
import level04 from './step12/level04';
import level05 from './step12/level05';
import level06 from './step12/level06';
import level07 from './step12/level07';
import level08 from './step12/level08';
import level09 from './step12/level09';
import level10 from './step12/level10';
import level11 from './step12/level11';
import level12 from './step12/level12';
import level13 from './step12/level13';
import level14 from './step12/level14';
import level15 from './step12/level15';
import level16 from './step12/level16';
import level17 from './step12/level17';
import level18 from './step12/level18';
import level19 from './step12/level19';
import level20 from './step12/level20';
import step13Level04 from './step13/level04';
import step13Level05 from './step13/level05';
import step13Level06 from './step13/level06';
import step13Level07 from './step13/level07';
import step13Level08 from './step13/level08';
import step13Level09 from './step13/level09';
import step13Level10 from './step13/level10';
import step13Level11 from './step13/level11';
import step13Level12 from './step13/level12';
import step13Level13 from './step13/level13';
import step13Level14 from './step13/level14';
import step13Level15 from './step13/level15';
import step13Level16 from './step13/level16';
import step13Level17 from './step13/level17';
import step13Level18 from './step13/level18';
import step13Level19 from './step13/level19';
import step13Level20 from './step13/level20';
import step13Level21 from './step13/level21';
export { REVISION_2_LAYOUTS } from './revision2';

/*
 * Retired layouts, kept as data only (not playable, not in LEVELS) for the
 * Daily League: a competition day keeps the pool version it started with, so
 * days that began before a redesign must keep drawing the exact layouts (and
 * arrow ids) they started with. See CHALLENGE_POOLS in league/challenges.ts.
 *
 * step12/ holds Levels 4–20 exactly as shipped before the Step 13 redesign
 * (4–10 at revision 3, 11–20 at revision 1); step13/ holds Levels 4–21 as
 * shipped in Step 13 (4–10 at revision 4, 11–21 at revision 2), recovered
 * verbatim from the Step 13 build. These files are frozen copies: never edit them.
 */

/** Levels 4–20 as they were before the Step 13 redesign, in id order. */
export const STEP_12_LEVELS: readonly LevelData[] = [
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level16,
  level17,
  level18,
  level19,
  level20,
];

/** Levels 4–21 as they were in Step 13 (before the full-coverage redesign), in id order. */
export const STEP_13_LEVELS: readonly LevelData[] = [
  step13Level04,
  step13Level05,
  step13Level06,
  step13Level07,
  step13Level08,
  step13Level09,
  step13Level10,
  step13Level11,
  step13Level12,
  step13Level13,
  step13Level14,
  step13Level15,
  step13Level16,
  step13Level17,
  step13Level18,
  step13Level19,
  step13Level20,
  step13Level21,
];
