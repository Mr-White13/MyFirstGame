import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import type { LevelData } from '../core/types';
import { withAvatar, withCountry, withNickname, type PlayerProfile, type ProfileStorage } from '../profile/Profile';
import type { AttemptOutcome, PlayerStats, StatsStorage } from '../profile/Stats';
import { completedCount, isCompleted, nextLevelToPlay, type Progress } from '../progress/Progress';
import { cosmeticById, type CosmeticId, type CosmeticSlot } from '../shop/catalog';
import { purchaseMessage, purchaseQuestion, type ShopScreen } from '../ui/ShopScreen';
import { canPlayLevel, isTestPlay } from '../progress/testUnlock';
import { ENERGY_PER_CHALLENGE, MAX_DAILY_POINTS, type DailyChallenge } from '../league/challenges';
import { collectedIn, points } from '../league/League';
import { league } from '../league/leagues';
import { LEAGUE_UNLOCK_LEVEL, type LeagueService } from '../league/LeagueService';
import type { LeagueScreen } from '../ui/LeagueScreen';
import type { LeagueResultDialog } from '../ui/LeagueResultDialog';
import type { ProgressStorage } from '../progress/ProgressStorage';
import type { DailyLogStorage } from '../recap/DailyLog';
import type { RecapRecords } from '../recap/insights';
import type { GameScene } from '../scenes/GameScene';
import type { CompleteDialog } from '../ui/CompleteDialog';
import { RESET_SETTINGS, RESTART_LEVEL, type ConfirmDialog } from '../ui/ConfirmDialog';
import { prefersReducedMotion } from '../ui/dom';
import type { GameLayout } from '../ui/GameLayout';
import type { GameOverDialog } from '../ui/GameOverDialog';
import type { HomeScreen } from '../ui/HomeScreen';
import type { Hud } from '../ui/Hud';
import type { ThemePicker } from '../ui/ThemePicker';
import type { LevelSelect } from '../ui/LevelSelect';
import type { AvatarPicker, CountryPicker } from '../ui/Pickers';
import type { ProfileScreen } from '../ui/ProfileScreen';
import type { RecordsScreen } from '../ui/RecordsScreen';
import type { SettingsStore } from '../settings/Settings';
import { claimStatus, cycleDay, nextReward, rewardForDay } from '../daily/Daily';
import type { DayClock } from '../daily/dayKey';
import type { AchievementDefinition } from '../rewards/Achievements';
import type { Rewards } from '../rewards/Rewards';
import type { AchievementsScreen } from '../ui/AchievementsScreen';
import type { DailyDialog } from '../ui/DailyDialog';
import type { Screens } from '../ui/Screens';
import type { Toast } from '../ui/Toast';
import type { BoosterId } from '../boosters/Boosters';
import type { BoosterBar } from '../ui/BoosterBar';
import { AttemptTracker, type AttemptSummary } from './AttemptTracker';
import { BOOSTER_TIP, BoosterController } from './BoosterController';
import { routeBack, type BackLayer } from './backLayers';
import { LeagueController } from './LeagueController';
import { RecordsKeeper } from './RecordsKeeper';
import { hasProgress, restartNeedsConfirm } from './confirmPolicy';
import type { FeedbackEvent } from './Feedback';
import { NavigationHistory, type ScreenName } from './Navigation';

export interface AppParts {
  readonly levels: readonly LevelData[];
  readonly storage: ProgressStorage;
  readonly profileStorage: ProfileStorage;
  readonly statsStorage: StatsStorage;
  /** Per-day statistics for the startup recap. */
  readonly dailyLogStorage: DailyLogStorage;
  readonly state: GameState;
  readonly scene: GameScene;
  readonly game: Phaser.Game;
  readonly screens: Screens;
  readonly home: HomeScreen;
  readonly levelSelect: LevelSelect;
  readonly profileScreen: ProfileScreen;
  readonly recordsScreen: RecordsScreen;
  readonly hud: Hud;
  /** The HUD's theme picker (pauses the level timer while open). */
  readonly themePicker: ThemePicker;
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
  readonly rewards: Rewards;
  readonly dayClock: DayClock;
  readonly dailyDialog: DailyDialog;
  readonly achievementsScreen: AchievementsScreen;
  readonly league: LeagueService;
  readonly leagueScreen: LeagueScreen;
  readonly leagueResult: LeagueResultDialog;
  /** The HUD's booster row (Hint, Reveal, Extra Heart). */
  readonly boosterBar: BoosterBar;
  /** The Energy Credits Shop (permanent cosmetics). */
  readonly shopScreen: ShopScreen;
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
  private readonly records: RecordsKeeper;
  private readonly leagueController: LeagueController;
  private readonly boosters: BoosterController;
  private profile: PlayerProfile;
  private navigating = false;
  /** The startup splash / recap covering Home: Back answers it and league notices wait for it. */
  private intro: { back: () => void } | null = null;
  private readonly history = new NavigationHistory();
  private readonly attempt = new AttemptTracker();
  private clockTimer = 0;
  /** True while the app is hidden or in the background (browser tab or Android app). */
  private background = false;
  private zoomHintShown = false;
  /** True from a Shop "Buy" tap until its confirmation is answered: further Buy taps are ignored. */
  private purchasing = false;
  /** The regular level opened most recently this session (challenges don't count), or null before the first. */
  private lastLevelOpened: number | null = null;
  /** The Daily League challenge being played, or null for a regular level. */
  private challenge: DailyChallenge | null = null;
  /** True while the open attempt is a challenge: it never touches level progress or statistics. */
  private attemptIsChallenge = false;
  /** True while the open attempt is a test play (a level opened only by the testing flag): nothing is recorded. */
  private attemptIsTestPlay = false;
  /** Energy Points of the current challenge already collected when this attempt began. */
  private attemptStartCollected = 0;
  private lastChallenge: { timeMs: number; newPoints: number } | null = null;
  /** Results of the most recent completion, shown in the dialog. */
  private lastCompletion: {
    unlocked: number | null;
    newBestStars: boolean;
    newBestTime: boolean;
    bestTimeMs: number;
    timeMs: number;
  } | null = null;

  constructor(private readonly parts: AppParts) {
    // Loaded in this order: progress, profile, statistics, daily log.
    const progress = parts.storage.load();
    this.profile = parts.profileStorage.load();
    this.records = new RecordsKeeper(parts, progress, parts.statsStorage.load(), parts.dailyLogStorage.load());
    this.leagueController = new LeagueController(parts, {
      challenge: () => this.challenge,
      attemptIsChallenge: () => this.attemptIsChallenge,
      unlocked: () => this.leagueUnlocked,
      progress: () => this.records.progress,
      busy: () => this.navigating || this.intro !== null,
    });
    const { rewards, dayClock } = parts;
    this.boosters = new BoosterController({
      state: parts.state,
      scene: parts.scene,
      wallet: { get credits() { return rewards.credits; }, spend: (id) => rewards.spendBooster(dayClock.refresh(), id) },
      attempt: this.attempt,
      bar: parts.boosterBar,
      // Challenges are played without boosters; test plays get them free (never real credits).
      mode: () => ({ challenge: this.attemptIsChallenge, testPlay: this.attemptIsTestPlay }),
      notify: (message) => parts.toast.show(message, 2600),
      onUsed: () => parts.feedback({ type: 'booster' }),
      later: (fn, ms) => window.setTimeout(fn, ms),
    });
  }

  /**
   * Wires up the UI callbacks and shows the Home screen. `introBack`: the
   * startup intro already covers Home (see beginIntro), so a league result
   * settled now waits for endIntro() instead of appearing under the splash.
   */
  start(introBack?: () => void): void {
    if (introBack) this.beginIntro(introBack);
    const { levelSelect, hud, game } = this.parts;
    levelSelect.onSelect((id) => void this.openLevel(id));
    levelSelect.onBack(() => void this.goBack());
    hud.onBack(() => void this.leaveLevel());
    hud.onRestart(() => void this.requestRestart());
    document.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => this.setBackground(document.hidden));

    // Daily check-in: now, and whenever the date changes while the game is open
    // (midnight, or noticed on return from the background). Never pays out by itself.
    const { rewards, dayClock } = this.parts;
    rewards.onUnlock((unlocked) => this.announce(unlocked));
    rewards.subscribe(() => this.renderRewards());
    dayClock.onChange((today) => {
      if (!document.hidden) rewards.checkIn(today);
      this.renderRewards();
      this.leagueController.settle();
    });
    dayClock.start();
    rewards.checkIn(dayClock.today);

    // Daily League: settle any finished days now (the app needn't be open at midnight),
    // and award Energy Points the moment the rules remove an Energy Arrow.
    this.parts.league.subscribe(() => this.leagueController.render());
    this.parts.state.onRemove((arrow) => this.leagueController.collect(arrow));
    this.leagueController.settle();

    // Boosters: which ones would work changes with the board, lives and balance.
    this.parts.state.subscribe(() => this.boosters.render());

    // Pins the first tracked day, so later summaries know which days are complete.
    this.records.saveDailyLog();

    this.renderAll();
    // The game loop only needs to run while its screen is visible; sleeping saves
    // battery. Phaser starts the loop after READY, so sleep after the first frame,
    // and again whenever it auto-resumes on returning to the tab.
    game.events.once(Phaser.Core.Events.POST_RENDER, () => this.syncGameLoop());
    game.events.on(Phaser.Core.Events.VISIBLE, () => this.syncGameLoop());
    this.background = document.hidden;
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

  /** The full personal records list, opened from Profile (starts at the current chapter). */
  showRecords(): Promise<void> {
    this.parts.recordsScreen.reset();
    return this.showMenuScreen('records');
  }

  showSettings(): Promise<void> {
    return this.showMenuScreen('settings');
  }

  showAchievements(): Promise<void> {
    return this.showMenuScreen('achievements');
  }

  showLeague(): Promise<void> {
    this.leagueController.settle();
    return this.showMenuScreen('league');
  }

  showShop(): Promise<void> {
    return this.showMenuScreen('shop');
  }

  /**
   * A Shop "Buy" tap. Too few credits: explains the price (nothing to
   * confirm). Otherwise asks first, then buys through the wallet: one saved
   * write for the charge and the unlock, and the new item is equipped. While
   * the question is open, further Buy taps are ignored, and an item already
   * owned can never be paid again (Rewards refuses it), so rapid taps can't
   * spend twice.
   */
  async buyCosmetic(id: CosmeticId): Promise<void> {
    const { rewards, confirmDialog, toast, shopScreen, screens } = this.parts;
    const item = cosmeticById(id);
    if (!item || this.purchasing || this.navigating || screens.active !== 'shop') return;
    if (rewards.current.cosmetics.owned.includes(item.id)) return this.equipCosmetic(item.slot, item.id);
    if (rewards.credits < item.price) {
      toast.show(purchaseMessage(item, 'insufficient', rewards.credits), 3200);
      return;
    }
    this.purchasing = true;
    try {
      const confirmed = await confirmDialog.ask(purchaseQuestion(item, rewards.credits));
      if (!confirmed || screens.active !== 'shop') return;
      const result = rewards.buyCosmetic(item.id);
      if (!result.ok) {
        toast.show(purchaseMessage(item, result.reason, rewards.credits), 3200);
        return;
      }
      shopScreen.celebrate(item.id);
      toast.show(`${item.name} unlocked and equipped · −${item.price}`, 2600, 'achievement');
      this.parts.feedback({ type: 'purchase' });
    } finally {
      this.purchasing = false;
    }
  }

  /** Wears an owned Shop item, or `null` for the free default. Free; ignored for items not owned. */
  equipCosmetic(slot: CosmeticSlot, id: CosmeticId | null): void {
    if (this.parts.screens.active !== 'shop') return;
    this.parts.rewards.equipCosmetic(this.parts.dayClock.today, slot, id);
  }

  /** The Shop's "Continue playing": the same level Home's Play button opens. */
  continueFromShop(): Promise<void> {
    const count = this.parts.levels.length;
    const progress = this.records.progress;
    return this.openLevel(completedCount(progress, count) === count ? 1 : nextLevelToPlay(progress, count));
  }

  /** True once Level 10 is completed. Before that no competition exists and no points can be earned. */
  get leagueUnlocked(): boolean {
    return isCompleted(this.records.progress, LEAGUE_UNLOCK_LEVEL);
  }

  /**
   * Starts one of today's Daily League challenges (1..3). It reuses the level
   * screen, rules, lives and timer; only the records it writes differ.
   */
  openChallenge(number: number): Promise<void> {
    const today = this.parts.dayClock.refresh();
    this.leagueController.settle();
    const challenge = this.parts.league.challenges(today)[number - 1];
    if (!challenge || !this.leagueUnlocked) return Promise.resolve();
    const level = challenge.level;
    return this.navigate(async () => {
      this.endAttempt('abandoned');
      this.hideEndDialogs();
      this.parts.confirmDialog.close(false);
      this.challenge = challenge;
      this.parts.gameLayout.setGrid(level.rows, level.cols);
      this.parts.scene.loadLevel(level);
      this.beginAttempt();
      this.parts.hud.setTime(0);
      this.wakeGame();
      this.history.go('game');
      await this.parts.screens.show('game');
      this.attempt.interactive();
      this.startClock();
    });
  }

  /** "Levels" in the end-of-run dialogs: the level list, or the league after a challenge. */
  showLevelsOrLeague(): Promise<void> {
    return this.challenge ? this.showLeague() : this.showLevelSelect();
  }

  /** Opens the daily rewards calendar (checking in first, in case the day just changed). */
  openDaily(): void {
    const { rewards, dayClock, dailyDialog } = this.parts;
    const today = dayClock.refresh();
    rewards.checkIn(today);
    dailyDialog.render(rewards.current.daily, today, rewards.credits);
    dailyDialog.open();
  }

  /** Claims today's reward: saved (claim + credits in one write) before any animation plays. */
  claimDaily(): void {
    const { rewards, dayClock, dailyDialog, feedback } = this.parts;
    const today = dayClock.refresh();
    rewards.checkIn(today);
    const before = rewards.credits;
    const result = rewards.claimDaily(today);
    if (!result) return; // already claimed (double tap) or not available
    dailyDialog.render(rewards.current.daily, today, rewards.credits);
    dailyDialog.celebrate(result.reward, before, rewards.credits);
    feedback({ type: 'claim' });
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
    if (!level || !canPlayLevel(this.records.progress, levelId, this.parts.levels.length)) return Promise.resolve();
    return this.navigate(async () => {
      this.endAttempt('abandoned'); // a previous attempt still open counts as abandoned
      this.hideEndDialogs();
      this.parts.confirmDialog.close(false);
      this.parts.gameLayout.setGrid(level.rows, level.cols); // size the slot before the board is fitted into it
      this.challenge = null;
      this.lastLevelOpened = levelId;
      this.parts.scene.loadLevel(level); // replaces every arrow, counter and flag
      this.beginAttempt();
      this.parts.hud.setTime(0);
      this.wakeGame();
      this.history.go('game');
      await this.parts.screens.show('game');
      // Only now is the level interactive: loading and the screen transition don't count.
      this.attempt.interactive();
      this.startClock();
      this.introduceBoosters();
    });
  }

  /** A booster button was tapped (only acts during a level; see BoosterController). */
  useBooster(id: BoosterId): void {
    if (this.navigating || this.parts.screens.active !== 'game') return;
    this.boosters.use(id);
  }

  /**
   * Once ever, from Level 2 on (Level 1 stays a clean tutorial): a short,
   * self-dismissing tip on what the boosters do and cost.
   */
  private introduceBoosters(): void {
    const { rewards, dayClock, toast, state } = this.parts;
    if (this.challenge || state.levelId < 2 || rewards.current.boosters.introduced) return;
    toast.show(BOOSTER_TIP, 5000);
    rewards.markBoostersIntroduced(dayClock.today);
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
    this.parts.scene.restartLevel(); // full lives, no red arrows, counters at zero
    this.beginAttempt(); // collected Energy Points are kept: they live in the league record
    this.attempt.interactive(); // the board is already on screen
    this.parts.hud.setTime(0);
  }

  // ------------------------------------------------------------ game events

  /** The last arrow is off the board: stop the clock and save immediately, before any dialog. */
  handleLevelSolved(): void {
    const summary = this.attempt.finish('won', this.parts.state.snapshot());
    if (!summary) return;
    if (this.attemptIsTestPlay) {
      // Testing flag only: show the result, record nothing (see progress/testUnlock.ts).
      this.lastCompletion = { unlocked: null, newBestStars: false, newBestTime: false, bestTimeMs: summary.timeMs, timeMs: summary.timeMs };
      this.parts.hud.setTime(summary.timeMs);
      this.parts.toast.show('Test play: this result is not saved', 2200);
      this.parts.feedback({ type: 'complete' });
      return;
    }
    if (this.attemptIsChallenge && this.challenge) {
      // A challenge never touches level progress, best times or statistics.
      const today = this.parts.dayClock.refresh();
      this.parts.league.complete(today, this.challenge);
      this.lastChallenge = { timeMs: summary.timeMs, newPoints: collectedIn(this.parts.league.current, this.challenge) - this.attemptStartCollected };
      this.parts.hud.setTime(summary.timeMs);
      this.renderAll();
      this.parts.feedback({ type: 'complete' });
      return;
    }
    const completion = this.records.record(summary);
    this.lastCompletion = completion && {
      unlocked: completion.unlocked,
      newBestStars: completion.newBestStars,
      newBestTime: completion.newBestTime,
      bestTimeMs: completion.bestTimeMs,
      timeMs: summary.timeMs,
    };
    this.parts.hud.setTime(summary.timeMs);
    if (summary.levelId === LEAGUE_UNLOCK_LEVEL) this.leagueController.settle(); // completing Level 10 opens the league
    this.renderAll();
    this.parts.feedback({ type: 'complete' });
  }

  /** The win effect has played: show the summary dialog. */
  handleCelebrationEnd(): void {
    if (this.parts.screens.active !== 'game') return;
    if (this.challenge && this.lastChallenge) {
      const snapshot = this.parts.state.snapshot();
      const state = this.parts.league.current;
      const today = this.parts.dayClock.today;
      const done = state.current?.date === today ? state.current.completed : [];
      this.parts.completeDialog.showChallenge({
        number: this.challenge.number,
        stars: snapshot.stars,
        timeMs: this.lastChallenge.timeMs,
        mistakes: snapshot.mistakes,
        collected: collectedIn(state, this.challenge),
        perChallenge: ENERGY_PER_CHALLENGE,
        newPoints: Math.max(0, this.lastChallenge.newPoints),
        today: points(state.current),
        maxToday: MAX_DAILY_POINTS,
        leagueName: league(state.tier).name,
        hasNext: this.leagueController.nextChallengeNumber(done) !== null,
      });
      this.parts.feedback({ type: 'stars', stars: snapshot.stars, unlocked: false, reduced: prefersReducedMotion() });
      return;
    }
    if (!this.lastCompletion) return;
    const snapshot = this.parts.state.snapshot();
    const c = this.lastCompletion;
    this.parts.completeDialog.show({
      levelId: snapshot.levelId,
      levelCount: this.parts.levels.length,
      arrows: snapshot.total,
      stars: snapshot.stars,
      directClears: snapshot.directClears,
      autoClears: snapshot.autoClears,
      bonusClears: snapshot.bonusClears,
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
      challenge: this.challenge
        ? { number: this.challenge.number, today: points(this.parts.league.current.current), maxToday: MAX_DAILY_POINTS }
        : undefined,
    });
  }

  /** Called by the completion dialog's buttons. */
  nextLevel(): void {
    if (this.challenge) {
      const c = this.parts.league.current.current;
      const next = this.leagueController.nextChallengeNumber(c?.date === this.parts.dayClock.today ? c.completed : []);
      void (next === null ? this.showLeague() : this.openChallenge(next));
      return;
    }
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

  /** The HUD theme picker opened or closed: choosing a theme isn't play time. */
  themePickerOpened(): void {
    this.attempt.timer.pause('picker');
  }

  themePickerClosed(): void {
    this.attempt.timer.resume('picker');
  }

  // ------------------------------------------------------------ startup intro

  /** The studio splash (and recap) now cover Home. `back` is what Back / Escape do meanwhile. */
  beginIntro(back: () => void): void {
    this.intro = { back };
  }

  /** Home is uncovered: anything that waited (a league result) may show now. */
  endIntro(): void {
    this.intro = null;
    this.leagueController.showNotice();
  }

  /** The player's own saved records, as the recap reads them. */
  get recapRecords(): RecapRecords {
    return {
      progress: this.records.progress,
      levels: this.parts.levels,
      stats: this.records.stats,
      daily: this.parts.rewards.current.daily,
      log: this.records.dailyLog,
      today: this.parts.dayClock.refresh(),
    };
  }

  /** Read-only views for debugging and tests. */
  get currentProgress(): Progress {
    return this.records.progress;
  }

  get currentStats(): PlayerStats {
    return this.records.stats;
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
      this.parts.scene.resetView(); // no leftover zoom or half-finished gesture
      this.hideEndDialogs();
      this.renderAll();
      this.history.go(screen);
      await this.parts.screens.show(screen);
      this.syncGameLoop();
      queueMicrotask(() => this.leagueController.showNotice());
      // The level the player came from, or (before any this session) the next one to play.
      if (screen === 'levels') this.parts.levelSelect.focusLevel(this.lastLevelOpened ?? nextLevelToPlay(this.records.progress, this.parts.levels.length));
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
    if (!summary || this.attemptIsChallenge || this.attemptIsTestPlay) return; // challenges keep their own records; test plays none
    this.records.record(summary);
  }

  private renderAll(): void {
    const { progress, stats } = this.records;
    this.parts.home.render(this.profile, progress);
    this.parts.levelSelect.render(progress);
    this.parts.profileScreen.render(this.profile, progress, stats);
    this.parts.recordsScreen.render(progress);
    this.renderRewards();
    this.leagueController.render();
  }

  // ------------------------------------------------------------ league

  private beginAttempt(): void {
    const level = this.parts.state;
    this.attemptIsChallenge = this.challenge !== null;
    this.attemptIsTestPlay = !this.challenge && isTestPlay(this.records.progress, level.levelId);
    this.attemptStartCollected = this.challenge ? collectedIn(this.parts.league.current, this.challenge) : 0;
    this.lastChallenge = null;
    this.attempt.begin(level.levelId, this.parts.levels[level.levelId - 1]?.revision ?? 1);
    this.leagueController.renderChallengeHud();
    this.boosters.render();
  }

  /** Home's daily card and counters, Profile's rewards card, the achievements list and the open calendar. */
  private renderRewards(): void {
    const { rewards, dayClock, home, profileScreen, achievementsScreen, dailyDialog } = this.parts;
    const today = dayClock.today;
    const daily = rewards.current.daily;
    const views = rewards.achievements();
    const unlocked = views.filter((v) => v.unlocked).length;
    const day = cycleDay(daily.lastCheckIn === today ? daily.streak : 1);
    const { cosmetics } = rewards.current;
    home.renderRewards({
      credits: rewards.credits,
      streak: daily.lastCheckIn === today ? daily.streak : 0,
      status: claimStatus(daily, today),
      today: { day, credits: rewardForDay(day) },
      next: nextReward(daily, today),
      unlocked,
      total: views.length,
      frame: cosmetics.equipped.frame,
    });
    profileScreen.renderRewards({
      credits: rewards.credits,
      streak: daily.lastCheckIn === today ? daily.streak : 0,
      longestStreak: daily.longestStreak,
      daysPlayed: daily.daysPlayed,
      unlocked,
      total: views.length,
      frame: cosmetics.equipped.frame,
    });
    this.parts.shopScreen.render({ credits: rewards.credits, avatar: this.profile.avatar, cosmetics });
    achievementsScreen.render(views, rewards.credits);
    if (dailyDialog.isOpen) dailyDialog.render(daily, today, rewards.credits);
    this.boosters.render();
  }

  /** A small, non-blocking notice for newly unlocked achievements (several at once are combined). */
  private announce(unlocked: readonly AchievementDefinition[]): void {
    if (unlocked.length === 0) return;
    const credits = unlocked.reduce((sum, a) => sum + a.reward, 0);
    const message =
      unlocked.length === 1
        ? `Achievement unlocked: ${unlocked[0].title} · +${credits}`
        : `${unlocked.length} achievements unlocked · +${credits}`;
    this.parts.toast.show(message, 2600, 'achievement');
    this.parts.feedback({ type: 'achievement' });
  }

  private hideEndDialogs(): void {
    this.parts.themePicker.close();
    this.parts.completeDialog.hide();
    this.parts.gameOverDialog.hide();
  }

  /** Once per session, on the first board that can be zoomed: how to zoom. */
  zoomHint(): void {
    if (this.zoomHintShown || this.parts.screens.active !== 'game') return;
    this.zoomHintShown = true;
    this.parts.toast.show('Tip: pinch (or scroll) to zoom, drag to move', 2600);
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
   * Called from the page's visibilitychange and, in the Android app, from the
   * native pause/resume events; repeated calls with the same state do nothing.
   */
  setBackground(hidden: boolean): void {
    if (hidden === this.background) return;
    this.background = hidden;
    if (hidden) {
      this.attempt.timer.pause('hidden');
      const played = this.attempt.checkpoint();
      if (played > 0 && !this.attemptIsChallenge && !this.attemptIsTestPlay) {
        this.records.addPlayTime(played);
      }
    } else {
      this.attempt.timer.resume('hidden');
      // Back from the background, possibly on a new day: count it (idempotent on the same day).
      this.parts.rewards.checkIn(this.parts.dayClock.refresh());
      this.leagueController.settle();
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

  /** Escape on desktop: the same as Back, except that end-of-level dialogs and nickname editing keep their own buttons. */
  private handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.handleBack(false);
  }

  /**
   * "Back", from Escape or the Android Back button / gesture: closes the
   * topmost dialog or picker, otherwise leaves the level (asking first if an
   * attempt would be lost) or goes to the previous screen. Returns false only
   * on Home with nothing open, where the Android app then goes to the
   * background (like the Home button) instead of closing.
   *
   * `system` (Android Back) also answers the end-of-level dialogs (as
   * "Levels" / "League") and cancels nickname editing; Escape leaves those
   * to their own buttons, as before.
   */
  handleBack(system = true): boolean {
    if (this.navigating) return true; // a transition is running: ignore, don't exit
    return routeBack(this.backLayers(), system);
  }

  /** Everything Back can answer, topmost first. A new dialog gets its own entry here. */
  private backLayers(): BackLayer[] {
    const { confirmDialog, completeDialog, gameOverDialog, avatarPicker, countryPicker, profileScreen, screens, dailyDialog, leagueResult, themePicker } = this.parts;
    return [
      // The splash ignores it; the recap takes it as Skip.
      { active: () => this.intro !== null, back: () => this.intro!.back() },
      { active: () => themePicker.isOpen, back: () => themePicker.close() },
      { active: () => confirmDialog.isOpen, back: () => confirmDialog.close(false) },
      { active: () => dailyDialog.isOpen, back: () => dailyDialog.close() },
      { active: () => leagueResult.isOpen, back: () => leagueResult.close() },
      { active: () => avatarPicker.isOpen, back: () => avatarPicker.close() },
      { active: () => countryPicker.isOpen, back: () => countryPicker.close() },
      { active: () => profileScreen.isEditing, back: (system) => { if (system) profileScreen.cancelEditing(); } },
      { active: () => completeDialog.isOpen || gameOverDialog.isOpen, back: (system) => { if (system) void this.showLevelsOrLeague(); } },
      { active: () => screens.active === 'game', back: () => void this.leaveLevel() },
      { active: () => screens.active !== null && screens.active !== 'home', back: () => void this.goBack() },
    ];
  }
}
