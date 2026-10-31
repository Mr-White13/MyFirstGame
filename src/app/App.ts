import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import type { LevelData } from '../core/types';
import { withAvatar, withCountry, withNickname, type PlayerProfile, type ProfileStorage } from '../profile/Profile';
import { addPlayTime, type AttemptOutcome, type PlayerStats, type StatsStorage } from '../profile/Stats';
import { completedCount, isCompleted, isUnlocked, type Progress } from '../progress/Progress';
import type { ArrowData } from '../core/types';
import { ENERGY_PER_CHALLENGE, MAX_DAILY_POINTS, type DailyChallenge } from '../league/challenges';
import { collectedIn, points } from '../league/League';
import { league } from '../league/leagues';
import { LEAGUE_UNLOCK_LEVEL, type LeagueService } from '../league/LeagueService';
import type { LeagueScreen } from '../ui/LeagueScreen';
import { noticeKind, noticeText, type LeagueResultDialog } from '../ui/LeagueResultDialog';
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
import { claimStatus, cycleDay, nextReward, rewardForDay } from '../daily/Daily';
import type { DayClock } from '../daily/dayKey';
import type { AchievementDefinition } from '../rewards/Achievements';
import type { Rewards } from '../rewards/Rewards';
import type { AchievementsScreen } from '../ui/AchievementsScreen';
import type { DailyDialog } from '../ui/DailyDialog';
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
  readonly rewards: Rewards;
  readonly dayClock: DayClock;
  readonly dailyDialog: DailyDialog;
  readonly achievementsScreen: AchievementsScreen;
  readonly league: LeagueService;
  readonly leagueScreen: LeagueScreen;
  readonly leagueResult: LeagueResultDialog;
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
  /** True while the app is hidden or in the background (browser tab or Android app). */
  private background = false;
  /** The Daily League challenge being played, or null for a regular level. */
  private challenge: DailyChallenge | null = null;
  /** True while the open attempt is a challenge: it never touches level progress or statistics. */
  private attemptIsChallenge = false;
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
    document.addEventListener('visibilitychange', () => this.setBackground(document.hidden));

    // Daily check-in: now, and whenever the date changes while the game is open
    // (midnight, or noticed on return from the background). Never pays out by itself.
    const { rewards, dayClock } = this.parts;
    rewards.onUnlock((unlocked) => this.announce(unlocked));
    rewards.subscribe(() => this.renderRewards());
    dayClock.onChange((today) => {
      if (!document.hidden) rewards.checkIn(today);
      this.renderRewards();
    });
    dayClock.onChange(() => this.settleLeague());
    dayClock.start();
    rewards.checkIn(dayClock.today);

    // Daily League: settle any finished days now (the app needn't be open at midnight),
    // and award Energy Points the moment the rules remove an Energy Arrow.
    this.parts.league.subscribe(() => this.renderLeague());
    this.parts.state.onRemove((arrow) => this.handleRemoved(arrow));
    this.settleLeague();

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

  showSettings(): Promise<void> {
    return this.showMenuScreen('settings');
  }

  showAchievements(): Promise<void> {
    return this.showMenuScreen('achievements');
  }

  showLeague(): Promise<void> {
    this.settleLeague();
    return this.showMenuScreen('league');
  }

  /** True once Level 10 is completed. Before that no competition exists and no points can be earned. */
  get leagueUnlocked(): boolean {
    return isCompleted(this.progress, LEAGUE_UNLOCK_LEVEL);
  }

  /**
   * Starts one of today's Daily League challenges (1..3). It reuses the level
   * screen, rules, lives and timer; only the records it writes differ.
   */
  openChallenge(number: number): Promise<void> {
    const today = this.parts.dayClock.refresh();
    this.settleLeague();
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
    if (!level || !isUnlocked(this.progress, levelId)) return Promise.resolve();
    return this.navigate(async () => {
      this.endAttempt('abandoned'); // a previous attempt still open counts as abandoned
      this.hideEndDialogs();
      this.parts.confirmDialog.close(false);
      this.parts.gameLayout.setGrid(level.rows, level.cols); // size the slot before the board is fitted into it
      this.challenge = null;
      this.parts.scene.loadLevel(level); // replaces every arrow, counter and flag
      this.beginAttempt();
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
    const { records, completion } = applyAttempt({ progress: this.progress, stats: this.stats }, summary, this.parts.levels.length);
    this.progress = records.progress;
    this.stats = records.stats;
    this.parts.storage.save(this.progress);
    this.parts.statsStorage.save(this.stats);
    this.parts.rewards.afterAttempt(this.parts.dayClock.today, summary.longestChain);
    this.lastCompletion = completion && {
      unlocked: completion.unlocked,
      newBestStars: completion.newBestStars,
      newBestTime: completion.newBestTime,
      bestTimeMs: completion.bestTimeMs,
      timeMs: summary.timeMs,
    };
    this.parts.hud.setTime(summary.timeMs);
    if (summary.levelId === LEAGUE_UNLOCK_LEVEL) this.settleLeague(); // completing Level 10 opens the league
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
        hasNext: this.nextChallengeNumber(done) !== null,
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
      const next = this.nextChallengeNumber(c?.date === this.parts.dayClock.today ? c.completed : []);
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
      queueMicrotask(() => this.showLeagueNotice());
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
    if (!summary || this.attemptIsChallenge) return; // challenges keep their own records
    const { records } = applyAttempt({ progress: this.progress, stats: this.stats }, summary, this.parts.levels.length);
    this.stats = records.stats; // a failed or abandoned attempt never changes progress
    this.parts.statsStorage.save(this.stats);
    this.parts.rewards.afterAttempt(this.parts.dayClock.today, summary.longestChain);
  }

  private renderAll(): void {
    this.parts.home.render(this.profile, this.progress);
    this.parts.levelSelect.render(this.progress);
    this.parts.profileScreen.render(this.profile, this.progress, this.stats);
    this.renderRewards();
    this.renderLeague();
  }

  // ------------------------------------------------------------ league

  /** Settles finished league days and opens today's (idempotent), then shows any new result. */
  private settleLeague(): void {
    const today = this.parts.dayClock.today;
    this.parts.league.settle(today, this.leagueUnlocked);
    if (this.challenge && this.challenge.date !== today && this.parts.screens.active === 'game') {
      this.parts.toast.show('A new league day has started: this challenge no longer earns points', 2600);
    }
    this.showLeagueNotice();
  }

  /** The rules removed an arrow: if it is an Energy Arrow in a challenge, award its point now (saved at once). */
  private handleRemoved(arrow: ArrowData): void {
    if (!this.challenge || !this.attemptIsChallenge || !arrow.energy) return;
    const status = this.parts.league.collect(this.parts.dayClock.refresh(), this.challenge, arrow.id);
    if (status === 'awarded') this.parts.feedback({ type: 'energy' });
  }

  private beginAttempt(): void {
    const level = this.parts.state;
    this.attemptIsChallenge = this.challenge !== null;
    this.attemptStartCollected = this.challenge ? collectedIn(this.parts.league.current, this.challenge) : 0;
    this.lastChallenge = null;
    this.attempt.begin(level.levelId, this.parts.levels[level.levelId - 1]?.revision ?? 1);
    this.renderChallengeHud();
  }

  private nextChallengeNumber(completed: readonly number[]): number | null {
    for (let n = (this.challenge?.number ?? 0) + 1; n <= 3; n++) if (!completed.includes(n)) return n;
    for (let n = 1; n <= 3; n++) if (!completed.includes(n)) return n;
    return null;
  }

  private renderChallengeHud(): void {
    const ch = this.challenge;
    if (!ch) {
      this.parts.hud.setChallenge(null);
      return;
    }
    const state = this.parts.league.current;
    this.parts.hud.setChallenge({
      number: ch.number,
      collected: collectedIn(state, ch),
      perChallenge: ENERGY_PER_CHALLENGE,
      today: state.current?.date === ch.date ? points(state.current) : 0,
      maxToday: MAX_DAILY_POINTS,
      leagueName: league(state.tier).name,
    });
  }

  private renderLeague(): void {
    const { league: service, dayClock, home, leagueScreen, profileScreen } = this.parts;
    const state = service.current;
    const today = dayClock.today;
    const unlocked = this.leagueUnlocked;
    const live = state.current?.date === today ? state.current : null;
    const todayPoints = unlocked ? points(live) : 0;
    const levelsDone = Math.min(LEAGUE_UNLOCK_LEVEL, completedCount(this.progress, LEAGUE_UNLOCK_LEVEL));
    home.renderLeague({ unlocked, levelsDone, unlockAt: LEAGUE_UNLOCK_LEVEL, tier: state.tier, today: todayPoints, maxToday: MAX_DAILY_POINTS });
    leagueScreen.render({
      unlocked,
      levelsDone,
      unlockAt: LEAGUE_UNLOCK_LEVEL,
      tier: state.tier,
      today: todayPoints,
      maxToday: MAX_DAILY_POINTS,
      perChallenge: ENERGY_PER_CHALLENGE,
      challenges: service.challenges(today).map((challenge) => ({
        challenge,
        collected: collectedIn(state, challenge),
        completed: live?.completed.includes(challenge.number) ?? false,
      })),
      history: state.history,
      clockBack: state.lastDay !== null && today < state.lastDay,
    });
    profileScreen.renderLeague(state);
    this.renderChallengeHud();
  }

  /**
   * Shows what settling changed, once: a dialog for a promotion or a move
   * down, a short toast when the league was simply kept. Never during play,
   * and never twice (acknowledging clears it from the saved record).
   */
  private showLeagueNotice(): void {
    const { league: service, leagueResult, screens, toast, feedback } = this.parts;
    const notice = service.current.notice;
    if (!notice || this.navigating || screens.active === 'game' || leagueResult.isOpen) return;
    const kind = noticeKind(notice);
    if (kind === 'retained') {
      toast.show(noticeText(notice), 3200);
      service.acknowledge();
      return;
    }
    leagueResult.show(notice, () => service.acknowledge());
    if (kind === 'promoted') feedback({ type: 'promoted' });
  }

  /** Home's daily card and counters, Profile's rewards card, the achievements list and the open calendar. */
  private renderRewards(): void {
    const { rewards, dayClock, home, profileScreen, achievementsScreen, dailyDialog } = this.parts;
    const today = dayClock.today;
    const daily = rewards.current.daily;
    const views = rewards.achievements();
    const unlocked = views.filter((v) => v.unlocked).length;
    const day = cycleDay(daily.lastCheckIn === today ? daily.streak : 1);
    home.renderRewards({
      credits: rewards.credits,
      streak: daily.lastCheckIn === today ? daily.streak : 0,
      status: claimStatus(daily, today),
      today: { day, credits: rewardForDay(day) },
      next: nextReward(daily, today),
      unlocked,
      total: views.length,
    });
    profileScreen.renderRewards({
      credits: rewards.credits,
      streak: daily.lastCheckIn === today ? daily.streak : 0,
      longestStreak: daily.longestStreak,
      daysPlayed: daily.daysPlayed,
      unlocked,
      total: views.length,
    });
    achievementsScreen.render(views, rewards.credits);
    if (dailyDialog.isOpen) dailyDialog.render(daily, today, rewards.credits);
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
   * Called from the page's visibilitychange and, in the Android app, from the
   * native pause/resume events; repeated calls with the same state do nothing.
   */
  setBackground(hidden: boolean): void {
    if (hidden === this.background) return;
    this.background = hidden;
    if (hidden) {
      this.attempt.timer.pause('hidden');
      const played = this.attempt.checkpoint();
      if (played > 0 && !this.attemptIsChallenge) {
        this.stats = addPlayTime(this.stats, played);
        this.parts.statsStorage.save(this.stats);
      }
    } else {
      this.attempt.timer.resume('hidden');
      // Back from the background, possibly on a new day: count it (idempotent on the same day).
      this.parts.rewards.checkIn(this.parts.dayClock.refresh());
      this.settleLeague();
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
    const { confirmDialog, completeDialog, gameOverDialog, avatarPicker, countryPicker, profileScreen, screens, dailyDialog, leagueResult } = this.parts;
    if (this.navigating) return true; // a transition is running: ignore, don't exit
    if (confirmDialog.isOpen) confirmDialog.close(false);
    else if (dailyDialog.isOpen) dailyDialog.close();
    else if (leagueResult.isOpen) leagueResult.close();
    else if (avatarPicker.isOpen) avatarPicker.close();
    else if (countryPicker.isOpen) countryPicker.close();
    else if (profileScreen.isEditing) {
      if (system) profileScreen.cancelEditing();
    } else if (completeDialog.isOpen || gameOverDialog.isOpen) {
      if (system) void this.showLevelsOrLeague();
    } else if (screens.active === 'game') void this.leaveLevel();
    else if (screens.active !== null && screens.active !== 'home') void this.goBack();
    else return false;
    return true;
  }
}
