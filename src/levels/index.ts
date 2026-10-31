import type { LevelData } from '../core/types';
import level01 from './level01';
import level02 from './level02';
import level03 from './level03';
import level04 from './level04';
import level05 from './level05';
import level06 from './level06';
import level07 from './level07';
import level08 from './level08';
import level09 from './level09';
import level10 from './level10';
import level11 from './level11';
import level12 from './level12';
import level13 from './level13';
import level14 from './level14';
import level15 from './level15';
import level16 from './level16';
import level17 from './level17';
import level18 from './level18';
import level19 from './level19';
import level20 from './level20';
import level21 from './level21';
import level22 from './level22';
import level23 from './level23';
import level24 from './level24';
import level25 from './level25';
import level26 from './level26';
import level27 from './level27';
import level28 from './level28';
import level29 from './level29';
import level30 from './level30';

/**
 * Every playable level, in play order. Levels 1–10 are hand-designed;
 * 11–30 were generated offline from tools/level-plan.json and reviewed.
 * Level ids must be 1..n matching their
 * position here (checked by the tests). To add a level, create `levelNN.ts`
 * with `levelFromMap(NN, [...])` and append it to this list.
 */
export const LEVELS: readonly LevelData[] = [
  level01,
  level02,
  level03,
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
  level21,
  level22,
  level23,
  level24,
  level25,
  level26,
  level27,
  level28,
  level29,
  level30,
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id: number): LevelData | undefined {
  return LEVELS[id - 1];
}
