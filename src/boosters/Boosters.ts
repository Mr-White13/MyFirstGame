import type { GameState } from '../core/GameState';

/**
 * Hints and boosters: optional help during a level, paid with Energy
 * Credits. Pure rules only; spending goes through the existing wallet
 * (Rewards.spendBooster) and the effects through GameState and the scene.
 *
 * - Hint: points at one arrow that can escape right now. Nothing moves.
 * - Reveal: shows every arrow that can escape right now, for a few seconds.
 *
 * (Extra Heart was a booster too; a lost run is now continued from the Game
 * Over dialog with a rewarded ad instead, see App.continueWithAd.)
 *
 * How a booster is paid for is separate from what it does (BoosterPayment),
 * so a later source (a rewarded ad, a gift) can grant the same boosters.
 */
export type BoosterId = 'hint' | 'reveal';

export const BOOSTER_IDS: readonly BoosterId[] = ['hint', 'reveal'];

export interface BoosterDefinition {
  readonly id: BoosterId;
  readonly name: string;
  /** Energy Credits per use. */
  readonly cost: number;
  /** One line for the first-time tip and the button's label. */
  readonly description: string;
}

export const BOOSTERS: Readonly<Record<BoosterId, BoosterDefinition>> = {
  hint: { id: 'hint', name: 'Hint', cost: 20, description: 'shows one arrow that can escape' },
  reveal: { id: 'reveal', name: 'Reveal', cost: 40, description: 'shows every free arrow for 3 seconds' },
};

/**
 * Boosters (and their first-time tip) start at this level: Levels 1–3 are
 * the tutorial, where the player first learns how arrows, hearts and red
 * arrows work, without a toolbar of extras.
 */
export const BOOSTERS_FROM_LEVEL = 4;

/** How long Reveal shows the free arrows. */
export const REVEAL_MS = 3000;
/** After an activation, further taps on any booster are ignored this long: no double spending from rapid taps. */
export const BOOSTER_LOCK_MS = 600;

/** How an activation is paid for. `credits`: the wallet. `free`: test plays (nothing is charged or counted). */
export type BoosterPayment = { readonly kind: 'credits'; readonly cost: number } | { readonly kind: 'free'; readonly reason: 'test-play' };

/** Why a booster can't be used right now. */
export type BoosterBlock =
  /** The level is over (won or lost), or no level is being played. */
  | 'not-playing'
  /** Daily League challenges are played without boosters. */
  | 'challenge'
  /** Hint / Reveal: no arrow can escape (only red ones are left, or the board is empty). */
  | 'no-target'
  /** Hint: the hinted arrow is still waiting to be tapped. Reveal: still showing. */
  | 'active'
  /** Just used one: rapid repeated taps are ignored. */
  | 'locked'
  | 'insufficient';

export interface BoosterContext {
  readonly playing: boolean;
  readonly challenge: boolean;
  /** Test play: boosters are free (no real credits are spent). */
  readonly testPlay: boolean;
  readonly credits: number;
  /** Arrows that can escape right now. */
  readonly escapable: number;
  readonly hintShowing: boolean;
  readonly revealShowing: boolean;
  readonly locked: boolean;
}

export type BoosterCheck = { readonly ok: true; readonly payment: BoosterPayment } | { readonly ok: false; readonly reason: BoosterBlock };

/**
 * Whether a booster can be used now, and how it would be paid. Checked in
 * this order, so the reason shown is the most useful one: a booster that
 * would do nothing says so before asking for credits.
 */
export function checkBooster(id: BoosterId, ctx: BoosterContext): BoosterCheck {
  if (!ctx.playing) return { ok: false, reason: 'not-playing' };
  if (ctx.challenge) return { ok: false, reason: 'challenge' };
  if (ctx.locked) return { ok: false, reason: 'locked' };
  if (ctx.escapable === 0) return { ok: false, reason: 'no-target' };
  if ((id === 'hint' && ctx.hintShowing) || (id === 'reveal' && ctx.revealShowing)) return { ok: false, reason: 'active' };
  if (ctx.testPlay) return { ok: true, payment: { kind: 'free', reason: 'test-play' } };
  const cost = BOOSTERS[id].cost;
  if (ctx.credits < cost) return { ok: false, reason: 'insufficient' };
  return { ok: true, payment: { kind: 'credits', cost } };
}

/** A short explanation for a booster that can't be used (shown when its button is tapped). */
export function blockMessage(id: BoosterId, reason: BoosterBlock, credits: number): string {
  const b = BOOSTERS[id];
  switch (reason) {
    case 'insufficient':
      return `${b.name} costs ${b.cost} Energy Credits; you have ${credits}. Earn more from daily rewards and achievements.`;
    case 'no-target':
      return 'No arrow can escape right now.';
    case 'active':
      return id === 'hint' ? 'Your hint is still showing: tap the glowing arrow.' : 'Reveal is still showing.';
    case 'challenge':
      return 'Boosters are off in Daily League challenges.';
    case 'not-playing':
      return 'Boosters work only while a level is being played.';
    case 'locked':
      return '';
  }
}

/**
 * The arrow a Hint points at: one that can escape now, preferring the one
 * that blocks the most other arrows (clearing it helps the most), then the
 * earliest in level order. Deterministic, so asking twice points at the same
 * arrow. Null when no arrow can escape.
 */
export function hintTarget(state: Pick<GameState, 'escapableArrows' | 'getArrows' | 'blockerOf'>): string | null {
  const free = state.escapableArrows();
  if (free.length === 0) return null;
  const blocks = new Map<string, number>();
  for (const arrow of state.getArrows()) {
    const blocker = state.blockerOf(arrow.id);
    if (blocker) blocks.set(blocker, (blocks.get(blocker) ?? 0) + 1);
  }
  let best = free[0];
  for (const arrow of free) if ((blocks.get(arrow.id) ?? 0) > (blocks.get(best.id) ?? 0)) best = arrow;
  return best.id;
}

/**
 * Booster uses in one attempt (or in total), for statistics and balancing.
 * `heart` keeps the paid uses of the retired Extra Heart booster in saves; it no longer grows.
 */
export type BoosterCounts = Readonly<Record<BoosterId | 'heart', number>>;

export const NO_BOOSTERS: BoosterCounts = Object.freeze({ hint: 0, reveal: 0, heart: 0 });

export function countBooster(counts: BoosterCounts, id: BoosterId): BoosterCounts {
  return { ...counts, [id]: counts[id] + 1 };
}
