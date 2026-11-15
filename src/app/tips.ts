import { t, type MessageKey } from '../i18n/translate';
import type { FeedbackEvent } from './Feedback';

/**
 * One-time rule tips for new players: short toasts at the moment a rule
 * first matters, never a blocking tutorial. Each is shown once ever (saved
 * in the rewards record, see Rewards.markTipSeen).
 */
export type TipId = 'tap' | 'blocked' | 'chain' | 'streak';

export const TIP_IDS: readonly TipId[] = ['tap', 'blocked', 'chain', 'streak'];

const TIP_KEYS: Readonly<Record<TipId, MessageKey>> = {
  tap: 'game.tipTap',
  blocked: 'game.tipBlocked',
  chain: 'game.tipChain',
  streak: 'game.tipStreak',
};

/** A tip's text, in the current language. */
export function tipText(id: TipId): string {
  return t(TIP_KEYS[id]);
}

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
