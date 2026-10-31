import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { ARROW_STYLE } from '../render/theme';
import { ArrowView } from '../render/ArrowView';
import { BoardRenderer } from '../render/BoardRenderer';
import { FxLayer } from '../render/FxLayer';
import { cellAtPoint, computeBoardLayout, sameLayout, type BoardLayout, type Rect } from '../render/layout';
import type { LevelData, MoveResult } from '../core/types';
import type { FeedbackEvent } from '../app/Feedback';
import { MoveSequencer, type SequenceStep } from './MoveSequencer';

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
  /**
   * Called exactly once per play-through, the moment the failure sequence
   * starts (after the losing tap's feedback): stop timing, record the attempt.
   */
  onLevelLost: () => void;
  /** Called once, after the last life is lost and its feedback has played: time to show Game Over. */
  onLevelFailed: () => void;
  /** Sound and haptic cues for what the player sees: releases, collisions, chain reactions. */
  onFeedback?: (event: FeedbackEvent) => void;
}

/** How far outside an arrow's body a tap still counts, in cells. */
const TAP_TOLERANCE = 0.45;
/** Sliding a held finger this far (in cells) from the arrow cancels the tap. */
const CANCEL_DISTANCE = 0.8;
/** Pause between the board's win effect starting and the dialog appearing. */
const WIN_DIALOG_DELAY = 600;
/** Pause between the failure effect starting and the Game Over dialog. */
const FAIL_DIALOG_DELAY = 550;
/** The arrows' intro is spread over at most this long, whatever their number. */
const INTRO_SPREAD_MS = 280;

/**
 * Glue between input, game logic and rendering. All rules live in GameState;
 * this scene only translates taps into moves and results into animations.
 *
 * Interaction model:
 * - Pointer down highlights an arrow; pointer up on the same arrow releases it.
 * - GameState resolves the whole move at once (including any chain reaction);
 *   the scene then plays its animations as one sequence (see MoveSequencer).
 *   While a sequence plays, taps are ignored before they reach GameState, so
 *   an ignored tap can never cost a life.
 * - Each exit step hands over when the leaving arrow's tail crosses the grid
 *   edge, so the next chain release (or the next tap) follows promptly.
 * - Win and Game Over are triggered only after the sequence has finished.
 * - Restart, level change and resize cancel the sequence; the board is then
 *   re-synced from GameState, which is always the source of truth.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private fx!: FxLayer;
  private arrowLayer!: Phaser.GameObjects.Container;
  private layout!: BoardLayout;
  private readonly views = new Map<string, ArrowView>();
  /** Arrows already removed from the logic but still animating out. */
  private readonly leaving = new Set<ArrowView>();
  private readonly sequencer = new MoveSequencer();
  private pressed?: ArrowView;
  /** Set once the win or Game Over sequence has started; no more input after that. */
  private ended = false;
  private endTimer?: Phaser.Time.TimerEvent;

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

  /**
   * Redraws the board and every arrow in the active theme. Nothing is rebuilt:
   * arrows, animations, input and game state carry on untouched.
   */
  refreshTheme(): void {
    if (!this.board) return;
    this.board.refreshTheme();
    this.views.forEach((v) => v.refreshTheme());
    this.leaving.forEach((v) => v.refreshTheme());
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
    this.endTimer?.remove();
    this.endTimer = undefined;
    this.ended = false;
    this.sequencer.cancel();
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
      const view = new ArrowView(this, data, this.layout, this.arrowLayer, this.fx, index);
      view.setActivated(this.state.isActivated(data.id));
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
    if (this.ended || !this.state.isPlaying) return;
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
    // Locked, finished or stale taps never reach GameState, so they can't cost a life.
    if (this.sequencer.busy || this.ended || !this.state.isPlaying || !this.views.has(view.data.id)) return;
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
    const steps = this.stepsFor(view, result);
    if (steps.length === 0) return;
    this.sequencer.run(steps, () => this.afterSequence());
  }

  /** Turns a resolved move into the animation steps that show it. */
  private stepsFor(view: ArrowView, result: MoveResult): SequenceStep[] {
    switch (result.kind) {
      case 'cleared': {
        const steps: SequenceStep[] = [this.exitStep(view, false, { type: 'release' })];
        result.chain.forEach((removal, index) => {
          const released = this.views.get(removal.arrowId);
          if (released) steps.push(this.exitStep(released, true, { type: 'chain', index }));
        });
        return steps;
      }

      case 'blocked': {
        if (!result.lifeLost) {
          // Already red and still blocked: a gentle nudge, nothing else.
          return [
            {
              run: (done) => {
                this.options.onFeedback?.({ type: 'blocked', lifeLost: false });
                view.playNudge(done);
              },
            },
          ];
        }
        const blocker = this.views.get(result.blockerId);
        // Slide until the tip meets the edge of the blocker's cell: the free
        // cells ahead plus the gap between the resting tip and its cell edge.
        const cell = this.layout.cellSize;
        const travel = result.freePath.length * cell + (0.5 - ARROW_STYLE.tipOffset) * cell;
        return [
          {
            run: (done) =>
              view.playBlocked(
                travel,
                {
                  onImpact: () => {
                    blocker?.playHit(view.data.direction);
                    this.options.onFeedback?.({ type: 'blocked', lifeLost: true });
                  },
                  onComplete: done,
                },
                { activate: true },
              ),
          },
        ];
      }

      case 'ignored':
        return [];
    }
  }

  /** An arrow leaving the board; the step hands over once its tail is off the grid. */
  private exitStep(view: ArrowView, auto: boolean, feedback: FeedbackEvent): SequenceStep {
    return {
      run: (done) => {
        this.options.onFeedback?.(feedback);
        if (this.pressed === view) this.pressed = undefined; // it may be highlighted while waiting for its turn
        this.views.delete(view.data.id);
        this.leaving.add(view);
        view.playExit({ onLeftBoard: done, onComplete: () => this.leaving.delete(view) }, { auto });
      },
    };
  }

  /** After a sequence: start the win or Game Over sequence if the move ended the level. */
  private afterSequence(): void {
    if (this.ended) return;
    if (this.state.isWon) this.beginWin();
    else if (this.state.isFailed) this.beginFailure();
  }

  private beginWin(): void {
    this.ended = true;
    this.releasePress();
    this.options.onLevelSolved();
    this.board.playWin();
    this.endTimer = this.time.delayedCall(WIN_DIALOG_DELAY, () => {
      this.endTimer = undefined;
      this.options.onCelebrationEnd();
    });
  }

  private beginFailure(): void {
    this.ended = true;
    this.releasePress();
    this.options.onLevelLost();
    this.board.playFailure();
    this.endTimer = this.time.delayedCall(FAIL_DIALOG_DELAY, () => {
      this.endTimer = undefined;
      this.options.onLevelFailed();
    });
  }

  /**
   * Makes the board match GameState after animations were cut short: drops
   * views of arrows that are already gone, recolours activated ones, and
   * starts the end sequence if the level is over.
   */
  private syncViewsWithState(): void {
    const present = new Set(this.state.getArrows().map((a) => a.id));
    for (const [id, view] of this.views) {
      if (!present.has(id)) {
        view.destroy();
        this.views.delete(id);
      } else {
        view.setActivated(this.state.isActivated(id));
      }
    }
    this.afterSequence();
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
    this.sequencer.cancel();
    this.releasePress();
    this.syncViewsWithState(); // a chain may have been mid-way: catch the board up with the rules
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
