import { levelFromMap } from './levelMap';

/** Level 4 — three separate four-step chains that wind around the board. */
export default levelFromMap(4, [
  '.  .  V  V  V> .  W^',
  'T  T> .  .  U^ .  W',
  'T  Q  .  .  U  .  W',
  '.  Q  .  P< P  P  Y',
  'S  Qv .  .  .  .  Y',
  'S  .  .  X  X  X> Yv',
  'Sv R< R  R  Z  Z  Z>',
]);
