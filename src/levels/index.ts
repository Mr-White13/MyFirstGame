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

/**
 * Every playable level, in play order. Level ids must be 1..n matching their
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
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id: number): LevelData | undefined {
  return LEVELS[id - 1];
}
