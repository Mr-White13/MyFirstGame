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
import level31 from './level31';
import level32 from './level32';
import level33 from './level33';
import level34 from './level34';
import level35 from './level35';
import level36 from './level36';
import level37 from './level37';
import level38 from './level38';
import level39 from './level39';
import level40 from './level40';
import level41 from './level41';
import level42 from './level42';
import level43 from './level43';
import level44 from './level44';
import level45 from './level45';
import level46 from './level46';
import level47 from './level47';
import level48 from './level48';
import level49 from './level49';
import level50 from './level50';
import level51 from './level51';
import level52 from './level52';
import level53 from './level53';
import level54 from './level54';
import level55 from './level55';
import level56 from './level56';
import level57 from './level57';
import level58 from './level58';
import level59 from './level59';
import level60 from './level60';
import level61 from './level61';
import level62 from './level62';
import level63 from './level63';
import level64 from './level64';
import level65 from './level65';
import level66 from './level66';
import level67 from './level67';
import level68 from './level68';
import level69 from './level69';
import level70 from './level70';
import level71 from './level71';
import level72 from './level72';
import level73 from './level73';
import level74 from './level74';
import level75 from './level75';
import level76 from './level76';
import level77 from './level77';
import level78 from './level78';
import level79 from './level79';
import level80 from './level80';
import level81 from './level81';
import level82 from './level82';
import level83 from './level83';
import level84 from './level84';
import level85 from './level85';
import level86 from './level86';
import level87 from './level87';
import level88 from './level88';
import level89 from './level89';
import level90 from './level90';
import level91 from './level91';
import level92 from './level92';
import level93 from './level93';
import level94 from './level94';
import level95 from './level95';
import level96 from './level96';
import level97 from './level97';
import level98 from './level98';
import level99 from './level99';
import level100 from './level100';

/**
 * Every playable level, in play order: 100 levels in five chapters of 20
 * (names in progress/chapters.ts). Levels 1–3 are hand-designed; 4–100 were
 * generated offline from tools/level-plan.json and reviewed, in one rhythm:
 * two or three normal levels, then a hard one (LevelData.tier), with a very
 * hard one closing each chapter and more often in chapters 3–5. Ten very
 * hard levels are the extreme ones first built as Levels 31–40: THE
 * IMPOSSIBLE GRID and nine shaped boards (outlines from tools/shapes.ts).
 * Level ids must be 1..n matching their position here (checked by the
 * tests). To add a level, create `levelNN.ts` with `levelFromMap(NN, [...])`
 * and append it to this list.
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
  level31,
  level32,
  level33,
  level34,
  level35,
  level36,
  level37,
  level38,
  level39,
  level40,
  level41,
  level42,
  level43,
  level44,
  level45,
  level46,
  level47,
  level48,
  level49,
  level50,
  level51,
  level52,
  level53,
  level54,
  level55,
  level56,
  level57,
  level58,
  level59,
  level60,
  level61,
  level62,
  level63,
  level64,
  level65,
  level66,
  level67,
  level68,
  level69,
  level70,
  level71,
  level72,
  level73,
  level74,
  level75,
  level76,
  level77,
  level78,
  level79,
  level80,
  level81,
  level82,
  level83,
  level84,
  level85,
  level86,
  level87,
  level88,
  level89,
  level90,
  level91,
  level92,
  level93,
  level94,
  level95,
  level96,
  level97,
  level98,
  level99,
  level100,
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id: number): LevelData | undefined {
  return LEVELS[id - 1];
}
