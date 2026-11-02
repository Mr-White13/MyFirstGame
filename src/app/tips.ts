import type { FeedbackEvent } from './Feedback';

/**
 * One-time rule tips for new players: short toasts at the moment a rule
 * first matters, never a blocking tutorial. Each is shown once ever (saved
 * in the rewards record, see Rewards.markTipSeen).
 */
export type TipId = 'tap' | 'blocked' | 'chain' | 'streak';

export const TIP_IDS: readonly TipId[] = ['tap', 'blocked', 'chain', 'streak'];

export const TIP_TEXT: Readonly<Record<TipId, string>> = {
  tap: 'Tap an arrow: it flies off the board if nothing is in its way.',
  blocked: 'Blocked! That cost a heart. The arrow turns red and leaves by itself once its path is clear.',
  chain: 'Chain reaction: freeing a path released a red arrow, at no cost.',
  streak: 'Streak bonus! 5 quick clears in a row sent 2 free arrows off the board.',
};

/** How long a tip stays on screen. */
export const TIP_MS = 4500;

/** Players who have completed this many levels already know the rules: no tips. */
export const TIPS_UNTIL_COMPLETED = 5;

/** The tip a game event introduces, if any: the first lost heart, chain release and streak bonus. */
export function tipForEvent(event: FeedbackEvent): TipId | null {
  if (event.type === 'blocked' && event.lifeLost) return 'blocked';
  if (event.type === 'chain' && event.index === 0) return 'chain';
  if (event.type === 'bonus' && event.index === 0) return 'streak';
  return null;
}

export function isTipId(value: unknown): value is TipId {
  return typeof value === 'string' && (TIP_IDS as readonly string[]).includes(value);
}
