/**
 * Energy Credits: an offline, non-purchasable, non-transferable reward
 * currency with no real-money value. Earned from daily rewards and
 * achievements; kept forever (it never resets). Spent on hints and boosters
 * during a level (`spend`); the saved format is the same as before spending existed.
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
/**
 * Daily and booster ids are trimmed to the most recent ones; other ids
 * (achievements, league milestones) are kept forever. Booster ids are
 * numbered per booster (`booster:hint:12`), so a trimmed id never comes back.
 */
const KEEP_RECENT_IDS: Readonly<Record<string, number>> = { 'daily:': 30, 'booster:': 50 };

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

/** Removes credits once per transaction id, if the balance allows (boosters, see Rewards.spendBooster). */
export function spend(wallet: Wallet, tx: Transaction): WalletResult {
  if (!validTransaction(tx)) return { ok: false, reason: 'invalid' };
  if (wallet.applied.includes(tx.id)) return { ok: false, reason: 'duplicate' };
  if (wallet.credits < tx.amount) return { ok: false, reason: 'insufficient' };
  return { ok: true, wallet: { ...wallet, credits: wallet.credits - tx.amount, applied: remember(wallet.applied, tx.id) } };
}

function remember(applied: readonly string[], id: string): string[] {
  let next = [...applied, id];
  for (const [prefix, keep] of Object.entries(KEEP_RECENT_IDS)) {
    const recent = next.filter((t) => t.startsWith(prefix));
    if (recent.length <= keep) continue;
    const drop = new Set(recent.slice(0, recent.length - keep));
    next = next.filter((t) => !drop.has(t));
  }
  return next;
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
