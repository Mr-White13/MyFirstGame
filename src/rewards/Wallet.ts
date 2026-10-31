/**
 * Energy Credits: an offline, non-purchasable, non-transferable reward
 * currency with no real-money value. Earned from daily rewards and
 * achievements; kept forever (it never resets). Spending (cosmetics, hints)
 * comes later; `spend` exists so that can be added without a format change.
 *
 * Not to be confused with **Energy Points** (Step 10): league points
 * collected from special arrows, which reset every competition. They will
 * have their own record; nothing here counts them.
 */
export interface Wallet {
  /** Current balance. */
  readonly credits: number;
  /** Credits earned in total (spending never lowers it). */
  readonly earned: number;
  /**
   * Ids of transactions already applied, so the same reward can never be
   * credited twice (e.g. `daily:2026-10-31`, `achievement:first-escape`).
   */
  readonly applied: readonly string[];
}

export interface Transaction {
  /** Unique per reward: `daily:<date>`, `achievement:<id>`, later `spend:<item>`… */
  readonly id: string;
  readonly amount: number;
}

/** Largest single credit or spend; anything bigger is rejected as invalid. */
export const MAX_TRANSACTION = 1000;
/** Daily ids are trimmed to the most recent ones; other ids (achievements) are kept forever. */
const KEEP_DAILY_IDS = 30;

export function createWallet(): Wallet {
  return { credits: 0, earned: 0, applied: [] };
}

export type WalletResult = { readonly ok: true; readonly wallet: Wallet } | { readonly ok: false; readonly reason: 'invalid' | 'duplicate' | 'insufficient' };

const validTransaction = (tx: Transaction) =>
  typeof tx.id === 'string' && tx.id.length > 0 && tx.id.length <= 80 && Number.isInteger(tx.amount) && tx.amount > 0 && tx.amount <= MAX_TRANSACTION;

/** Adds credits once per transaction id. */
export function earn(wallet: Wallet, tx: Transaction): WalletResult {
  if (!validTransaction(tx)) return { ok: false, reason: 'invalid' };
  if (wallet.applied.includes(tx.id)) return { ok: false, reason: 'duplicate' };
  return {
    ok: true,
    wallet: { credits: wallet.credits + tx.amount, earned: wallet.earned + tx.amount, applied: remember(wallet.applied, tx.id) },
  };
}

/** Removes credits once per transaction id, if the balance allows. Not used by the game yet. */
export function spend(wallet: Wallet, tx: Transaction): WalletResult {
  if (!validTransaction(tx)) return { ok: false, reason: 'invalid' };
  if (wallet.applied.includes(tx.id)) return { ok: false, reason: 'duplicate' };
  if (wallet.credits < tx.amount) return { ok: false, reason: 'insufficient' };
  return { ok: true, wallet: { ...wallet, credits: wallet.credits - tx.amount, applied: remember(wallet.applied, tx.id) } };
}

function remember(applied: readonly string[], id: string): string[] {
  const next = [...applied, id];
  const daily = next.filter((t) => t.startsWith('daily:'));
  if (daily.length <= KEEP_DAILY_IDS) return next;
  const drop = new Set(daily.slice(0, daily.length - KEEP_DAILY_IDS));
  return next.filter((t) => !drop.has(t));
}

/** Validates a stored wallet. A balance that doesn't add up is clamped, never inflated. */
export function readWallet(data: unknown): Wallet {
  if (typeof data !== 'object' || data === null) return createWallet();
  const w = data as Record<string, unknown>;
  const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
  const earned = int(w.earned);
  const applied = Array.isArray(w.applied) ? [...new Set(w.applied.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 80))] : [];
  // The balance can never be more than was ever earned.
  return { credits: Math.min(int(w.credits), earned), earned, applied };
}
