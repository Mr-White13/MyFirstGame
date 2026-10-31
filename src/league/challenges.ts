import { createRandom, mixSeed, type Random } from '../core/random';
import type { LevelData } from '../core/types';
import type { DayKey } from '../daily/dayKey';

/** Challenges per competition day. */
export const CHALLENGES_PER_DAY = 3;
/** Energy Arrows in every challenge: 3 × 4 = 12 points a day at most. */
export const ENERGY_PER_CHALLENGE = 4;
export const MAX_DAILY_POINTS = CHALLENGES_PER_DAY * ENERGY_PER_CHALLENGE;
/** Only layouts with at least this many arrows are used, so Energy Arrows stay a minority. */
export const MIN_CHALLENGE_ARROWS = 10;

/** One of the day's three Daily League challenges. */
export interface DailyChallenge {
  /** Stable id: `<date>:<number>:L<source level>`, the same on every refresh. */
  readonly id: string;
  readonly date: DayKey;
  /** 1, 2 or 3. */
  readonly number: number;
  /** The curated level whose layout it reuses (unchanged). */
  readonly sourceLevelId: number;
  /** Ids of the four arrows that are Energy Arrows today. */
  readonly energyArrowIds: readonly string[];
  /** The playable level: the source layout with `energy` set on four arrows. */
  readonly level: LevelData;
}

/** Turns a day key into a 32-bit seed (FNV-1a over its characters). */
export function daySeed(day: DayKey): number {
  return mixSeed(...[...day].map((c) => c.charCodeAt(0)));
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Curated levels big enough to host four Energy Arrows (levels 4–10 today). */
export function challengePool(levels: readonly LevelData[]): LevelData[] {
  return levels.filter((l) => l.arrows.length >= MIN_CHALLENGE_ARROWS);
}

/**
 * The day's three challenges, chosen deterministically from the date:
 * three different layouts from the pool (ordered by level, so challenge 1 is
 * the easiest of the three), each with four distinct arrows marked as Energy
 * Arrows. The layouts themselves are never changed: same cells, directions
 * and ids, so blocking, chains and solvability are exactly the original
 * level's, and every Energy Arrow is collectible because every arrow leaves
 * the board in a solved level.
 */
export function dailyChallenges(day: DayKey, levels: readonly LevelData[]): DailyChallenge[] {
  const pool = challengePool(levels);
  if (pool.length < CHALLENGES_PER_DAY) throw new Error(`Need ${CHALLENGES_PER_DAY} levels with ${MIN_CHALLENGE_ARROWS}+ arrows for daily challenges`);
  const random = createRandom(daySeed(day));
  const picked = shuffled(pool, random)
    .slice(0, CHALLENGES_PER_DAY)
    .sort((a, b) => a.id - b.id);
  return picked.map((source, index) => {
    const energy = shuffled(
      source.arrows.map((a) => a.id),
      random,
    ).slice(0, ENERGY_PER_CHALLENGE);
    const marked = new Set(energy);
    const number = index + 1;
    return {
      id: `${day}:${number}:L${source.id}`,
      date: day,
      number,
      sourceLevelId: source.id,
      energyArrowIds: source.arrows.filter((a) => marked.has(a.id)).map((a) => a.id), // in level order
      level: { ...source, arrows: source.arrows.map((a) => (marked.has(a.id) ? { ...a, energy: true } : a)) },
    };
  });
}

/** Unique per Energy Arrow per challenge per day: the key that makes each point collectible once. */
export const collectionKey = (challenge: Pick<DailyChallenge, 'id'>, arrowId: string) => `${challenge.id}/${arrowId}`;
