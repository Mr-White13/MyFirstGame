import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import type { LevelData } from '../core/types';
import { withAvatar, withCountry, withNickname, type PlayerProfile, type ProfileStorage } from '../profile/Profile';
import { addPlayTime, type AttemptOutcome, type PlayerStats, type StatsStorage } from '../profile/Stats';
import { isUnlocked, type Progress } from '../progress/Progress';
import type { ProgressStorage } from '../progress/ProgressStorage';
import type { GameScene } from '../scenes/GameScene';
import type { CompleteDialog } from '../ui/CompleteDialog';
import { RESET_SETTINGS, RESTART_LEVEL, type ConfirmDialog } from '../ui/ConfirmDialog';
import { prefersReducedMotion } from '../ui/dom';
import type { GameLayout } from '../ui/GameLayout';
import type { GameOverDialog } from '../ui/GameOverDialog';
import type { HomeScreen } from '../ui/HomeScreen';
import type { Hud } from '../ui/Hud';
import type { LevelSelect } from '../ui/LevelSelect';
import type { AvatarPicker, CountryPicker } from '../ui/Pickers';
import type { ProfileScreen } from '../ui/ProfileScreen';
import type { SettingsStore } from '../settings/Settings';
import type { Screens } from '../ui/Screens';
import type { Toast } from '../ui/Toast';
import { applyAttempt, AttemptTracker, type AttemptSummary } from './AttemptTracker';
import { hasProgress, restartNeedsConfirm } from './confirmPolicy';
import type { FeedbackEvent } from './Feedback';
import { NavigationHistory, type ScreenName } from './Navigation';

export interface AppParts {
  readonly levels: readonly LevelData[];
  readonly storage: ProgressStorage;
  readonly profileStorage: ProfileStorage;
  readonly statsStorage: StatsStorage;
  readonly state: GameState;
  readonly scene: GameScene;
  readonly game: Phaser.Game;
  readonly screens: Screens;
  readonly home: HomeScreen;
  readonly levelSelect: LevelSelect;
  readonly profileScreen: ProfileScreen;
  readonly hud: Hud;
  readonly gameLayout: GameLayout;
  readonly completeDialog: CompleteDialog;
  readonly confirmDialog: ConfirmDialog;
  readonly gameOverDialog: GameOverDialog;
  readonly avatarPicker: AvatarPicker;
  readonly countryPicker: CountryPicker;
  readonly toast: Toast;
  readonly settings: SettingsStore;
  /** Sound and haptics for game events (see Feedback). */
  readonly feedback: (event: FeedbackEvent) => void;
}

/** How often the HUD clock is refreshed. The time itself comes from a monotonic clock. */
const CLOCK_REFRESH_MS = 250;

/**
 * Navigation, progression and records: which screen is shown, which level is
 * loaded, when an attempt starts and ends, and when data is saved. Game rules
 * stay in GameState, drawing in the scene, and save formats in the storage
 * modules.
 *
 * Every navigation runs through `navigate()`, which ignores new requests
 * while one is in progress, so double taps can't stack transitions.
 * Every attempt runs through the AttemptTracker, which ends it exactly once.
 */
export class App {
  private progress: Progress;
  private profile: PlayerProfile;
  private stats: PlayerStats;
  private navigating = false;
  private readonly history = new NavigationHistory();
  private readonly attempt = new AttemptTracker();
  private clockTimer = 0;
  /** Results of the most recent completion, shown in the dialog. */
  private lastCompletion: {
    unlocked: number | null;
    newBestStars: boolean;
    newBestTime: boolean;
    bestTimeMs: number;
    timeMs: number;
  } | null = null;

  constructor(private readonly parts: AppParts) {
    this.progress = parts.storage.load();
    this.profile = parts.profileStorage.load();
    this.stats = parts.statsStorage.load();
  }

  /** Wires up the UI callbacks and shows the Home screen. */
  start(): void {
    const { levelSelect, hud, game } = this.parts;
    levelSelect.onSelect((id) => void this.openLevel(id));
    levelSelect.onBack(() => void this.goBack());
    hud.onBack(() => void this.leaveLevel());
    hud.onRestart(() => void this.requestRestart());
    document.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => this.handleVisibility());

    this.renderAll();
    // The game loop only needs to run while its screen is visible; sleeping saves
    // battery. Phaser starts the loop after READY, so sleep after the first frame,
    // and again whenever it auto-resumes on returning to the tab.
    game.events.once(Phaser.Core.Events.POST_RENDER, () => this.syncGameLoop());
    game.events.on(Phaser.Core.Events.VISIBLE, () => this.syncGameLoop());
    if (document.hidden) this.attempt.timer.pause('hidden');
    void this.parts.screens.show(this.history.current);
  }

  // ------------------------------------------------------------ navigation

  showHome(): Promise<void> {
    return this.showMenuScreen('home');
  }

  showLevelSelect(): Promise<void> {
    return this.showMenuScreen('levels');
  }

  showProfile(): Promise<void> {
    return this.showMenuScreen('profile');
  }

  showSettings(): Promise<void> {
    return this.showMenuScreen('settings');
  }

  /** Back to the screen this one was opened from (Home if there is none). */
  goBack(): Promise<void> {
    if (this.navigating) return Promise.resolve();
    const target = this.history.backTarget;
    return this.showMenuScreen(target === 'game' ? 'home' : target);
  }

  /** Starts a level from scratch. Locked or unknown levels are ignored. */
  openLevel(levelId: number): Promise<void> {
    const level = this.parts.levels[levelId - 1];
    if (!level || !isUnlocked(this.progress, levelId)) return Promise.resolve();
    return this.navigate(async () => {
      this.endAttempt('abandoned'); // a previous attempt still open counts as abandoned
      this.hideEndDialogs();
      this.parts.confirmDialog.close(false);
      this.parts.gameLayout.setGrid(level.rows, level.cols); // size the slot before the board is fitted into it
      this.parts.scene.loadLevel(level); // replaces every arrow, counter and flag
      this.attempt.begin(level.id, level.revision ?? 1);
      this.parts.hud.setTime(0);
      this.wakeGame();
      this.history.go('game');
      await this.parts.screens.show('game');
      // Only now is the level interactive: loading and the screen transition don't count.
      this.attempt.interactive();
      this.startClock();
    });
  }

  /** Back from gameplay, asking first if an unfinished attempt would be lost. */
  async leaveLevel(): Promise<void> {
    if (this.navigating || this.parts.screens.active !== 'game') return;
    const { state, confirmDialog } = this.parts;
    const snapshot = state.snapshot();
    // Only an unfinished attempt with something to lose needs confirming.
    if (hasProgress(snapshot, state.isPlaying)) {
      // Answering the question isn't play time: pause the clock while it is open.
      this.attempt.timer.pause('confirm');
      const leave = await confirmDialog.ask();
      this.attempt.timer.resume('confirm');
      if (!leave) return;
    }
    await this.goBack();
  }

  /**
   * The HUD's restart button. With "Confirm restart" on, an attempt with
   * moves or mistakes asks first; an untouched level restarts at once.
   */
  async requestRestart(): Promise<void> {
    if (this.navigating || this.parts.screens.active !== 'game') return;
    const { state, confirmDialog, settings } = this.parts;
    const snapshot = state.snapshot();
    if (restartNeedsConfirm(snapshot, state.isPlaying, settings.current.confirmRestart)) {
      this.attempt.timer.pause('confirm');
      const restart = await confirmDialog.ask(RESTART_LEVEL);
      this.attempt.timer.resume('confirm');
      // The level may have changed or ended while the question was open.
      if (!restart || this.parts.screens.active !== 'game' || this.parts.state.levelId !== snapshot.levelId) return;
    }
    this.restartLevel();
  }

  /** Restarts only the current level; saved progress is untouched. */
  restartLevel(): void {
    if (this.navigating) return;
    this.endAttempt('abandoned'); // no-op if the attempt already ended (won or lost)
    this.hideEndDialogs();
    const levelId = this.parts.state.levelId;
    this.parts.scene.restartLevel(); // full lives, no red arrows, counters at zero
    this.attempt.begin(levelId, this.parts.levels[levelId - 1]?.revision ?? 1);
    this.attempt.interactive(); // the board is already on screen
    this.parts.hud.setTime(0);
  }

  // ------------------------------------------------------------ game events

  /** The last arrow is off the board: stop the clock and save immediately, before any dialog. */
  handleLevelSolved(): void {
    const summary = this.attempt.finish('won', this.parts.state.snapshot());
    if (!summary) return;
    const { records, completion } = applyAttempt({ progress: this.progress, stats: this.stats }, summary, this.parts.levels.length);
    this.progress = records.progress;
    this.stats = records.stats;
    this.parts.storage.save(this.progress);
    this.parts.statsStorage.save(this.stats);
    this.lastCompletion = completion && {
      unlocked: completion.unlocked,
      newBestStars: completion.newBestStars,
      newBestTime: completion.newBestTime,
      bestTimeMs: completion.bestTimeMs,
      timeMs: summary.timeMs,
    };
    this.parts.hud.setTime(summary.timeMs);
    this.renderAll();
    this.parts.feedback({ type: 'complete' });
  }

  /** The win effect has played: show the summary dialog. */
  handleCelebrationEnd(): void {
    if (this.parts.screens.active !== 'game' || !this.lastCompletion) return;
    const snapshot = this.parts.state.snapshot();
    const c = this.lastCompletion;
    this.parts.completeDialog.show({
      levelId: snapshot.levelId,
      levelCount: this.parts.levels.length,
      arrows: snapshot.total,
      stars: snapshot.stars,
      directClears: snapshot.directClears,
      autoClears: snapshot.autoClears,
      mistakes: snapshot.mistakes,
      timeMs: c.timeMs,
      bestTimeMs: c.bestTimeMs,
      newBestTime: c.newBestTime,
      newBestStars: c.newBestStars,
      unlocked: c.unlocked,
    });
    this.parts.feedback({ type: 'stars', stars: snapshot.stars, unlocked: c.unlocked !== null, reduced: prefersReducedMotion() });
  }

  /** The last life is gone: stop the clock and count the failed attempt. Progress is untouched. */
  handleLevelLost(): void {
    const summary = this.attempt.finish('failed', this.parts.state.snapshot());
    if (summary) this.parts.hud.setTime(summary.timeMs);
    this.recordEnded(summary);
    this.parts.feedback({ type: 'gameOver' });
  }

  /** The failure feedback has played: show Game Over. */
  handleLevelFailed(): void {
    if (this.parts.screens.active !== 'game') return;
    const snapshot = this.parts.state.snapshot();
    this.parts.gameOverDialog.show({
      levelId: snapshot.levelId,
      cleared: snapshot.total - snapshot.remaining,
      total: snapshot.total,
      mistakes: snapshot.mistakes,
    });
  }

  /** Called by the completion dialog's buttons. */
  nextLevel(): void {
    void this.openLevel(this.parts.state.levelId + 1);
  }

  playFromStart(): void {
    void this.openLevel(1);
  }

  // ------------------------------------------------------------ profile

  renameTo(nickname: string): void {
    this.updateProfile(withNickname(this.profile, nickname));
  }

  chooseAvatar(): void {
    this.parts.avatarPicker.open(this.profile.avatar, (id) => this.updateProfile(withAvatar(this.profile, id)));
  }

  chooseCountry(): void {
    this.parts.countryPicker.open(this.profile.country, (code) => this.updateProfile(withCountry(this.profile, code)));
  }

  /** Asks, then puts every setting back to its default. Progress, profile and statistics are separate and untouched. */
  async resetSettings(): Promise<void> {
    if (this.parts.screens.active !== 'settings') return;
    if (!(await this.parts.confirmDialog.ask(RESET_SETTINGS))) return;
    if (this.parts.settings.reset()) this.parts.toast.show('Settings reset');
  }

  comingSoon(feature: string): void {
    this.parts.toast.show(`${feature}: coming soon`);
  }

  /** Read-only views for debugging and tests. */
  get currentProgress(): Progress {
    return this.progress;
  }

  get currentStats(): PlayerStats {
    return this.stats;
  }

  get currentProfile(): PlayerProfile {
    return this.profile;
  }

  get timer() {
    return this.attempt.timer;
  }

  get screen(): ScreenName {
    return this.history.current;
  }

  // ------------------------------------------------------------ internals

  private showMenuScreen(screen: Exclude<ScreenName, 'game'>): Promise<void> {
    return this.navigate(async () => {
      this.endAttempt('abandoned'); // leaving gameplay: the timer can't keep running
      this.stopClock();
      this.hideEndDialogs();
      this.renderAll();
      this.history.go(screen);
      await this.parts.screens.show(screen);
      this.syncGameLoop();
      if (screen === 'levels') this.parts.levelSelect.focusLevel(this.parts.state.levelId);
    });
  }

  private updateProfile(profile: PlayerProfile): void {
    if (profile === this.profile) return;
    this.profile = profile;
    this.parts.profileStorage.save(profile);
    this.renderAll();
  }

  /** Ends the open attempt (if any) with the given outcome and saves the statistics. */
  private endAttempt(outcome: AttemptOutcome): void {
    this.recordEnded(this.attempt.finish(outcome, this.parts.state.snapshot()));
  }

  private recordEnded(summary: AttemptSummary | null): void {
    if (!summary) return;
    const { records } = applyAttempt({ progress: this.progress, stats: this.stats }, summary, this.parts.levels.length);
    this.stats = records.stats; // a failed or abandoned attempt never changes progress
    this.parts.statsStorage.save(this.stats);
  }

  private renderAll(): void {
    this.parts.home.render(this.profile, this.progress);
    this.parts.levelSelect.render(this.progress);
    this.parts.profileScreen.render(this.profile, this.progress, this.stats);
  }

  private hideEndDialogs(): void {
    this.parts.completeDialog.hide();
    this.parts.gameOverDialog.hide();
  }

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

  /** Refreshes the HUD clock while the game screen is shown. */
  private startClock(): void {
    this.stopClock();
    this.clockTimer = window.setInterval(() => this.parts.hud.setTime(this.attempt.timer.elapsed()), CLOCK_REFRESH_MS);
  }

  private stopClock(): void {
    window.clearInterval(this.clockTimer);
    this.clockTimer = 0;
  }

  /**
   * Hidden tab or backgrounded app: pause the clock and save the play time so
   * far, because the page may never come back. Visible again: resume.
   */
  private handleVisibility(): void {
    if (document.hidden) {
      this.attempt.timer.pause('hidden');
      const played = this.attempt.checkpoint();
      if (played > 0) {
        this.stats = addPlayTime(this.stats, played);
        this.parts.statsStorage.save(this.stats);
      }
    } else {
      this.attempt.timer.resume('hidden');
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

  /** Escape: closes the topmost dialog or picker, otherwise acts as "back" (desktop convenience). */
  private handleKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    const { confirmDialog, completeDialog, gameOverDialog, avatarPicker, countryPicker, profileScreen, screens } = this.parts;
    if (confirmDialog.isOpen) confirmDialog.close(false);
    else if (avatarPicker.isOpen) avatarPicker.close();
    else if (countryPicker.isOpen) countryPicker.close();
    else if (completeDialog.isOpen || gameOverDialog.isOpen || profileScreen.isEditing) return;
    else if (screens.active === 'game') void this.leaveLevel();
    else if (screens.active !== 'home') void this.goBack();
  }
}
