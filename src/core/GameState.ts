import { Grid } from './Grid';
import { validateLevel } from './levelValidation';
import { checkExitPath } from './PathChecker';
import type { ArrowData, GameSnapshot, LevelData, MoveResult } from './types';

type Listener = (snapshot: GameSnapshot) => void;

/**
 * Authoritative state for the level being played. Knows nothing about
 * rendering: the scene asks it to attempt moves and reacts to the returned
 * result. `load()` switches to another level and resets everything.
 */
export class GameState {
  private level: LevelData;
  private grid: Grid;
  private readonly arrows = new Map<string, ArrowData>();
  private readonly listeners = new Set<Listener>();
  private moves = 0;

  constructor(level: LevelData) {
    validateLevel(level);
    this.level = level;
    this.grid = new Grid(level.rows, level.cols);
    this.reset();
  }

  /** Switches to another level (validated first) and starts it fresh. */
  load(level: LevelData): void {
    validateLevel(level);
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
    return this.arrows.size === 0;
  }

  /** Arrows still on the board. */
  getArrows(): ArrowData[] {
    return [...this.arrows.values()];
  }

  arrowIdAt(row: number, col: number): string | undefined {
    return this.grid.occupantAt({ row, col });
  }

  reset(): void {
    this.grid.clear();
    this.arrows.clear();
    for (const arrow of this.level.arrows) {
      this.grid.place(arrow);
      this.arrows.set(arrow.id, arrow);
    }
    this.moves = 0;
    this.emit();
  }

  /**
   * Attempts to release an arrow. Only successful moves are counted; a blocked
   * attempt is free so the player is not punished for probing the board.
   */
  tryMove(arrowId: string): MoveResult {
    if (this.isWon) return { kind: 'ignored', reason: 'game-over' };
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { kind: 'ignored', reason: 'unknown-arrow' };

    const check = checkExitPath(this.grid, arrow);
    if (!check.clear) {
      return { kind: 'blocked', arrowId, blockerId: check.blockerId!, freePath: check.path };
    }

    this.grid.remove(arrow);
    this.arrows.delete(arrowId);
    this.moves++;
    this.emit();
    return { kind: 'cleared', arrowId, exitPath: check.path };
  }

  snapshot(): GameSnapshot {
    return {
      levelId: this.level.id,
      moves: this.moves,
      remaining: this.arrows.size,
      total: this.level.arrows.length,
      won: this.isWon,
    };
  }

  /** Subscribes to state changes; the listener is called immediately. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((l) => l(snapshot));
  }
}
