import type { LevelData } from '../core/types';
import { checkIn, claim, claimStatus, createDaily, readDaily, type CheckInKind, type ClaimStatus, type DailyClaim, type DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import type { PlayerStats } from '../profile/Stats';
import type { Progress } from '../progress/Progress';
import { browserStorage, parseObject, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
import {
  achievementTransactionId,
  achievementViews,
  ACHIEVEMENTS,
  newlyUnlocked,
  type AchievementDefinition,
  type AchievementView,
  type UnlockedAchievements,
} from './Achievements';
import { createWallet, earn, readWallet, type Transaction, type Wallet } from './Wallet';

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
}

export const REWARDS_KEY = 'neon-escape.rewards';
export const REWARDS_VERSION = 1;

export function createRewards(): RewardsRecord {
  return { daily: createDaily(), wallet: createWallet(), achievements: {}, bestChain: 0 };
}

const KNOWN_ACHIEVEMENTS = new Set(ACHIEVEMENTS.map((a) => a.id));

/** Reads the saved record, validating every part separately. Never throws. */
export function readRewards(raw: string | null): { value: RewardsRecord; status: SaveStatus } {
  if (raw === null) return { value: createRewards(), status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: createRewards(), status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > REWARDS_VERSION) return { value: createRewards(), status: 'newer' };
  if (data.version !== REWARDS_VERSION) return { value: createRewards(), status: 'corrupt' };

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
    value: { daily: readDaily(data.daily), wallet: { ...wallet, applied }, achievements: unlocked, bestChain },
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
   */
  grant(today: DayKey, tx: Transaction): boolean {
    const paid = earn(this.record.wallet, tx);
    if (!paid.ok) return paid.reason !== 'insufficient';
    this.commit({ ...this.record, wallet: paid.wallet }, today);
    return this.lastSaveOk;
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
