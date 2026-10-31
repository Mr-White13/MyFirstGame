/** One thing Back can close or answer: a dialog, a picker, an editing mode or a screen. */
export interface BackLayer {
  /** True while this layer is showing, so Back goes to it. */
  readonly active: () => boolean;
  /** What Back does to it. `system` is true for Android Back, false for Escape. */
  readonly back: (system: boolean) => void;
}

/**
 * Gives Back to the first active layer (topmost first) and returns true, or
 * returns false when none is active. Layers further down are not even asked.
 */
export function routeBack(layers: readonly BackLayer[], system: boolean): boolean {
  const layer = layers.find((l) => l.active());
  if (!layer) return false;
  layer.back(system);
  return true;
}
