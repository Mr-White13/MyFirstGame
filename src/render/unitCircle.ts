/**
 * Cosines and sines of `steps` equal angles around the unit circle, with the
 * first point repeated at the end (`steps + 1` entries), so a fan or ring of
 * `steps` segments reads entries `i` and `i + 1`. Built once per table: round
 * shapes are then drawn without trigonometry per frame.
 */
export function unitCircle(steps: number): { readonly cos: readonly number[]; readonly sin: readonly number[] } {
  return {
    cos: Array.from({ length: steps + 1 }, (_, i) => Math.cos((i / steps) * Math.PI * 2)),
    sin: Array.from({ length: steps + 1 }, (_, i) => Math.sin((i / steps) * Math.PI * 2)),
  };
}
