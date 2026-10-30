import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { ARROW_STYLE } from '../render/theme';
import { ArrowView } from '../render/ArrowView';
import { BoardRenderer } from '../render/BoardRenderer';
import { FxLayer } from '../render/FxLayer';
import { cellAtPoint, computeBoardLayout, sameLayout, type BoardLayout, type Rect } from '../render/layout';
import type { LevelData } from '../core/types';

export interface GameSceneOptions {
  /**
   * The DOM element that reserves the board's place in the page layout. The
   * canvas covers the whole game screen; the board is fitted into this slot.
   */
  boardSlot: HTMLElement;
  /**
   * Called exactly once per play-through, the moment the last arrow leaves the
   * grid. Use it for anything that must not be lost (saving progress).
   */
  onLevelSolved: () => void;
  /** Called once the board's win effect has had a moment to play: time to show the summary. */
  onCelebrationEnd: () => void;
}

/** How far outside an arrow's body a tap still counts, in cells. */
const TAP_TOLERANCE = 0.45;
/** Sliding a held finger this far (in cells) from the arrow cancels the tap. */
const CANCEL_DISTANCE = 0.8;
/** Pause between the board's win effect starting and the dialog appearing. */
const WIN_DIALOG_DELAY = 600;
/** The arrows' intro is spread over at most this long, whatever their number. */
const INTRO_SPREAD_MS = 280;

/**
 * Glue between input, game logic and rendering. All rules live in GameState;
 * this scene only translates taps into moves and results into animations.
 *
 * Interaction model:
 * - Pointer down highlights an arrow; pointer up on the same arrow releases it.
 * - Only one arrow moves at a time. While an arrow is still on the grid (or a
 *   blocked bump is playing) new moves are ignored. The lock lifts as soon as
 *   the leaving arrow's tail crosses the grid edge, so quick play stays fluid.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private fx!: FxLayer;
  private arrowLayer!: Phaser.GameObjects.Container;
  private layout!: BoardLayout;
  private readonly views = new Map<string, ArrowView>();
  /** Arrows already removed from the logic but still animating out. */
  private readonly leaving = new Set<ArrowView>();
  /** The arrow whose animation currently blocks input, if any. */
  private lockOwner?: ArrowView;
  private pressed?: ArrowView;
  private completed = false;
  private winTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly state: GameState,
    private readonly options: GameSceneOptions,
  ) {
    super('game');
  }

  create(): void {
    this.layout = this.computeLayout();
    this.board = new BoardRenderer(this);
    this.board.setLayout(this.layout);
    this.arrowLayer = this.add.container(0, 0).setDepth(1);
    this.fx = new FxLayer(this, 3);
    this.board.playEntrance();
    this.buildArrows();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.releasePress, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.releasePress, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  update(_time: number, delta: number): void {
    this.fx.update(delta);
  }

  /**
   * Re-fits the board to its slot. Called when the page layout around the
   * board changes; does nothing if the board would end up in the same place.
   */
  relayout(): void {
    if (!this.board) return;
    const next = this.computeLayout();
    if (sameLayout(this.layout, next)) return;
    this.applyLayout(next);
  }

  /** Restarts the current level. Safe to call at any time, including mid-animation. */
  restartLevel(): void {
    this.state.reset();
    this.rebuild();
  }

  /** Switches to another level, replacing every arrow and resizing the board for its grid. */
  loadLevel(level: LevelData): void {
    this.state.load(level);
    this.rebuild();
  }

  /** Resets visuals and interaction state to match the (freshly reset) game state. */
  private rebuild(): void {
    if (!this.board) return; // scene not created yet; create() will build from the fresh state
    this.layout = this.computeLayout(); // the grid size may have changed
    this.board.setLayout(this.layout);
    this.winTimer?.remove();
    this.winTimer = undefined;
    this.completed = false;
    this.lockOwner = undefined;
    this.pressed = undefined;
    this.clearViews();
    this.fx.clear();
    this.board.reset();
    this.board.playEntrance();
    this.buildArrows();
  }

  private buildArrows(): void {
    const arrows = this.state.getArrows();
    const stagger = Math.min(30, INTRO_SPREAD_MS / Math.max(1, arrows.length));
    arrows.forEach((data, index) => {
      const view = new ArrowView(this, data, this.layout, this.arrowLayer, this.fx);
      this.views.set(data.id, view);
      view.playIntro(60 + index * stagger);
    });
  }

  private clearViews(): void {
    this.views.forEach((v) => v.destroy());
    this.views.clear();
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
  }

  // ---------------------------------------------------------------- input

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.completed) return;
    this.releasePress();
    // Pressing is allowed while another arrow is still leaving; the move itself
    // is decided on release, by which time the board is usually free again.
    const view = this.pickArrow(pointer.x, pointer.y);
    if (!view) return;
    this.pressed = view;
    view.setPressed(true);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.pressed && this.pressed.distanceTo(pointer.x, pointer.y) > this.layout.cellSize * CANCEL_DISTANCE) {
      this.releasePress();
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const view = this.pressed;
    if (!view) return;
    this.releasePress();
    if (this.lockOwner || this.completed || !this.views.has(view.data.id)) return;
    if (view.distanceTo(pointer.x, pointer.y) > this.layout.cellSize * CANCEL_DISTANCE) return;
    this.attemptMove(view);
  }

  private releasePress(): void {
    this.pressed?.setPressed(false);
    this.pressed = undefined;
  }

  /**
   * Finds the arrow under a point. Occupied cells win outright; otherwise the
   * nearest arrow body within a small tolerance is used, which covers the
   * arrowhead (it pokes into the next cell) and slightly missed taps.
   */
  private pickArrow(x: number, y: number): ArrowView | undefined {
    const cell = cellAtPoint(this.layout, x, y);
    if (cell) {
      const id = this.state.arrowIdAt(cell.row, cell.col);
      if (id !== undefined) return this.views.get(id);
    }
    let best: ArrowView | undefined;
    let bestDistance = this.layout.cellSize * TAP_TOLERANCE;
    for (const view of this.views.values()) {
      const d = view.distanceTo(x, y);
      if (d < bestDistance) {
        best = view;
        bestDistance = d;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- moves

  private attemptMove(view: ArrowView): void {
    const result = this.state.tryMove(view.data.id);
    switch (result.kind) {
      case 'cleared':
        this.views.delete(view.data.id);
        this.leaving.add(view);
        this.lockOwner = view;
        view.playExit({
          onLeftBoard: () => {
            this.unlock(view);
            this.completeIfDone();
          },
          onComplete: () => this.leaving.delete(view),
        });
        break;

      case 'blocked': {
        const blocker = this.views.get(result.blockerId);
        // Slide until the tip meets the edge of the blocker's cell: the free
        // cells ahead plus the gap between the resting tip and its cell edge.
        const cell = this.layout.cellSize;
        const travel = result.freePath.length * cell + (0.5 - ARROW_STYLE.tipOffset) * cell;
        this.lockOwner = view;
        view.playBlocked(travel, {
          onImpact: () => blocker?.playHit(view.data.direction),
          onComplete: () => this.unlock(view),
        });
        break;
      }

      case 'ignored':
        break;
    }
  }

  private unlock(owner: ArrowView): void {
    // Only the animation that took the lock may release it; a stale callback
    // from before a restart or resize must not unlock a newer move.
    if (this.lockOwner === owner) this.lockOwner = undefined;
  }

  /** Starts the win sequence once the logic says "won" and the last arrow is off the grid. */
  private completeIfDone(): void {
    if (this.completed || !this.state.isWon || this.lockOwner) return;
    this.completed = true;
    this.options.onLevelSolved();
    this.board.playWin();
    this.winTimer = this.time.delayedCall(WIN_DIALOG_DELAY, () => {
      this.winTimer = undefined;
      this.options.onCelebrationEnd();
    });
  }

  // ---------------------------------------------------------------- layout

  private handleResize(): void {
    this.relayout();
  }

  private applyLayout(layout: BoardLayout): void {
    this.layout = layout;
    this.board.setLayout(this.layout);
    this.fx.clear();
    // Pixel paths of arrows mid-exit are stale now; they are already gone
    // logically, so just drop them. Resting arrows re-fit and cancel any bump.
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
    this.views.forEach((v) => v.setLayout(this.layout));
    this.lockOwner = undefined;
    this.releasePress();
    this.completeIfDone(); // in case the last arrow was mid-exit
  }

  private computeLayout(): BoardLayout {
    return computeBoardLayout(this.boardFrame(), this.state.rows, this.state.cols);
  }

  /** The board slot's rectangle in canvas (device) pixels; the whole canvas if the slot isn't laid out. */
  private boardFrame(): Rect {
    const canvas = this.game.canvas.getBoundingClientRect();
    const slot = this.options.boardSlot.getBoundingClientRect();
    if (canvas.width === 0 || slot.width === 0 || slot.height === 0) {
      return { x: 0, y: 0, width: this.scale.width, height: this.scale.height };
    }
    const ratio = this.scale.width / canvas.width;
    return {
      x: (slot.left - canvas.left) * ratio,
      y: (slot.top - canvas.top) * ratio,
      width: slot.width * ratio,
      height: slot.height * ratio,
    };
  }
}
