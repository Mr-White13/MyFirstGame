import type { LevelData } from '../core/types';
import { checkIn, claim, claimStatus, createDaily, readDaily, type CheckInKind, type ClaimStatus, type DailyClaim, type DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import type { PlayerStats } from '../profile/Stats';
import type { Progress } from '../progress/Progress';
import { browserStorage, readVersioned, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
import {
  achievementTransactionId,
  achievementViews,
  ACHIEVEMENTS,
  newlyUnlocked,
  type AchievementDefinition,
  type AchievementView,
  type UnlockedAchievements,
} from './Achievements';
import { createWallet, earn, readWallet, spend, type Transaction, type Wallet } from './Wallet';
import { BOOSTERS, countBooster, NO_BOOSTERS, type BoosterCounts, type BoosterId } from '../boosters/Boosters';
import { isTipId, type TipId } from '../app/tips';
import {
  canEquip,
  cosmeticById,
  createCosmetics,
  readCosmetics,
  shopTransactionId,
  type CosmeticId,
  type CosmeticItem,
  type CosmeticSlot,
  type CosmeticsState,
  type PurchaseBlock,
} from '../shop/catalog';

/**
 * Daily check-in, wallet and achievements in **one** saved record, so a
 * reward and the credits it pays are always written together: there is no
 * moment where one is saved and the other isn't.
 */
export interface RewardsRecord {
  readonly daily: DailyState;
  readonly wallet: Wallet;
  /** Unlocked achievements: id → day unlocked. */
  readonly achievements: UnlockedAchievements;
  /** Most red arrows released by one chain reaction, ever (not in PlayerStats). */
  readonly bestChain: number;
  /**
   * Boosters paid for with credits, in total (for statistics and balancing),
   * and whether the first-time booster tip was shown. Saved with the wallet,
   * so a charge and its count are always written together. Added within
   * version 1: older saves read as zero uses, tip not shown.
   */
  readonly boosters: BoosterRecord;
  /**
   * Shop cosmetics: what is owned (forever) and what is equipped. Saved with
   * the wallet, so a purchase's charge and its unlock are one write. Added
   * within version 1: older saves read as nothing owned, nothing equipped.
   */
  readonly cosmetics: CosmeticsState;
  /** One-time rule tips already shown (see app/tips.ts). Added within version 1: older saves have none. */
  readonly tips: readonly TipId[];
}

/** The result of a Shop purchase. On failure nothing was charged or changed. */
export type PurchaseResult = { readonly ok: true; readonly item: CosmeticItem } | { readonly ok: false; readonly reason: PurchaseBlock };

export interface BoosterRecord {
  readonly used: BoosterCounts;
  readonly introduced: boolean;
}

/** The wallet transaction id of a booster's n-th paid use (n from 1). */
export const boosterTransactionId = (id: BoosterId, n: number): string => `booster:${id}:${n}`;

function readBoosters(data: unknown): BoosterRecord {
  const b = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const used = typeof b.used === 'object' && b.used !== null ? (b.used as Record<string, unknown>) : {};
  const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
  return {
    used: { hint: count(used.hint), reveal: count(used.reveal), heart: count(used.heart) },
    introduced: b.introduced === true,
  };
}

export const REWARDS_KEY = 'neon-escape.rewards';
export const REWARDS_VERSION = 1;

export function createRewards(): RewardsRecord {
  return {
    daily: createDaily(),
    wallet: createWallet(),
    achievements: {},
    bestChain: 0,
    boosters: { used: NO_BOOSTERS, introduced: false },
    cosmetics: createCosmetics(),
    tips: [],
  };
}

const KNOWN_ACHIEVEMENTS = new Set(ACHIEVEMENTS.map((a) => a.id));

/** Reads the saved record, validating every part separately. Never throws. */
export function readRewards(raw: string | null): { value: RewardsRecord; status: SaveStatus } {
  const header = readVersioned(raw, REWARDS_VERSION);
  if ('status' in header) return { value: createRewards(), status: header.status };
  const { data } = header;

  const unlocked: Record<string, DayKey> = {};
  if (typeof data.achievements === 'object' && data.achievements !== null) {
    for (const [id, day] of Object.entries(data.achievements as Record<string, unknown>)) {
      // Unknown ids are dropped (renamed or removed achievements); the credits they paid stay in the wallet.
      if (KNOWN_ACHIEVEMENTS.has(id) && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) unlocked[id] = day;
    }
  }
  const wallet = readWallet(data.wallet);
  // An unlocked achievement always counts as paid, even if its id was trimmed or lost.
  const applied = [...new Set([...wallet.applied, ...Object.keys(unlocked).map(achievementTransactionId)])];
  const bestChain = typeof data.bestChain === 'number' && Number.isInteger(data.bestChain) && data.bestChain >= 0 ? data.bestChain : 0;
  return {
    value: {
      daily: readDaily(data.daily),
      wallet: { ...wallet, applied },
      achievements: unlocked,
      bestChain,
      boosters: readBoosters(data.boosters),
      cosmetics: readCosmetics(data.cosmetics, applied),
      tips: Array.isArray(data.tips) ? [...new Set(data.tips.filter(isTipId))] : [],
    },
    status: 'current',
  };
}

export function serializeRewards(record: RewardsRecord): string {
  return JSON.stringify({ version: REWARDS_VERSION, ...record });
}

export interface RewardSources {
  readonly levels: readonly LevelData[];
  /** The latest progress and statistics (owned by App). */
  records(): { progress: Progress; stats: PlayerStats };
}

export interface ClaimResult {
  readonly reward: DailyClaim;
  readonly unlocked: readonly AchievementDefinition[];
}

/**
 * The live rewards state: check in, claim, track achievements, and save
 * after every change in a single write. All rules are in the pure modules
 * (Daily, Wallet, Achievements); this class only sequences and persists.
 */
export class Rewards {
  private readonly safe: SafeStore<RewardsRecord>;
  private record: RewardsRecord;
  private readonly listeners = new Set<(record: RewardsRecord) => void>();
  private lastSaveOk = true;
  private readonly unlockListeners = new Set<(unlocked: readonly AchievementDefinition[]) => void>();

  constructor(
    private readonly sources: RewardSources,
    store: KeyValueStore | null = browserStorage(),
  ) {
    this.safe = new SafeStore(REWARDS_KEY, { read: readRewards, write: serializeRewards, fallback: createRewards }, store);
    this.record = this.safe.load();
  }

  get current(): RewardsRecord {
    return this.record;
  }

  get credits(): number {
    return this.record.wallet.credits;
  }

  status(today: DayKey): ClaimStatus {
    return claimStatus(this.record.daily, today);
  }

  achievements(): AchievementView[] {
    return achievementViews(this.record.achievements, this.context());
  }

  /** Called on start, on return from the background and when the date changes. Never pays anything by itself. */
  checkIn(today: DayKey): CheckInKind {
    const { state, kind } = checkIn(this.record.daily, today);
    if (state !== this.record.daily) this.commit({ ...this.record, daily: state }, today);
    else this.sync(today);
    return kind;
  }

  /**
   * Claims today's reward: the claim, its credits and any achievement it
   * completes are saved in one write. Returns null if nothing can be claimed
   * (already claimed, clock moved back, …), so a double tap pays once.
   */
  claimDaily(today: DayKey): ClaimResult | null {
    const claimed = claim(this.record.daily, today);
    if (!claimed) return null;
    const paid = earn(this.record.wallet, { id: claimed.reward.transactionId, amount: claimed.reward.credits });
    if (!paid.ok) return null; // already paid for this date (defence in depth)
    const unlocked = this.commit({ ...this.record, daily: claimed.state, wallet: paid.wallet }, today);
    return { reward: claimed.reward, unlocked };
  }

  /**
   * Credits a transaction owed by another record (league milestones). Returns
   * true once it is in the saved wallet: applied now, or already applied before
   * (the id is known). Invalid transactions also return true, so they are dropped
   * rather than retried forever.
   *
   * A known id is only "saved" if the last save succeeded: when it failed (full
   * or blocked storage, or a newer save that must not be overwritten), the
   * record is saved again first, and the caller keeps owing the credit until
   * that works.
   */
  grant(today: DayKey, tx: Transaction): boolean {
    const paid = earn(this.record.wallet, tx);
    if (!paid.ok) {
      if (paid.reason !== 'duplicate') return paid.reason !== 'insufficient';
      if (!this.lastSaveOk) this.lastSaveOk = this.safe.save(this.record);
      return this.lastSaveOk;
    }
    this.commit({ ...this.record, wallet: paid.wallet }, today);
    return this.lastSaveOk;
  }

  /**
   * Pays for one booster use from the wallet: the credits and the use count
   * are saved in one write. Returns false and changes nothing when the
   * balance is too low (or the transaction is otherwise refused), so a failed
   * activation is never charged. Test plays never call this (they are free).
   */
  spendBooster(today: DayKey, id: BoosterId): boolean {
    const n = this.record.boosters.used[id] + 1;
    const paid = spend(this.record.wallet, { id: boosterTransactionId(id, n), amount: BOOSTERS[id].cost });
    if (!paid.ok) return false;
    const boosters = { ...this.record.boosters, used: countBooster(this.record.boosters.used, id) };
    this.commit({ ...this.record, wallet: paid.wallet, boosters }, today);
    return true;
  }

  /**
   * Buys a Shop item once, and equips it. The charge, the ownership and the
   * equipped item are saved in **one** write; if that write fails, nothing
   * changes (not even in memory) and nothing is charged, so the balance and
   * the items owned can never disagree. Refused, without any change, for an
   * unknown item, one already owned (also if its payment is already in the
   * wallet) or too few credits.
   */
  buyCosmetic(id: string): PurchaseResult {
    const item = cosmeticById(id);
    if (!item) return { ok: false, reason: 'unknown' };
    const { cosmetics, wallet } = this.record;
    if (cosmetics.owned.includes(item.id)) return { ok: false, reason: 'owned' };
    const paid = spend(wallet, { id: shopTransactionId(item.id), amount: item.price });
    if (!paid.ok) return { ok: false, reason: paid.reason === 'duplicate' ? 'owned' : paid.reason === 'insufficient' ? 'insufficient' : 'unknown' };
    const next: RewardsRecord = {
      ...this.record,
      wallet: paid.wallet,
      cosmetics: { owned: [...cosmetics.owned, item.id], equipped: { ...cosmetics.equipped, [item.slot]: item.id } },
    };
    if (!this.safe.save(next)) return { ok: false, reason: 'not-saved' };
    this.lastSaveOk = true;
    this.record = next;
    this.listeners.forEach((l) => l(next));
    return { ok: true, item };
  }

  /**
   * Wears an owned item in its slot, or `null` for the free default (no
   * frame). Returns false (no change) for an item not owned or not for that
   * slot. Equipping costs nothing.
   */
  equipCosmetic(today: DayKey, slot: CosmeticSlot, id: CosmeticId | null): boolean {
    const { cosmetics } = this.record;
    if (!canEquip(cosmetics, slot, id)) return false;
    if (cosmetics.equipped[slot] === id) return true;
    this.commit({ ...this.record, cosmetics: { ...cosmetics, equipped: { ...cosmetics.equipped, [slot]: id } } }, today);
    return true;
  }

  /** A one-time rule tip has been shown; it never shows again. */
  markTipSeen(today: DayKey, id: TipId): void {
    if (this.record.tips.includes(id)) return;
    this.commit({ ...this.record, tips: [...this.record.tips, id] }, today);
  }

  /** The first-time booster tip has been shown; it never shows again. */
  markBoostersIntroduced(today: DayKey): void {
    if (this.record.boosters.introduced) return;
    this.commit({ ...this.record, boosters: { ...this.record.boosters, introduced: true } }, today);
  }

  /** After an attempt ends (and App has saved progress and stats): note its chain and check achievements. */
  afterAttempt(today: DayKey, longestChain: number): readonly AchievementDefinition[] {
    const bestChain = Math.max(this.record.bestChain, Math.max(0, Math.floor(longestChain) || 0));
    return this.commit(bestChain === this.record.bestChain ? this.record : { ...this.record, bestChain }, today);
  }

  /** Re-checks achievements against the current records (e.g. on start, for progress made before they existed). */
  sync(today: DayKey): readonly AchievementDefinition[] {
    return this.commit(this.record, today);
  }

  subscribe(listener: (record: RewardsRecord) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onUnlock(listener: (unlocked: readonly AchievementDefinition[]) => void): void {
    this.unlockListeners.add(listener);
  }

  private context() {
    const { progress, stats } = this.sources.records();
    return { levels: this.sources.levels, progress, stats, daily: this.record.daily, bestChain: this.record.bestChain };
  }

  /**
   * Applies newly met achievements (each paid once, by transaction id) to
   * `next`, then saves and notifies, all at once. Returns what unlocked.
   */
  private commit(next: RewardsRecord, today: DayKey): AchievementDefinition[] {
    const { progress, stats } = this.sources.records();
    const context = { levels: this.sources.levels, progress, stats, daily: next.daily, bestChain: next.bestChain };
    const unlocked: AchievementDefinition[] = [];
    let wallet = next.wallet;
    const achievements: Record<string, DayKey> = { ...next.achievements };
    for (const a of newlyUnlocked(next.achievements, context)) {
      achievements[a.id] = today;
      const paid = earn(wallet, { id: achievementTransactionId(a.id), amount: a.reward });
      if (paid.ok) wallet = paid.wallet;
      unlocked.push(a);
    }
    const final: RewardsRecord = unlocked.length ? { ...next, wallet, achievements } : next;
    if (final === this.record) return [];
    this.record = final;
    this.lastSaveOk = this.safe.save(final);
    this.listeners.forEach((l) => l(final));
    if (unlocked.length) this.unlockListeners.forEach((l) => l(unlocked));
    return unlocked;
  }
}
