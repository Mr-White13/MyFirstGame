import { daysBetween, isDayKey, addDays, type DayKey } from '../daily/dayKey';
import type { Transaction } from '../rewards/Wallet';
import { CHALLENGES_PER_DAY, collectionKey, CURRENT_POOL, isPoolVersion, MAX_DAILY_POINTS, type DailyChallenge } from './challenges';
import { BRONZE, LEAGUE_REWARDS, LEAGUES, leagueTransactionIds, PROTECTED_INACTIVE_DAYS, TOP_TIER, league } from './leagues';

/**
 * The offline daily league: pure rules over a small record. One competition
 * per local calendar day; it is settled (exactly once) the first time the
 * game runs on a later day, so the app never has to be open at midnight.
 */

/** Today's open competition. */
export interface Competition {
  readonly date: DayKey;
  /** League at the start of the day. */
  readonly startTier: number;
  /** Collected Energy Arrows (`<challenge id>/<arrow id>`); one point each. */
  readonly collected: readonly string[];
  /** Challenge numbers (1..3) completed today. */
  readonly completed: readonly number[];
  /** True once the all-three-challenges bonus was queued for this date. */
  readonly sweepRewarded: boolean;
  /**
   * Layout pool version this day's challenges come from (see challenges.ts).
   * Days saved before pools were versioned have none and use pool 1.
   */
  readonly pool: number;
}

export type DayOutcome = 'promoted' | 'retained' | 'relegated' | 'inactive';

/** A settled day, or a run of consecutive inactive days (`days` > 1). */
export interface HistoryEntry {
  readonly date: DayKey;
  readonly days: number;
  readonly points: number;
  readonly challenges: number;
  readonly startTier: number;
  readonly endTier: number;
  readonly outcome: DayOutcome;
}

/** What changed since the player last looked, shown once and then acknowledged. */
export interface LeagueNotice {
  readonly fromTier: number;
  readonly toTier: number;
  readonly daysSettled: number;
  readonly promotions: number;
  readonly relegations: number;
  /** Score and result of the most recent day the player took part in, if it was among those settled. */
  readonly lastPlayed: { readonly date: DayKey; readonly points: number; readonly outcome: DayOutcome } | null;
}

export interface LeagueLifetime {
  readonly points: number;
  readonly promotions: number;
  readonly relegations: number;
  readonly challengesCompleted: number;
}

export interface LeagueState {
  readonly tier: number;
  readonly highestTier: number;
  /** Consecutive settled days without a point. */
  readonly inactiveStreak: number;
  /** The latest day the league has seen (today's competition, or the last settled day). */
  readonly lastDay: DayKey | null;
  readonly current: Competition | null;
  /** Newest last; trimmed to the most recent entries. */
  readonly history: readonly HistoryEntry[];
  readonly lifetime: LeagueLifetime;
  /** Credit milestones already queued (paid once ever, or once per date). */
  readonly milestones: readonly string[];
  /**
   * Energy Credits owed to the wallet. Kept here until the wallet confirms
   * them, so a crash between the two saves is retried, never lost or doubled.
   */
  readonly outbox: readonly Transaction[];
  readonly notice: LeagueNotice | null;
}

export const KEEP_HISTORY = 30;

export function createLeague(): LeagueState {
  return {
    tier: BRONZE,
    highestTier: BRONZE,
    inactiveStreak: 0,
    lastDay: null,
    current: null,
    history: [],
    lifetime: { points: 0, promotions: 0, relegations: 0, challengesCompleted: 0 },
    milestones: [],
    outbox: [],
    notice: null,
  };
}

export const points = (c: Competition | null): number => (c ? Math.min(MAX_DAILY_POINTS, c.collected.length) : 0);

/** A participating day's result: promotion first, then relegation, else retained. One tier at most. */
export function evaluateDay(tier: number, score: number): { tier: number; outcome: Exclude<DayOutcome, 'inactive'> } {
  const t = league(tier);
  if (t.promoteAt !== null && score >= t.promoteAt) return { tier: t.order + 1, outcome: 'promoted' };
  if (t.relegateBelow !== null && score < t.relegateBelow) return { tier: t.order - 1, outcome: 'relegated' };
  return { tier: t.order, outcome: 'retained' };
}

/**
 * Applies `days` inactive days: the first PROTECTED_INACTIVE_DAYS of a
 * streak are free, each further day relegates one tier, never below Bronze.
 */
export function applyInactivity(tier: number, streak: number, days: number): { tier: number; streak: number; relegations: number } {
  let t = tier;
  let s = streak;
  let relegations = 0;
  for (let i = 0; i < days; i++) {
    s++;
    if (s > PROTECTED_INACTIVE_DAYS && t > BRONZE) {
      t--;
      relegations++;
    }
    if (t === BRONZE && s > PROTECTED_INACTIVE_DAYS) {
      s += days - i - 1; // nothing more can change: skip ahead
      break;
    }
  }
  return { tier: t, streak: s, relegations };
}

export type SettleStatus = 'locked' | 'clock-back' | 'unchanged' | 'settled' | 'started';

/**
 * Brings the league up to `today`: settles the open competition if it
 * belongs to an earlier day, applies any fully missed days, and opens
 * today's competition. Idempotent: calling it again on the same day (or
 * after a refresh) changes nothing. A date earlier than the last one seen
 * (clock moved back) changes nothing either.
 */
export function settle(state: LeagueState, today: DayKey, unlocked: boolean): { state: LeagueState; status: SettleStatus } {
  if (!unlocked) return { state, status: 'locked' };
  if (state.lastDay !== null && today < state.lastDay) return { state, status: 'clock-back' };
  if (state.lastDay === today && state.current?.date === today) return { state, status: 'unchanged' };

  let tier = state.tier;
  let highest = state.highestTier;
  let streak = state.inactiveStreak;
  const lifetime = { ...state.lifetime };
  const history = [...state.history];
  const milestones = [...state.milestones];
  const outbox = [...state.outbox];
  let promotions = 0;
  let relegations = 0;
  let daysSettled = 0;
  let lastPlayed: LeagueNotice['lastPlayed'] = null;

  const promoteRewards = (newTier: number) => {
    if (!milestones.includes(leagueTransactionIds.firstPromotion)) {
      milestones.push(leagueTransactionIds.firstPromotion);
      outbox.push({ id: leagueTransactionIds.firstPromotion, amount: LEAGUE_REWARDS.firstPromotion });
    }
    const t = league(newTier);
    const amount = LEAGUE_REWARDS.newHighest[t.id];
    const id = leagueTransactionIds.newHighest(t.id);
    if (newTier > highest && amount && !milestones.includes(id)) {
      milestones.push(id);
      outbox.push({ id, amount });
    }
  };

  const addInactive = (from: DayKey, days: number) => {
    if (days <= 0) return;
    const start = tier;
    const r = applyInactivity(tier, streak, days);
    tier = r.tier;
    streak = r.streak;
    relegations += r.relegations;
    lifetime.relegations += r.relegations;
    daysSettled += days;
    const last = history[history.length - 1];
    // Merge with a run of inactive days that ended just before this one.
    if (last && last.outcome === 'inactive' && addDays(last.date, last.days) === from) {
      history[history.length - 1] = { ...last, days: last.days + days, endTier: tier };
    } else {
      history.push({ date: from, days, points: 0, challenges: 0, startTier: start, endTier: tier, outcome: 'inactive' });
    }
  };

  // 1. The open competition from an earlier day.
  const c = state.current;
  if (c && c.date < today) {
    const score = points(c);
    if (score > 0) {
      const result = evaluateDay(tier, score);
      if (result.outcome === 'promoted') {
        promoteRewards(result.tier);
        promotions++;
        lifetime.promotions++;
      }
      if (result.outcome === 'relegated') {
        relegations++;
        lifetime.relegations++;
      }
      history.push({ date: c.date, days: 1, points: score, challenges: c.completed.length, startTier: tier, endTier: result.tier, outcome: result.outcome });
      tier = result.tier;
      highest = Math.max(highest, tier);
      streak = 0;
      daysSettled++;
      lastPlayed = { date: c.date, points: score, outcome: result.outcome };
    } else {
      addInactive(c.date, 1);
    }
  }

  // 2. Whole days with no competition at all (the game wasn't opened).
  if (state.lastDay !== null) {
    const after = c && c.date >= state.lastDay ? c.date : state.lastDay;
    addInactive(addDays(after, 1), daysBetween(after, today) - 1);
  }

  // 3. Today's competition.
  const current: Competition = { date: today, startTier: tier, collected: [], completed: [], sweepRewarded: false, pool: CURRENT_POOL };

  // Only results worth telling: a played day, or a league change.
  let notice = state.notice;
  if (lastPlayed || promotions || relegations) {
    notice = {
      fromTier: notice?.fromTier ?? state.tier,
      toTier: tier,
      daysSettled: (notice?.daysSettled ?? 0) + daysSettled,
      promotions: (notice?.promotions ?? 0) + promotions,
      relegations: (notice?.relegations ?? 0) + relegations,
      lastPlayed: lastPlayed ?? notice?.lastPlayed ?? null,
    };
  }

  return {
    state: {
      tier,
      highestTier: Math.max(highest, tier),
      inactiveStreak: streak,
      lastDay: today,
      current,
      history: history.slice(-KEEP_HISTORY),
      lifetime,
      milestones,
      outbox,
      notice,
    },
    status: state.lastDay === null ? 'started' : 'settled',
  };
}

export type CollectStatus = 'awarded' | 'duplicate' | 'not-energy' | 'wrong-day' | 'full';

/**
 * Awards one Energy Point for an Energy Arrow the rules just removed. Only
 * for today's competition and today's challenge, and only once per
 * challenge and arrow, whatever happens to the attempt afterwards.
 */
export function collect(state: LeagueState, today: DayKey, challenge: DailyChallenge, arrowId: string): { state: LeagueState; status: CollectStatus } {
  const c = state.current;
  if (!c || c.date !== today || challenge.date !== today) return { state, status: 'wrong-day' };
  if (!challenge.energyArrowIds.includes(arrowId)) return { state, status: 'not-energy' };
  const key = collectionKey(challenge, arrowId);
  if (c.collected.includes(key)) return { state, status: 'duplicate' };
  if (c.collected.length >= MAX_DAILY_POINTS) return { state, status: 'full' };
  return {
    state: {
      ...state,
      current: { ...c, collected: [...c.collected, key] },
      lifetime: { ...state.lifetime, points: state.lifetime.points + 1 },
    },
    status: 'awarded',
  };
}

/** Records a completed challenge (once per day); completing all three queues the daily bonus once. */
export function completeChallenge(state: LeagueState, today: DayKey, challenge: DailyChallenge): { state: LeagueState; first: boolean } {
  const c = state.current;
  if (!c || c.date !== today || challenge.date !== today || c.completed.includes(challenge.number)) return { state, first: false };
  const completed = [...c.completed, challenge.number].sort();
  let next: LeagueState = {
    ...state,
    current: { ...c, completed },
    lifetime: { ...state.lifetime, challengesCompleted: state.lifetime.challengesCompleted + 1 },
  };
  if (completed.length >= CHALLENGES_PER_DAY && !c.sweepRewarded) {
    const id = leagueTransactionIds.dailySweep(today);
    next = {
      ...next,
      current: { ...next.current!, sweepRewarded: true },
      outbox: next.outbox.some((t) => t.id === id) ? next.outbox : [...next.outbox, { id, amount: LEAGUE_REWARDS.dailySweep }],
    };
  }
  return { state: next, first: true };
}

/** Energy Points collected in one challenge today. */
export function collectedIn(state: LeagueState, challenge: DailyChallenge): number {
  const c = state.current;
  if (!c || c.date !== challenge.date) return 0;
  return challenge.energyArrowIds.filter((id) => c.collected.includes(collectionKey(challenge, id))).length;
}

export function acknowledge(state: LeagueState): LeagueState {
  return state.notice ? { ...state, notice: null } : state;
}

/** Removes transactions the wallet has confirmed. */
export function delivered(state: LeagueState, ids: readonly string[]): LeagueState {
  if (ids.length === 0) return state;
  return { ...state, outbox: state.outbox.filter((t) => !ids.includes(t.id)) };
}

// ------------------------------------------------------------ validation

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isTier = (v: unknown): v is number => isCount(v) && v <= TOP_TIER;
const OUTCOMES: readonly DayOutcome[] = ['promoted', 'retained', 'relegated', 'inactive'];

function readCompetition(v: unknown): Competition | null {
  if (typeof v !== 'object' || v === null) return null;
  const c = v as Record<string, unknown>;
  if (!isDayKey(c.date) || !isTier(c.startTier)) return null;
  const strings = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && s.startsWith(`${c.date}:`)))] : []);
  const completed = Array.isArray(c.completed) ? [...new Set(c.completed.filter((n): n is number => isCount(n) && n >= 1 && n <= CHALLENGES_PER_DAY))].sort() : [];
  return {
    date: c.date,
    startTier: c.startTier,
    collected: strings(c.collected).slice(0, MAX_DAILY_POINTS),
    completed,
    sweepRewarded: c.sweepRewarded === true,
    // Saved before pools existed: that day was built from the original pool.
    pool: isPoolVersion(c.pool) ? c.pool : 1,
  };
}

function readEntry(v: unknown): HistoryEntry | null {
  if (typeof v !== 'object' || v === null) return null;
  const e = v as Record<string, unknown>;
  if (!isDayKey(e.date) || !isTier(e.startTier) || !isTier(e.endTier) || !OUTCOMES.includes(e.outcome as DayOutcome)) return null;
  return {
    date: e.date,
    days: isCount(e.days) && e.days >= 1 ? e.days : 1,
    points: isCount(e.points) ? Math.min(MAX_DAILY_POINTS, e.points) : 0,
    challenges: isCount(e.challenges) ? Math.min(CHALLENGES_PER_DAY, e.challenges) : 0,
    startTier: e.startTier,
    endTier: e.endTier,
    outcome: e.outcome as DayOutcome,
  };
}

/** Validates a stored league record field by field; anything invalid falls back to a safe default. */
export function readLeagueState(data: Record<string, unknown>): LeagueState {
  const fresh = createLeague();
  const tier = isTier(data.tier) ? data.tier : BRONZE;
  const life = (typeof data.lifetime === 'object' && data.lifetime !== null ? data.lifetime : {}) as Record<string, unknown>;
  const current = readCompetition(data.current);
  const lastDay = isDayKey(data.lastDay) ? data.lastDay : (current?.date ?? null);
  const outbox = Array.isArray(data.outbox)
    ? data.outbox.filter(
        (t): t is Transaction =>
          typeof t === 'object' && t !== null && typeof (t as Transaction).id === 'string' && isCount((t as Transaction).amount) && (t as Transaction).amount > 0,
      )
    : [];
  const n = data.notice as Record<string, unknown> | null | undefined;
  const notice: LeagueNotice | null =
    n && typeof n === 'object' && isTier(n.fromTier) && isTier(n.toTier)
      ? {
          fromTier: n.fromTier,
          toTier: n.toTier,
          daysSettled: isCount(n.daysSettled) ? n.daysSettled : 0,
          promotions: isCount(n.promotions) ? n.promotions : 0,
          relegations: isCount(n.relegations) ? n.relegations : 0,
          lastPlayed:
            n.lastPlayed && typeof n.lastPlayed === 'object' && isDayKey((n.lastPlayed as Record<string, unknown>).date)
              ? {
                  date: (n.lastPlayed as Record<string, string>).date,
                  points: isCount((n.lastPlayed as Record<string, unknown>).points) ? ((n.lastPlayed as Record<string, number>).points) : 0,
                  outcome: OUTCOMES.includes((n.lastPlayed as Record<string, DayOutcome>).outcome) ? (n.lastPlayed as Record<string, DayOutcome>).outcome : 'retained',
                }
              : null,
        }
      : null;
  return {
    tier,
    highestTier: Math.max(tier, isTier(data.highestTier) ? data.highestTier : BRONZE),
    inactiveStreak: isCount(data.inactiveStreak) ? data.inactiveStreak : 0,
    lastDay: current && lastDay && current.date > lastDay ? current.date : lastDay,
    current: current && lastDay && current.date < lastDay ? null : current,
    history: Array.isArray(data.history) ? data.history.map(readEntry).filter((e): e is HistoryEntry => e !== null).slice(-KEEP_HISTORY) : [],
    lifetime: {
      points: isCount(life.points) ? life.points : fresh.lifetime.points,
      promotions: isCount(life.promotions) ? life.promotions : 0,
      relegations: isCount(life.relegations) ? life.relegations : 0,
      challengesCompleted: isCount(life.challengesCompleted) ? life.challengesCompleted : 0,
    },
    milestones: Array.isArray(data.milestones) ? [...new Set(data.milestones.filter((m): m is string => typeof m === 'string'))] : [],
    outbox,
    notice,
  };
}

export { LEAGUES };
