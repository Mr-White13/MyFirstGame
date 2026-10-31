import type { Insight } from '../recap/insights';

export interface IntroParts {
  /**
   * Plays the studio splash; resolves true if it was shown (a cold launch).
   * `onLeaving` runs as its fade-out starts.
   */
  readonly splash: { run(onLeaving?: () => void): Promise<boolean> };
  readonly recap: { show(insight: Insight): Promise<'continue' | 'skip'> };
  /** The player's Settings choice. */
  readonly recapEnabled: () => boolean;
  /** The next insight in the rotation (advancing it), or null if the records support none yet. */
  readonly nextInsight: () => Insight | null;
}

export type IntroResult = 'skipped' | 'splash' | 'recap';

/**
 * The startup sequence over Home: the studio splash once per cold launch,
 * then, if enabled and there is something real to say, one recap insight.
 * Home is already rendered underneath. The recap card opens the moment the
 * splash starts fading out, so the two crossfade (no flash of Home between
 * them); without a recap, Home itself appears through the fade. The recap
 * never appears without the splash (a reload or resume goes straight to the game).
 */
export async function runIntro(parts: IntroParts): Promise<IntroResult> {
  let recap: Promise<'continue' | 'skip'> | null = null;
  const openRecap = () => {
    if (recap || !parts.recapEnabled()) return;
    const insight = parts.nextInsight();
    if (insight) recap = parts.recap.show(insight);
  };
  const shown = await parts.splash.run(openRecap);
  if (!shown) return 'skipped';
  if (!recap) return 'splash';
  await recap;
  return 'recap';
}
