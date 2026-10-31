import type { LevelData } from '../../core/types';
import { levelFromMap } from '../levelMap';

/*
 * Retired level layouts, kept only as data for systems that must keep
 * reproducing what players saw before a redesign. They are not playable from
 * level select and are not part of LEVELS.
 *
 * Daily League pool versions 1 and 2 drew their challenges from these
 * revision-2 layouts of levels 4–10 (the ones with 10+ arrows). A competition
 * day that started before the levels were rebalanced must keep the same
 * layouts and Energy Arrow ids, so those pools still use them.
 */

const REVISION_2: readonly LevelData[] = [
  levelFromMap(
    4,
    [
      'a^ d  d  d  b  b  b>',
      'a  .  .  d  .  e  c^',
      '.  .  .  dv .  ev c',
      'f^ .  .  .  .  j  g^',
      'f  f  f  f  .  j  g',
      '.  .  .  h< h  j  g',
      'i  i  i  i> .  jv g',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    5,
    [
      '.  c  c  g  a^ .  .',
      'b^ c  .  g  a  .  d',
      'b  cv .  g  a  .  dv',
      'e^ f< f  gv h< h  .',
      'e  .  i^ .  .  .  k',
      'e  .  i  j< j  j  k',
      'e  .  i  i  .  .  kv',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    6,
    [
      '.  b  a  a> .  .  .  c',
      '.  b  b  b> .  .  .  cv',
      'd  d  d  .  .  .  .  f',
      'dv i  .  e< e  e  e  fv',
      '.  i  .  g^ .  .  .  .',
      '.  i  .  g  h  h  h  h>',
      'i< i  g  g  k  l  .  m',
      'j  j  j> .  kv l  l> mv',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    7,
    [
      '.  a  a> d  .  .  .  .',
      '.  .  .  d  .  .  .  f',
      'b^ .  .  d  e  e  .  f',
      'b  c^ g  dv ev f< f  f',
      'b  c  g  g> h  .  .  .',
      'b  .  k  h< h  i^ .  .',
      'b  j^ kv .  .  i  i  i',
      'j  j  .  .  l< l  l  .',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    8,
    [
      '.  c  .  a< a  .  .  b^',
      '.  cv d  d> .  e  .  b',
      'f  g  e< e  e  e  h  .',
      'fv gv .  .  h< h  h  j',
      'k  k  .  i^ .  .  .  jv',
      'kv .  l^ i  m< m  n< n',
      '.  .  l  o< o  o  .  r',
      'p  p  p  p> q  q> .  rv',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    9,
    [
      '.  .  .  .  a< a  .  d  .',
      'b^ c  c> .  e  e  .  d  d>',
      'b  .  g  .  ev .  i  .  .',
      'f^ .  g  .  .  h  i  j  .',
      'f  .  g  g> l  hv iv jv m',
      'f  k^ .  .  lv m< m  m  m',
      '.  k  n  n> .  .  .  .  o^',
      'p^ .  q< q  r< r  r  r  o',
      'p  .  s  s  s> t  t  t> .',
    ],
    { revision: 2 },
  ),
  levelFromMap(
    10,
    [
      'a  a  a> b  b  b  b  b> f',
      'c^ d  d  d  d> .  e^ .  fv',
      'c  g  g  g  g> .  e  h^ .',
      'c  i^ .  j< j  j  j  h  .',
      'c  i  n  k^ l< l  m< m  p',
      '.  .  nv k  .  l  .  o^ pv',
      'q  q> .  r  r> l  l  o  w',
      'q  t  .  r  s< s  s  .  w',
      '.  t  t> u  u> v  v> .  wv',
    ],
    { revision: 2 },
  ),
];

/** Revision-2 layouts of levels 4–10, by level id. */
export const REVISION_2_LAYOUTS: ReadonlyMap<number, LevelData> = new Map(REVISION_2.map((l) => [l.id, l]));
