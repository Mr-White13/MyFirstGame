import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { ArrowView } from '../render/ArrowView';
import { BoardRenderer } from '../render/BoardRenderer';
import { cellAtPoint, computeBoardLayout, type BoardLayout } from '../render/layout';

export interface GameSceneOptions {
  /** Called once the last arrow has finished leaving the board. */
  onLevelComplete: () => void;
}

/**
 * Glue between input, game logic and rendering. All rules live in GameState;
 * this scene only translates taps into moves and results into animations.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private arrowLayer!: Phaser.GameObjects.Container;
  private layout!: BoardLayout;
  private readonly views = new Map<string, ArrowView>();
  /** Arrows already removed from the logic but still animating out. */
  private readonly leaving = new Set<ArrowView>();

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
    this.buildArrows(true);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  /** Resets the logic and rebuilds every arrow. Safe to call mid-animation. */
  restartLevel(): void {
    this.state.reset();
    if (!this.board) return; // scene not created yet; create() will build from the fresh state
    this.clearViews();
    this.board.setWon(false);
    this.buildArrows(true);
  }

  private buildArrows(withIntro: boolean): void {
    this.state.getArrows().forEach((data, index) => {
      const view = new ArrowView(this, data, this.layout, this.arrowLayer);
      this.views.set(data.id, view);
      if (withIntro) view.playIntro(index * 35);
    });
  }

  private clearViews(): void {
    this.views.forEach((v) => v.destroy());
    this.views.clear();
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const cell = cellAtPoint(this.layout, pointer.x, pointer.y);
    if (!cell) return;
    const arrowId = this.state.arrowIdAt(cell.row, cell.col);
    if (arrowId === undefined) return;
    const view = this.views.get(arrowId);
    if (!view || view.isBusy) return;

    const result = this.state.tryMove(arrowId);
    switch (result.kind) {
      case 'cleared': {
        this.views.delete(arrowId);
        this.leaving.add(view);
        view.playExit(() => {
          this.leaving.delete(view);
          this.completeIfDone();
        });
        break;
      }
      case 'blocked':
        view.playBlocked(result.freePath.length);
        this.views.get(result.blockerId)?.flashAsBlocker();
        break;
      case 'ignored':
        break;
    }
  }

  private handleResize(): void {
    this.layout = this.computeLayout();
    this.board.setLayout(this.layout);
    // Pixel paths of arrows mid-exit are stale now; they are already gone
    // logically, so just drop them.
    const hadLeaving = this.leaving.size > 0;
    this.leaving.forEach((v) => v.destroy());
    this.leaving.clear();
    this.views.forEach((v) => v.setLayout(this.layout));
    if (hadLeaving) this.completeIfDone();
  }

  /** Celebrates once the logic says "won" and the last exit animation has ended. */
  private completeIfDone(): void {
    if (!this.state.isWon || this.leaving.size > 0) return;
    this.board.setWon(true);
    this.options.onLevelComplete();
  }

  private computeLayout(): BoardLayout {
    return computeBoardLayout(this.scale.width, this.scale.height, this.state.rows, this.state.cols);
  }
}
