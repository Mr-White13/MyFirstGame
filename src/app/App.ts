import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import type { LevelData } from '../core/types';
import { isUnlocked, recordCompletion, type Progress } from '../progress/Progress';
import type { ProgressStorage } from '../progress/ProgressStorage';
import type { GameScene } from '../scenes/GameScene';
import type { CompleteDialog } from '../ui/CompleteDialog';
import type { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Hud } from '../ui/Hud';
import type { LevelSelect } from '../ui/LevelSelect';
import type { Screens } from '../ui/Screens';

export interface AppParts {
  readonly levels: readonly LevelData[];
  readonly storage: ProgressStorage;
  readonly state: GameState;
  readonly scene: GameScene;
  readonly game: Phaser.Game;
  readonly screens: Screens;
  readonly levelSelect: LevelSelect;
  readonly hud: Hud;
  readonly completeDialog: CompleteDialog;
  readonly confirmDialog: ConfirmDialog;
}

/**
 * Navigation and progression: which screen is shown, which level is loaded,
 * and when progress is saved. Game rules stay in GameState, drawing in the
 * scene, and the save format in ProgressStorage.
 *
 * Every navigation runs through `navigate()`, which ignores new requests
 * while one is in progress, so double taps can't stack transitions.
 */
export class App {
  private progress: Progress;
  private navigating = false;
  /** Level unlocked by the most recent completion, shown in the dialog. */
  private lastUnlocked: number | null = null;

  constructor(private readonly parts: AppParts) {
    this.progress = parts.storage.load();
  }

  /** Wires up the UI callbacks and shows the level selection. */
  start(): void {
    const { levelSelect, hud, game } = this.parts;
    levelSelect.onSelect((id) => void this.openLevel(id));
    hud.onBack(() => void this.leaveLevel());
    hud.onRestart(() => this.restartLevel());
    document.addEventListener('keydown', (event) => this.handleKey(event));

    levelSelect.render(this.progress);
    // The game loop only needs to run while its screen is visible; sleeping saves
    // battery. Phaser starts the loop after READY, so sleep after the first frame,
    // and again whenever it auto-resumes on returning to the tab.
    game.events.once(Phaser.Core.Events.POST_RENDER, () => this.syncGameLoop());
    game.events.on(Phaser.Core.Events.VISIBLE, () => this.syncGameLoop());
    void this.parts.screens.show('levels');
  }

  // ------------------------------------------------------------ navigation

  /** Starts a level from scratch. Locked or unknown levels are ignored. */
  openLevel(levelId: number): Promise<void> {
    const level = this.parts.levels[levelId - 1];
    if (!level || !isUnlocked(this.progress, levelId)) return Promise.resolve();
    return this.navigate(async () => {
      this.parts.completeDialog.hide();
      this.parts.confirmDialog.close(false);
      this.parts.scene.loadLevel(level); // replaces every arrow, counter and flag
      this.wakeGame();
      await this.parts.screens.show('game');
    });
  }

  /** Back to level selection, asking first if an unfinished attempt would be lost. */
  async leaveLevel(): Promise<void> {
    if (this.navigating || this.parts.screens.active !== 'game') return;
    const { state, confirmDialog } = this.parts;
    const inProgress = !state.isWon && state.snapshot().moves > 0;
    if (inProgress && !(await confirmDialog.ask())) return;
    await this.showLevelSelect();
  }

  showLevelSelect(): Promise<void> {
    return this.navigate(async () => {
      this.parts.completeDialog.hide();
      this.parts.levelSelect.render(this.progress);
      await this.parts.screens.show('levels');
      this.syncGameLoop();
      this.parts.levelSelect.focusLevel(this.parts.state.levelId);
    });
  }

  /** Restarts only the current level; saved progress is untouched. */
  restartLevel(): void {
    if (this.navigating) return;
    this.parts.completeDialog.hide();
    this.parts.scene.restartLevel();
  }

  // ------------------------------------------------------------ game events

  /** The last arrow is off the board: save immediately, before any animation or dialog. */
  handleLevelSolved(): void {
    const { state, levels, storage } = this.parts;
    const result = recordCompletion(this.progress, state.levelId, state.snapshot().moves, levels.length);
    this.progress = result.progress;
    this.lastUnlocked = result.unlocked;
    storage.save(this.progress);
    this.parts.levelSelect.render(this.progress);
  }

  /** The win effect has played: show the summary dialog. */
  handleCelebrationEnd(): void {
    if (this.parts.screens.active !== 'game') return;
    const { state, levels, completeDialog } = this.parts;
    const snapshot = state.snapshot();
    completeDialog.show({
      levelId: snapshot.levelId,
      levelCount: levels.length,
      moves: snapshot.moves,
      arrows: snapshot.total,
      unlocked: this.lastUnlocked,
    });
  }

  /** Called by the completion dialog's buttons. */
  nextLevel(): void {
    void this.openLevel(this.parts.state.levelId + 1);
  }

  playFromStart(): void {
    void this.openLevel(1);
  }

  /** Read-only view for debugging and tests. */
  get currentProgress(): Progress {
    return this.progress;
  }

  // ------------------------------------------------------------ internals

  private async navigate(action: () => Promise<void>): Promise<void> {
    if (this.navigating) return;
    this.navigating = true;
    document.body.classList.add('is-navigating');
    try {
      await action();
    } finally {
      this.navigating = false;
      document.body.classList.remove('is-navigating');
    }
  }

  /** Waking a loop that Phaser hasn't started yet would start a second animation loop. */
  private wakeGame(): void {
    if (this.parts.game.loop?.started) this.parts.game.loop.wake();
  }

  private syncGameLoop(): void {
    if (this.parts.screens.active === 'game') this.wakeGame();
    else this.parts.game.loop.sleep();
  }

  /** Escape closes the confirmation, or acts as "back" during play (desktop convenience). */
  private handleKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.parts.confirmDialog.isOpen) this.parts.confirmDialog.close(false);
    else if (!this.parts.completeDialog.isOpen) void this.leaveLevel();
  }
}
