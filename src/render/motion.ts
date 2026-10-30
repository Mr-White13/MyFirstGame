/**
 * Reduced-motion preference for the canvas. Decorative effects (particles,
 * trails, staggered intros, board waves) are skipped when it is on; movement
 * that carries meaning (an arrow leaving, a blocked bump) is kept.
 */
const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function reducedMotion(): boolean {
  return query?.matches ?? false;
}
