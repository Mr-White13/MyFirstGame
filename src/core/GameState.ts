import { Grid } from './Grid';
import { validateLevel } from './levelValidation';
import { checkExitPath } from './PathChecker';
import {
  STARTING_LIVES,
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
  private readonly validate: boolean;
  private readonly startingLives: number;
  private status: LevelStatus = 'playing';
  private directClears = 0;
  private autoClears = 0;
  private longestChain = 0;
  private mistakes = 0;

  constructor(level: LevelData, options: GameStateOptions = {}) {
    this.validate = options.validate ?? true;
    this.startingLives = options.startingLives ?? STARTING_LIVES;
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
    this.longestChain = 0;
    this.mistakes = 0;
    this.emit();
  }

  /** Handles a player tap on an arrow. See the class comment for the rules. */
  tryMove(arrowId: string): MoveResult {
    if (this.status !== 'playing') return { kind: 'ignored', reason: 'level-over' };
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { kind: 'ignored', reason: 'unknown-arrow' };

    const check = checkExitPath(this.grid, arrow);
    if (!check.clear) {
      const blocked = { kind: 'blocked' as const, arrowId, blockerId: check.blockerId!, freePath: check.path };
      if (this.activated.has(arrowId)) return { ...blocked, lifeLost: false, failed: false };
      this.activated.add(arrowId);
      this.mistakes++;
      if (this.lives === 0) this.status = 'failed';
      this.emit();
      return { ...blocked, lifeLost: true, failed: this.status === 'failed' };
    }

    this.remove(arrow);
    this.directClears++;
    const chain = this.resolveChain();
    this.autoClears += chain.length;
    this.longestChain = Math.max(this.longestChain, chain.length);
    if (this.arrows.size === 0) this.status = 'won';
    this.emit();
    return { kind: 'cleared', arrowId, exitPath: check.path, chain, won: this.status === 'won' };
  }

  snapshot(): GameSnapshot {
    const won = this.status === 'won';
    return {
      levelId: this.level.id,
      status: this.status,
      moves: this.directClears,
      directClears: this.directClears,
      autoClears: this.autoClears,
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
          released = { arrowId: arrow.id, exitPath: check.path };
          break;
        }
      }
      if (!released) return chain;
      chain.push(released);
    }
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((l) => l(snapshot));
  }
}
