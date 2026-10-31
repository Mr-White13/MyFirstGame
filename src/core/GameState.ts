import { Grid } from './Grid';
import { validateLevel } from './levelValidation';
import { checkExitPath } from './PathChecker';
import {
  BONUS_CLEARS,
  BONUS_COOLDOWN,
  STARTING_LIVES,
  STREAK_TAPS,
  STREAK_WINDOW_MS,
  type ArrowData,
  type GameSnapshot,
  type LevelData,
  type LevelStatus,
  type MoveResult,
  type Removal,
} from './types';

type Listener = (snapshot: GameSnapshot) => void;

export interface GameStateOptions {
  /**
   * Validate (and solve) the level on load. Simulations that create many
   * states for an already-validated level can switch this off.
   */
  readonly validate?: boolean;
  /**
   * Lives at the start (default STARTING_LIVES). Simulations use a large
   * value to count every mistake a strategy makes instead of stopping at 3.
   */
  readonly startingLives?: number;
  /** Milliseconds from a monotonic clock, for the streak timing (default performance.now). */
  readonly clock?: () => number;
}

/**
 * Authoritative state for the level being played. Knows nothing about
 * rendering: the scene asks it to attempt moves and animates the returned
 * result. Every rule, including chain reactions, is resolved here,
 * synchronously and deterministically, before any animation starts.
 *
 * Rules:
 * - Tapping an arrow with a clear exit removes it.
 * - Tapping a blocked arrow for the first time costs a life and activates it
 *   (it turns red). It stays on the board and keeps blocking others.
 *   Tapping it again while it is still blocked changes nothing.
 * - After every removal, any activated arrow whose exit is now clear is
 *   released automatically, one at a time in level-data order, repeating
 *   until no activated arrow can escape. These releases cost nothing and do
 *   not count as player moves.
 * - Streak bonus: when the last STREAK_TAPS successful manual taps all fall
 *   within a rolling STREAK_WINDOW_MS (no blocked tap between them) and the
 *   cooldown is over, a bonus fires after the tap that completes them (and
 *   its red chain): the first BONUS_CLEARS normal arrows, in level-data
 *   order, that can escape right now leave automatically, then any red arrows
 *   this freed are released by the usual chain rule. It never takes a blocked
 *   arrow or the last arrow on the board; with fewer than BONUS_CLEARS
 *   removable arrows it is skipped (the streak stays, so a later tap may
 *   still earn it). After a bonus the streak starts from zero and
 *   BONUS_COOLDOWN further successful manual clears are needed before the
 *   next one can fire. Only the player's own successful taps count: chain
 *   and bonus clears never do. A blocked tap (even on an arrow that is
 *   already red) resets the streak; a restart, a new level or running out of
 *   lives resets the streak and the cooldown. Bonus clears cost nothing and
 *   are not player moves. No randomness: the same taps at the same times
 *   always give the same result.
 * - The level is won when the board is empty and lost when lives reach 0.
 */
export class GameState {
  private level: LevelData;
  private grid: Grid;
  private readonly arrows = new Map<string, ArrowData>();
  /** Ids of activated (red) arrows still on the board. */
  private readonly activated = new Set<string>();
  /** Position of each arrow in the level data: the deterministic chain order. */
  private order = new Map<string, number>();
  private readonly listeners = new Set<Listener>();
  private readonly removeListeners = new Set<(arrow: ArrowData, auto: boolean) => void>();
  private readonly validate: boolean;
  private readonly startingLives: number;
  private status: LevelStatus = 'playing';
  private directClears = 0;
  private autoClears = 0;
  private cascadeClears = 0;
  /** Clock times of the recent successful manual taps (at most STREAK_TAPS, oldest first). */
  private tapTimes: number[] = [];
  /** Successful manual clears still needed before another bonus can fire. */
  private cooldown = 0;
  private readonly clock: () => number;
  private longestChain = 0;
  private mistakes = 0;

  constructor(level: LevelData, options: GameStateOptions = {}) {
    this.validate = options.validate ?? true;
    this.startingLives = options.startingLives ?? STARTING_LIVES;
    this.clock = options.clock ?? (() => performance.now());
    if (this.validate) validateLevel(level);
    this.level = level;
    this.grid = new Grid(level.rows, level.cols);
    this.reset();
  }

  /** Switches to another level (validated first) and starts it fresh. */
  load(level: LevelData): void {
    if (this.validate) validateLevel(level);
    this.level = level;
    this.grid = new Grid(level.rows, level.cols);
    this.reset();
  }

  get levelId(): number {
    return this.level.id;
  }

  get rows(): number {
    return this.level.rows;
  }

  get cols(): number {
    return this.level.cols;
  }

  get isWon(): boolean {
    return this.status === 'won';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  /** True while moves are still accepted. */
  get isPlaying(): boolean {
    return this.status === 'playing';
  }

  get lives(): number {
    return Math.max(0, this.startingLives - this.mistakes);
  }

  /** Arrows still on the board, in level-data order. */
  getArrows(): ArrowData[] {
    return [...this.arrows.values()];
  }

  /** True while the arrow is on the board (not yet removed by the rules). */
  has(arrowId: string): boolean {
    return this.arrows.has(arrowId);
  }

  isActivated(arrowId: string): boolean {
    return this.activated.has(arrowId);
  }

  arrowIdAt(row: number, col: number): string | undefined {
    return this.grid.occupantAt({ row, col });
  }

  /** Back to the start of the level: full lives, no red arrows, all counters zero. */
  reset(): void {
    this.grid.clear();
    this.arrows.clear();
    this.activated.clear();
    this.order = new Map(this.level.arrows.map((a, i) => [a.id, i]));
    for (const arrow of this.level.arrows) {
      this.grid.place(arrow);
      this.arrows.set(arrow.id, arrow);
    }
    this.status = this.arrows.size === 0 ? 'won' : 'playing';
    this.directClears = 0;
    this.autoClears = 0;
    this.cascadeClears = 0;
    this.tapTimes = [];
    this.cooldown = 0;
    this.longestChain = 0;
    this.mistakes = 0;
    this.emit();
  }

  /** Handles a player tap on an arrow at clock time `at`. See the class comment for the rules. */
  tryMove(arrowId: string, at: number = this.clock()): MoveResult {
    if (this.status !== 'playing') return { kind: 'ignored', reason: 'level-over' };
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { kind: 'ignored', reason: 'unknown-arrow' };

    const check = checkExitPath(this.grid, arrow);
    if (!check.clear) {
      const blocked = { kind: 'blocked' as const, arrowId, blockerId: check.blockerId!, freePath: check.path };
      const hadStreak = this.tapTimes.length > 0;
      this.resetStreak(); // any blocked tap breaks the streak
      if (this.activated.has(arrowId)) {
        if (hadStreak) this.emit();
        return { ...blocked, lifeLost: false, failed: false };
      }
      this.activated.add(arrowId);
      this.mistakes++;
      if (this.lives === 0) this.cooldown = 0; // the attempt is over: nothing carries on
      if (this.lives === 0) this.status = 'failed';
      this.emit();
      return { ...blocked, lifeLost: true, failed: this.status === 'failed' };
    }

    this.remove(arrow);
    this.removeListeners.forEach((l) => l(arrow, false));
    this.directClears++;
    // Rolling window: keep the taps of the last STREAK_WINDOW_MS, at most STREAK_TAPS of them.
    this.tapTimes = this.tapTimes.filter((t) => at - t <= STREAK_WINDOW_MS);
    this.tapTimes.push(at);
    if (this.tapTimes.length > STREAK_TAPS) this.tapTimes.shift();
    if (this.cooldown > 0) this.cooldown--;
    const chain = this.resolveChain();
    let cascade: Removal[] = [];
    if (this.tapTimes.length >= STREAK_TAPS && this.cooldown === 0) {
      cascade = this.resolveBonus();
      if (cascade.length > 0) {
        this.resetStreak(); // the next bonus needs a new streak...
        this.cooldown = BONUS_COOLDOWN; // ...and BONUS_COOLDOWN more clears of the player's own
      }
    }
    const cascadeChain = cascade.length > 0 ? this.resolveChain() : [];
    this.autoClears += chain.length + cascadeChain.length;
    this.cascadeClears += cascade.length;
    this.longestChain = Math.max(this.longestChain, chain.length + cascadeChain.length);
    if (this.arrows.size === 0) this.status = 'won';
    this.emit();
    return { kind: 'cleared', arrowId, exitPath: check.path, chain, cascade, cascadeChain, won: this.status === 'won' };
  }

  snapshot(): GameSnapshot {
    const won = this.status === 'won';
    return {
      levelId: this.level.id,
      status: this.status,
      moves: this.directClears,
      directClears: this.directClears,
      autoClears: this.autoClears,
      cascadeClears: this.cascadeClears,
      streak: this.tapTimes.length,
      streakAt: this.tapTimes.at(-1) ?? null,
      bonusCooldown: this.cooldown,
      longestChain: this.longestChain,
      mistakes: this.mistakes,
      lives: this.lives,
      remaining: this.arrows.size,
      total: this.level.arrows.length,
      activated: this.activated.size,
      won,
      stars: won ? this.lives : 0,
    };
  }

  /**
   * Calls `listener` for every arrow the rules remove, at the moment it is
   * removed (before any animation): the tapped arrow first (`auto` false), then
   * each chain release (`auto` true). Used for collectibles; rules ignore it.
   */
  onRemove(listener: (arrow: ArrowData, auto: boolean) => void): () => void {
    this.removeListeners.add(listener);
    return () => this.removeListeners.delete(listener);
  }

  /** Subscribes to state changes; the listener is called immediately. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private remove(arrow: ArrowData): void {
    this.grid.remove(arrow);
    this.arrows.delete(arrow.id);
    this.activated.delete(arrow.id);
  }

  /**
   * Releases activated arrows that can now escape, one at a time: always the
   * first escapable one in level-data order, then re-checks, because each
   * release may free another. A plain loop (no recursion) keeps it simple to
   * reason about; it ends because every iteration removes an arrow.
   */
  private resolveChain(): Removal[] {
    const chain: Removal[] = [];
    for (;;) {
      const candidates = [...this.activated]
        .map((id) => this.arrows.get(id)!)
        .sort((a, b) => this.order.get(a.id)! - this.order.get(b.id)!);
      let released: Removal | null = null;
      for (const arrow of candidates) {
        const check = checkExitPath(this.grid, arrow);
        if (check.clear) {
          this.remove(arrow);
          this.removeListeners.forEach((l) => l(arrow, true));
          released = { arrowId: arrow.id, exitPath: check.path };
          break;
        }
      }
      if (!released) return chain;
      chain.push(released);
    }
  }

  /**
   * The streak bonus: the first BONUS_CLEARS normal arrows, in level-data
   * order, that can escape right now. Skipped (empty) when fewer are
   * available, keeping one arrow on the board for the player. Removing an
   * arrow only frees cells, so each one is still removable when its turn comes.
   */
  private resolveBonus(): Removal[] {
    const removable = this.level.arrows.filter((a) => this.arrows.has(a.id) && !this.activated.has(a.id) && checkExitPath(this.grid, a).clear);
    if (removable.length < BONUS_CLEARS || this.arrows.size - 1 < BONUS_CLEARS) return [];
    return removable.slice(0, BONUS_CLEARS).map((arrow) => {
      const check = checkExitPath(this.grid, arrow);
      this.remove(arrow);
      this.removeListeners.forEach((l) => l(arrow, true));
      return { arrowId: arrow.id, exitPath: check.path };
    });
  }

  private resetStreak(): void {
    this.tapTimes = [];
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((l) => l(snapshot));
  }
}
