import type { Insight } from '../recap/insights';

export interface IntroParts {
  /** Plays the studio splash; resolves true if it was shown (a cold launch). */
  readonly splash: { run(): Promise<boolean> };
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
 * Home is already rendered underneath and appears when this resolves.
 * The recap never appears without the splash (a reload or resume goes
 * straight to the game).
 */
export async function runIntro(parts: IntroParts): Promise<IntroResult> {
  const shown = await parts.splash.run();
  if (!shown) return 'skipped';
  if (!parts.recapEnabled()) return 'splash';
  const insight = parts.nextInsight();
  if (!insight) return 'splash';
  await parts.recap.show(insight);
  return 'recap';
}
