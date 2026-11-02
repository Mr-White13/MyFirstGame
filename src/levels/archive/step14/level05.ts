import { levelFromMap } from '../../levelMap';

/** Level 5 as shipped in Step 14 (revision 5). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  5,
  [
    'a  a> b  b  b  b  b>',
    'a  c  c  c  c> e  e',
    'a  c  h  h  d  d> ev',
    'a  c  k  h  d  f^ j',
    'a  c  k  h  f  f  j',
    'g^ c  k  h  h  h> j',
    'g  i^ k  n  n  n  jv',
    'g  i  k  k  k> n  n',
    'g  i  l  l  l  l> n',
    'g  m< m  m  m  m  nv',
  ],
  { revision: 5 },
);
