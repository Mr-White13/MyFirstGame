import { levelFromMap } from './levelMap';

/** Level 9 — first 9×9 board: a dense grid where long chains cross each other. */
export default levelFromMap(9, [
  'I< I  I  .  O  O  O> L^ R',
  'J^ K  K  K  K> .  .  L  R',
  'J  .  T  T  T> D  P  L  R',
  'J  E  E  E  E> D  P  L  Rv',
  'J  M  F^ .  G  D  P  Q  Q',
  'U  M  F  G< G  Dv Pv Qv B',
  'U  M  F  H^ C  C  C  C> B',
  'Uv Mv .  H  S  S  S  S> Bv',
  'N< N  N  H  A  A  A  A  A>',
]);
