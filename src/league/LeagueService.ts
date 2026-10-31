import type { LevelData } from '../core/types';
import type { DayKey } from '../daily/dayKey';
import type { Transaction } from '../rewards/Wallet';
import { browserStorage, parseObject, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
import { CURRENT_POOL, dailyChallenges, type DailyChallenge } from './challenges';
import {
  acknowledge,
  collect,
  completeChallenge,
  createLeague,
  delivered,
  readLeagueState,
  settle,
  type CollectStatus,
  type LeagueState,
  type SettleStatus,
} from './League';

export const LEAGUE_KEY = 'neon-escape.league';
export const LEAGUE_VERSION = 1;

export function readLeague(raw: string | null): { value: LeagueState; status: SaveStatus } {
  if (raw === null) return { value: createLeague(), status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: createLeague(), status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > LEAGUE_VERSION) return { value: createLeague(), status: 'newer' };
  if (data.version !== LEAGUE_VERSION) return { value: createLeague(), status: 'corrupt' };
  return { value: readLeagueState(data), status: 'current' };
}

export function serializeLeague(state: LeagueState): string {
  return JSON.stringify({ version: LEAGUE_VERSION, ...state });
}

/** Applies one credit transaction to the wallet. True once it is safely recorded there (now or earlier). */
export type CreditGrant = (tx: Transaction) => boolean;

/** The level whose completion unlocks the Daily League. */
export const LEAGUE_UNLOCK_LEVEL = 10;

/**
 * The live league: settles days, awards Energy Points, records challenge
 * completions, and saves after every change. Rules live in League.ts.
 *
 * Credits for milestones cross into another record (the wallet), and two
 * localStorage writes are never atomic together. So they go through an
 * outbox: the league saves the owed transaction first, the wallet applies it
 * (ignoring ids it has already applied), and only then is it removed from
 * the outbox. Interrupted anywhere, the next start finishes the job, and no
 * credit is ever paid twice.
 */
export class LeagueService {
  private readonly safe: SafeStore<LeagueState>;
  private state: LeagueState;
  private readonly listeners = new Set<(state: LeagueState) => void>();
  private cache?: { day: DayKey; pool: number; challenges: DailyChallenge[] };

  constructor(
    private readonly levels: readonly LevelData[],
    private readonly grant: CreditGrant,
    store: KeyValueStore | null = browserStorage(),
  ) {
    this.safe = new SafeStore(LEAGUE_KEY, { read: readLeague, write: serializeLeague, fallback: createLeague }, store);
    this.state = this.safe.load();
  }

  get current(): LeagueState {
    return this.state;
  }

  /**
   * The day's three challenges (deterministic, cached per day), from the pool
   * version that day's competition started with.
   */
  challenges(day: DayKey): DailyChallenge[] {
    const c = this.state.current;
    const pool = c && c.date === day ? c.pool : CURRENT_POOL;
    if (this.cache?.day !== day || this.cache.pool !== pool) this.cache = { day, pool, challenges: dailyChallenges(day, this.levels, pool) };
    return this.cache.challenges;
  }

  /** Settles past days and opens today's competition. Safe to call any number of times. */
  settle(today: DayKey, unlocked: boolean): SettleStatus {
    const { state, status } = settle(this.state, today, unlocked);
    this.commit(state);
    this.flush();
    return status;
  }

  /** Called the moment the rules remove an Energy Arrow. Saved immediately. */
  collect(today: DayKey, challenge: DailyChallenge, arrowId: string): CollectStatus {
    const { state, status } = collect(this.state, today, challenge, arrowId);
    this.commit(state);
    return status;
  }

  /** Called when a challenge is completed. Returns true the first time today. */
  complete(today: DayKey, challenge: DailyChallenge): boolean {
    const { state, first } = completeChallenge(this.state, today, challenge);
    this.commit(state);
    this.flush();
    return first;
  }

  /** The result notice was seen. */
  acknowledge(): void {
    this.commit(acknowledge(this.state));
  }

  subscribe(listener: (state: LeagueState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Delivers owed credits to the wallet; keeps any it couldn't deliver for next time. */
  flush(): void {
    if (this.state.outbox.length === 0) return;
    const done = this.state.outbox.filter((tx) => {
      try {
        return this.grant(tx);
      } catch {
        return false;
      }
    });
    this.commit(delivered(this.state, done.map((t) => t.id)));
  }

  private commit(next: LeagueState): void {
    if (next === this.state) return;
    this.state = next;
    this.safe.save(next);
    this.listeners.forEach((l) => l(next));
  }
}
