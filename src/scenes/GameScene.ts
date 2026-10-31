import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { ArrowView } from '../render/ArrowView';
import { GestureTracker, type GestureEvent } from '../render/gestures';
import { chooseArrow, hitOptions } from '../render/hitTest';
import { BoardViewport, maxZoomFor } from '../render/viewport';
import { BoardRenderer } from '../render/BoardRenderer';
import { FxLayer } from '../render/FxLayer';
import { StaticArrowLayer } from '../render/StaticArrowLayer';
import { cellAtPoint, computeBoardLayout, sameLayout, type BoardLayout, type Rect } from '../render/layout';
import type { LevelData, MoveResult } from '../core/types';
import type { FeedbackEvent } from '../app/Feedback';
import { MoveSequencer, StepOwners, type SequenceStep } from './MoveSequencer';

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
  /** The view changed: `zoomed` (show a reset control) and whether this board can zoom at all. */
  onViewChange?: (zoomed: boolean, zoomable: boolean) => void;
}

/** Sliding a held finger this far (in cells, or 1.6× the tap tolerance) from the arrow cancels the tap. */
const CANCEL_DISTANCE = 0.8;
/** A press turns into a pan after this much movement (CSS pixels), when zoomed. */
const PAN_THRESHOLD_CSS = 10;
/** Mouse-wheel zoom per notch (desktop). */
const WHEEL_STEP = 1.15;
/** Pause between the board's win effect starting and the dialog appearing. */
const WIN_DIALOG_DELAY = 600;
/** Pause between the failure effect starting and the Game Over dialog. */
const FAIL_DIALOG_DELAY = 550;
/** Streak-bonus arrows start leaving this far apart, all flying at once. */
const BONUS_STAGGER_MS = 90;
/** The arrows' intro is spread over at most this long, whatever their number. */
const INTRO_SPREAD_MS = 280;

/**
 * Glue between input, game logic and rendering. All rules live in GameState;
 * this scene only translates taps into moves and results into animations.
 *
 * Interaction model:
 * - Pointer down highlights an arrow; pointer up on the same arrow releases it.
 * - Every tap goes to GameState the moment it is released, in tap order, and
 *   is resolved at once (including any chain reaction and streak bonus).
 *   Its animations then play as one sequence (see MoveSequencer), alongside
 *   any still playing: rapid taps are never dropped because an earlier arrow
 *   is still leaving.
 * - Only arrows still on the board (by the rules) can be picked, so a tap
 *   can't land on an arrow that has already left but is still animating or
 *   waiting for its chain step: no duplicate moves, no stale taps.
 * - Each arrow plays one step at a time: a new step on an arrow first settles
 *   the one it interrupts, so every sequence always finishes.
 * - Each exit step hands over when the leaving arrow's tail crosses the grid
 *   edge, so the next chain release follows promptly.
 * - Win and Game Over are triggered only once every sequence has finished.
 * - Restart, level change and resize cancel all sequences (and any press);
 *   the board is then re-synced from GameState, which is always the source of truth.
 *
 * Zoom (large boards only): pinch with two fingers or use the mouse wheel;
 * drag one finger to pan while zoomed. Two-finger gestures and pans never
 * press or release an arrow (see render/gestures.ts). Restart keeps the
 * current view; a new level, a resize or leaving the level fits the board again.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private fx!: FxLayer;
  private arrowLayer!: Phaser.GameObjects.Container;
  /** Resting arrows drawn from one cached texture (see StaticArrowLayer). */
  private staticLayer!: StaticArrowLayer;
  private layout!: BoardLayout;
  private readonly views = new Map<string, ArrowView>();
  /** Arrows already removed from the logic but still animating out. */
  private readonly leaving = new Set<ArrowView>();
  private readonly sequencer = new MoveSequencer();
  /** One step per arrow at a time: a newer step on the same arrow settles the one it interrupts. */
  private readonly owners = new StepOwners<ArrowView>();
  private pressed?: ArrowView;
  /** Set once the win or Game Over sequence has started; no more input after that. */
  private ended = false;
  private endTimer?: Phaser.Time.TimerEvent;
  private readonly viewport = new BoardViewport();
  private readonly gestures = new GestureTracker(PAN_THRESHOLD_CSS * Math.min(window.devicePixelRatio || 1, 3), () => this.viewport.zoomed);

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
    this.staticLayer = new StaticArrowLayer(this, this.arrowLayer);
    this.staticLayer.setLayout(this.layout);
    this.fx = new FxLayer(this, 3);
    this.board.playEntrance();
    this.buildArrows();

    this.configureView();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.handleGestures(this.gestures.down(p.id, p.x, p.y)));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.handleGestures(this.gestures.move(p.id, p.x, p.y)));
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.handleGestures(this.gestures.up(p.id, p.x, p.y)));
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, (p: Phaser.Input.Pointer) => this.handleGestures(this.gestures.up(p.id, p.x, p.y)));
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.cancelGestures());
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy === 0 || !this.viewport.zoomable) return;
      this.viewport.zoomAt({ x: p.x, y: p.y }, this.viewport.zoom * Math.pow(WHEEL_STEP, -Math.sign(dy)));
      this.applyView();
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  update(time: number, delta: number): void {
    this.fx.update(delta);
    this.staticLayer.update(this.views, time);
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

  /** Restarts the current level. Safe to call at any time, including mid-animation. Keeps the current zoom. */
  restartLevel(): void {
    this.state.reset();
    this.rebuild(true);
  }

  /** Switches to another level, replacing every arrow and resizing the board for its grid. The view is fitted. */
  loadLevel(level: LevelData): void {
    this.state.load(level);
    this.rebuild(false);
  }

  /** Back to the fitted view (the Reset zoom control, and leaving a level). */
  resetView(): void {
    this.cancelGestures();
    if (!this.board) return;
    this.viewport.reset();
    this.applyView();
  }

  /** Resets visuals and interaction state to match the (freshly reset) game state. */
  private rebuild(keepView: boolean): void {
    if (!this.board) return; // scene not created yet; create() will build from the fresh state
    this.cancelGestures();
    const next = this.computeLayout(); // the grid size may have changed
    const sameBoard = sameLayout(this.layout, next);
    this.layout = next;
    this.board.setLayout(this.layout);
    this.staticLayer.setLayout(this.layout);
    if (!keepView || !sameBoard) this.configureView();
    this.endTimer?.remove();
    this.endTimer = undefined;
    this.ended = false;
    this.sequencer.cancel();
    this.owners.clear();
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
      const view = new ArrowView(this, data, this.layout, this.arrowLayer, this.fx, index, this.staticLayer);
      view.setActivated(this.state.isActivated(data.id));
      this.views.set(data.id, view);
      view.playIntro(60 + index * stagger);
    });
  }

  private clearViews(): void {
    this.staticLayer.clear();
    this.views.forEach((v) => v.destroy());
    this.views.clear();
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
  }

  // ---------------------------------------------------------------- input

  /** Applies what the gesture tracker made of the pointer events. Coordinates are canvas (screen) pixels. */
  private handleGestures(events: readonly GestureEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'press':
          this.press(e.x, e.y);
          break;
        case 'drag':
          if (this.pressed) {
            const w = this.viewport.screenToWorld(e);
            if (this.pressed.distanceTo(w.x, w.y) > this.cancelDistance()) this.releasePress();
          }
          break;
        case 'cancelPress':
          this.releasePress();
          break;
        case 'release':
          this.release(e.x, e.y);
          break;
        case 'pan':
          if (this.viewport.zoomed) {
            this.viewport.panBy(e.dx, e.dy);
            this.applyView();
          }
          break;
        case 'pinch':
          if (this.viewport.zoomable) {
            this.viewport.zoomAt({ x: e.centerX, y: e.centerY }, this.viewport.zoom * e.scale);
            this.applyView();
          }
          break;
      }
    }
  }

  private press(x: number, y: number): void {
    if (this.ended || !this.state.isPlaying) return;
    this.releasePress();
    // Pressing is allowed while another arrow is still leaving; the move itself
    // is decided on release, by which time the board is usually free again.
    const w = this.viewport.screenToWorld({ x, y });
    const view = this.pickArrow(w.x, w.y);
    if (!view) return;
    this.pressed = view;
    view.setPressed(true);
  }

  private release(x: number, y: number): void {
    const view = this.pressed;
    if (!view) return;
    this.releasePress();
    // Finished or stale taps never reach GameState, so they can't cost a life. Animations
    // still playing don't block: the rules already know the board as it is now.
    if (this.ended || !this.state.isPlaying || !this.views.has(view.data.id) || !this.state.has(view.data.id)) return;
    const w = this.viewport.screenToWorld({ x, y });
    if (view.distanceTo(w.x, w.y) > this.cancelDistance()) return;
    this.attemptMove(view);
  }

  private releasePress(): void {
    this.pressed?.setPressed(false);
    this.pressed = undefined;
  }

  private cancelGestures(): void {
    this.gestures.cancel();
    this.releasePress();
  }

  private cancelDistance(): number {
    return Math.max(this.layout.cellSize * CANCEL_DISTANCE, this.hitOptions().tolerance * 1.6);
  }

  private hitOptions() {
    return hitOptions(this.layout.cellSize, this.layout.pxPerCss, this.viewport.zoom);
  }

  /**
   * Finds the arrow under a point (world pixels). See render/hitTest.ts: an
   * occupied cell wins outright; otherwise the clearly nearest arrow within
   * a fingertip-sized tolerance, and nothing when two are about as close.
   */
  private pickArrow(x: number, y: number): ArrowView | undefined {
    const cell = cellAtPoint(this.layout, x, y);
    const owner = cell ? this.state.arrowIdAt(cell.row, cell.col) : undefined;
    // Arrows the rules have already removed (a chain step still waiting its turn) can't be picked.
    const hits = [...this.views.values()].filter((v) => this.state.has(v.data.id)).map((v) => ({ id: v.data.id, distance: v.distanceTo(x, y) }));
    const id = chooseArrow(owner, hits, this.hitOptions());
    return id === undefined ? undefined : this.views.get(id);
  }

  // ---------------------------------------------------------------- moves

  private attemptMove(view: ArrowView): void {
    const result = this.state.tryMove(view.data.id);
    const steps = this.stepsFor(view, result);
    if (steps.length === 0) return;
    this.sequencer.run(steps, () => this.afterSequence());
  }

  /** A step that animates `view` (see StepOwners: an interrupted earlier step is settled first). */
  private viewStep(view: ArrowView, run: (done: () => void) => void): SequenceStep {
    return this.owners.step(view, run);
  }

  /** Turns a resolved move into the animation steps that show it. */
  private stepsFor(view: ArrowView, result: MoveResult): SequenceStep[] {
    switch (result.kind) {
      case 'cleared': {
        const steps: SequenceStep[] = [this.exitStep(view, {}, { type: 'release' })];
        result.chain.forEach((removal, index) => {
          const released = this.views.get(removal.arrowId);
          if (released) steps.push(this.exitStep(released, { auto: true }, { type: 'chain', index }));
        });
        // Then the streak bonus: its arrows fly off together, slightly staggered,
        // with the same path-following exit as a tapped arrow. Then red arrows it freed.
        const bonus = result.cascade.flatMap((removal, index) => {
          const swept = this.views.get(removal.arrowId);
          return swept ? [this.exitStep(swept, { cascade: true }, { type: 'cascade', index })] : [];
        });
        if (bonus.length > 0) steps.push(this.sequencer.together(bonus, BONUS_STAGGER_MS, (start, ms) => this.time.delayedCall(ms, start)));
        result.cascadeChain.forEach((removal, index) => {
          const released = this.views.get(removal.arrowId);
          if (released) steps.push(this.exitStep(released, { auto: true }, { type: 'chain', index: result.chain.length + index }));
        });
        return steps;
      }

      case 'blocked': {
        if (!result.lifeLost) {
          // Already red and still blocked: a gentle nudge, nothing else.
          return [
            this.viewStep(view, (done) => {
              this.options.onFeedback?.({ type: 'blocked', lifeLost: false });
              view.playNudge(done);
            }),
          ];
        }
        const blocker = this.views.get(result.blockerId);
        // Slide until the tip meets the edge of the blocker's cell: the free
        // cells ahead plus the gap between the resting tip and its cell edge.
        const cell = this.layout.cellSize;
        const travel = result.freePath.length * cell + (0.5 - this.layout.style.tipOffset) * cell;
        return [
          this.viewStep(view, (done) =>
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
          ),
        ];
      }

      case 'ignored':
        return [];
    }
  }

  /** An arrow leaving the board; the step hands over once its tail is off the grid. */
  private exitStep(view: ArrowView, kind: { auto?: boolean; cascade?: boolean }, feedback: FeedbackEvent): SequenceStep {
    return this.viewStep(view, (done) => {
      this.options.onFeedback?.(feedback);
      if (this.pressed === view) this.pressed = undefined; // it may be highlighted while waiting for its turn
      this.views.delete(view.data.id);
      this.leaving.add(view);
      view.playExit({ onLeftBoard: done, onComplete: () => this.leaving.delete(view) }, kind);
    });
  }

  /** After a sequence: once nothing is playing any more, start the win or Game Over sequence if the level ended. */
  private afterSequence(): void {
    if (this.ended || this.sequencer.busy) return;
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
    this.staticLayer.setLayout(this.layout);
    this.configureView(); // a new size or orientation: fit the board again
    this.fx.clear();
    // Pixel paths of arrows mid-exit are stale now; they are already gone
    // logically, so just drop them. Resting arrows re-fit and cancel any bump.
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
    this.views.forEach((v) => v.setLayout(this.layout));
    this.sequencer.cancel();
    this.owners.clear();
    this.releasePress();
    this.syncViewsWithState(); // a chain may have been mid-way: catch the board up with the rules
  }

  private computeLayout(): BoardLayout {
    return computeBoardLayout(this.boardFrame(), this.state.rows, this.state.cols, this.pxPerCss());
  }

  /** Canvas pixels per CSS pixel (the canvas renders at device resolution). */
  private pxPerCss(): number {
    const width = this.game.canvas.getBoundingClientRect().width;
    return width > 0 ? this.scale.width / width : 1;
  }

  /** Sets the zoom limits for the current board and fits it. */
  private configureView(): void {
    const l = this.layout;
    const slot: Rect = { x: l.x, y: l.y, width: l.width, height: l.height };
    this.viewport.configure({ x: 0, y: 0, width: this.scale.width, height: this.scale.height }, slot, maxZoomFor(l.cellSize, l.pxPerCss));
    this.applyView();
  }

  /** Points the Phaser camera at the viewport's transform: screen = view.x + (world − scroll) × zoom. */
  private applyView(): void {
    const cam = this.cameras.main;
    const v = this.viewport.view;
    cam.setViewport(v.x, v.y, v.width, v.height);
    cam.setOrigin(0, 0);
    cam.setZoom(this.viewport.zoom);
    cam.setScroll(this.viewport.scroll.x, this.viewport.scroll.y);
    this.staticLayer?.setZoom(this.viewport.zoom);
    this.options.onViewChange?.(this.viewport.zoomed, this.viewport.zoomable);
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
