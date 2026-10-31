import type { EffectsLevel } from '../settings/Settings';

/**
 * Motion and effects preferences for the canvas and the DOM, resolved from
 * the player's settings and the device (see settings/Appearance.ts).
 *
 * - Reduced motion skips decorative motion (particles, trails, staggered
 *   intros, board waves, screen transitions). Movement that carries meaning
 *   (an arrow leaving, a blocked bump, the hit flash) is always kept.
 * - Effects intensity scales the purely decorative work: particles, rings,
 *   energy trails and background motes.
 */
let reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let effects: EffectsLevel = 'normal';

export function reducedMotion(): boolean {
  return reduce;
}

export function effectsLevel(): EffectsLevel {
  return effects;
}

export function setMotionPreferences(reducedMotion: boolean, level: EffectsLevel): void {
  reduce = reducedMotion;
  effects = level;
}

/**
 * How much of a decorative effect to show: 0 = none, 1 = all. Reduced motion
 * turns decoration off whatever the effects level.
 */
export function decorationScale(): number {
  if (reduce) return 0;
  return effects === 'normal' ? 1 : effects === 'low' ? 0.4 : 0;
}
