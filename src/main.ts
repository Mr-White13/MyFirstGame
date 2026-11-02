import './style.css';
import { App } from './app/App';
import { runIntro } from './app/Intro';
import { firstPaintStart, sessionStore, StudioSplash } from './branding/StudioSplash';
import { Feedback, type FeedbackEvent } from './app/Feedback';
import { AudioManager } from './audio/AudioManager';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { Haptics, webVibrationBackend } from './haptics/Haptics';
import { connectNativeApp, isNativeApp, nativeHapticsBackend } from './native/nativeApp';
import { DayClock } from './daily/dayKey';
import { Rewards } from './rewards/Rewards';
import { AchievementsScreen } from './ui/AchievementsScreen';
import { DailyDialog } from './ui/DailyDialog';
import { Diagnostics } from './ui/Diagnostics';
import { LeagueService } from './league/LeagueService';
import { LeagueScreen } from './ui/LeagueScreen';
import { LeagueResultDialog } from './ui/LeagueResultDialog';
import { LEVELS } from './levels';
import { ProfileStorage } from './profile/Profile';
import { StatsStorage } from './profile/Stats';
import { ProgressStorage } from './progress/ProgressStorage';
import { DailyLogStorage } from './recap/DailyLog';
import { pickInsight, RecapStorage } from './recap/insights';
import { Appearance } from './settings/Appearance';
import { SettingsStore } from './settings/Settings';
import { GameScene } from './scenes/GameScene';
import { CompleteDialog } from './ui/CompleteDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { requireElement } from './ui/dom';
import { boardArea, GameLayout } from './ui/GameLayout';
import { GameOverDialog } from './ui/GameOverDialog';
import { HomeScreen } from './ui/HomeScreen';
import { Hud } from './ui/Hud';
import { LevelSelect } from './ui/LevelSelect';
import { AvatarPicker, CountryPicker } from './ui/Pickers';
import { ProfileScreen } from './ui/ProfileScreen';
import { RecordsScreen } from './ui/RecordsScreen';
import { RecapScreen } from './ui/RecapScreen';
import { Screens } from './ui/Screens';
import { SettingsScreen } from './ui/SettingsScreen';
import { BoosterBar } from './ui/BoosterBar';
import { admobBackend } from './ads/admobBackend';
import { ACTIVE_AD_CONFIG } from './ads/config';
import { NO_ADS_BACKEND, RewardedAds } from './ads/RewardedAds';
import { ShopScreen } from './ui/ShopScreen';
import { QuickSettings } from './ui/QuickSettings';
import { ThemePicker } from './ui/ThemePicker';
import { Toast } from './ui/Toast';

// Settings first: the theme and motion preferences must be in place before anything draws.
const settings = new SettingsStore();
const appearance = new Appearance(settings, {
  root: document.documentElement,
  themeColor: document.getElementById('theme-color'),
  matchMedia: (query) => window.matchMedia(query),
});
const audio = new AudioManager(settings.current);
audio.listenForGestures(document);
// In the Android app vibration goes through the native Haptics plugin; in browsers, the Vibration API.
const haptics = new Haptics(
  () => settings.current.haptics,
  isNativeApp() ? nativeHapticsBackend() : webVibrationBackend(),
  undefined,
  () => settings.current.hapticStrength,
);
const feedback = new Feedback(audio, haptics);
const emit = (event: FeedbackEvent) => feedback.handle(event);

// Every enabled button in the app gives a soft tap sound (no vibration: taps already feel like taps).
document.getElementById('app')?.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest?.('button');
  if (button && !button.disabled) emit({ type: 'tap' });
});

const state = new GameState(LEVELS[0]);
const hud = new Hud((id) => LEVELS[id - 1]);
state.subscribe((snapshot) => hud.update(snapshot));

// The scene and the UI report back to the app, which is created right after them.
let app: App | undefined;
/** Rewarded ads (created below, once the wallet exists); true while one covers the game. */
let ads: RewardedAds | undefined;
let adShowing = false;
const boardSlot = requireElement('board-slot');
const gameUi = requireElement('game-ui');
const hudBar = requireElement('hud');
const scene = new GameScene(state, {
  boardSlot,
  boardArea: () => boardArea(gameUi, hudBar),
  onLevelSolved: () => app?.handleLevelSolved(),
  onCelebrationEnd: () => app?.handleCelebrationEnd(),
  onLevelLost: () => app?.handleLevelLost(),
  onLevelFailed: () => app?.handleLevelFailed(),
  onFeedback: (event) => {
    emit(event);
    app?.handleGameEvent(event); // one-time rule tips (first lost heart, chain, streak bonus)
  },
  onViewChange: (zoomed, zoomable) => {
    hud.setZoomed(zoomed);
    if (zoomable) app?.zoomHint();
  },
});
hud.onResetView(() => scene.resetView());
// Theme changes apply at once (the board just redraws); the level timer pauses while the picker is open.
const themePicker = new ThemePicker({
  onOpen: () => app?.themePickerOpened(),
  onClose: () => app?.themePickerClosed(),
  onPick: (theme) => settings.update({ theme }),
  current: () => settings.current.theme,
});
// Music, sound effects and vibration in the same card; they apply at once like every setting.
const quickSettings = new QuickSettings((patch) => settings.update(patch), haptics.supported);
const completeDialog = new CompleteDialog({
  onNext: () => app?.nextLevel(),
  onReplay: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelsOrLeague(),
  onPlayFromStart: () => app?.playFromStart(),
});
const gameOverDialog = new GameOverDialog({
  onTryAgain: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelsOrLeague(),
  onContinue: () => void app?.continueWithAd(),
});
const home = new HomeScreen(LEVELS, {
  onPlay: (id) => void app?.openLevel(id),
  onLevels: () => void app?.showLevelSelect(),
  onProfile: () => void app?.showProfile(),
  onSettings: () => void app?.showSettings(),
  onDaily: () => app?.openDaily(),
  onAchievements: () => void app?.showAchievements(),
  onLeague: () => void app?.showLeague(),
  onShop: () => void app?.showShop(),
});
const profileScreen = new ProfileScreen(LEVELS, {
  onBack: () => void app?.goBack(),
  onRename: (name) => app?.renameTo(name),
  onChangeAvatar: () => app?.chooseAvatar(),
  onChangeCountry: () => app?.chooseCountry(),
  onAchievements: () => void app?.showAchievements(),
  onRecords: () => void app?.showRecords(),
});
const recordsScreen = new RecordsScreen(LEVELS, () => void app?.goBack());

// Daily check-in, Energy Credits and achievements: one saved record. Achievements
// read the latest progress and statistics from the app.
const rewards = new Rewards({
  levels: LEVELS,
  records: () => ({ progress: app!.currentProgress, stats: app!.currentStats }),
});
// Daily League: its own record; milestone credits reach the wallet through an idempotent outbox.
const dayClock = new DayClock();
const league = new LeagueService(LEVELS, (tx) => rewards.grant(dayClock.today, tx));
const leagueScreen = new LeagueScreen(
  () => void app?.goBack(),
  (number) => void app?.openChallenge(number),
);
const dailyDialog = new DailyDialog(
  () => app?.claimDaily(),
  () => void app?.showShop(),
);
const achievementsScreen = new AchievementsScreen(() => void app?.goBack());

const game = createGame(requireElement('stage'), scene);
// Sizes the board slot; the scene re-fits the board whenever the slot changes.
const gameLayout = new GameLayout(gameUi, hudBar, boardSlot, () => scene.relayout());

app = new App({
  levels: LEVELS,
  storage: new ProgressStorage(LEVELS.length),
  profileStorage: new ProfileStorage(),
  statsStorage: new StatsStorage(),
  dailyLogStorage: new DailyLogStorage(() => dayClock.today),
  state,
  scene,
  game,
  screens: new Screens(),
  home,
  levelSelect: new LevelSelect(LEVELS),
  profileScreen,
  recordsScreen,
  hud,
  themePicker,
  gameLayout,
  completeDialog,
  confirmDialog: new ConfirmDialog(),
  gameOverDialog,
  avatarPicker: new AvatarPicker(),
  countryPicker: new CountryPicker(),
  toast: new Toast(),
  settings,
  feedback: emit,
  rewards,
  dayClock,
  league,
  leagueScreen,
  leagueResult: new LeagueResultDialog(),
  dailyDialog,
  achievementsScreen,
  boosterBar: new BoosterBar((id) => app?.useBooster(id)),
  shopScreen: new ShopScreen({
    onBack: () => void app?.goBack(),
    onBuy: (id) => void app?.buyCosmetic(id),
    onEquip: (slot, id) => app?.equipCosmetic(slot, id),
    onPlay: () => void app?.continueFromShop(),
    onWatchAd: () => void app?.watchAd(),
  }),
  get ads() {
    return ads;
  },
});
// Cold launch: the Mr. White Games splash (already on screen from index.html),
// then optionally one recap insight, then Home, which is ready underneath.
// The intro is in place before start() settles the league, so a result waits for it.
const recapScreen = new RecapScreen();
let markIntroDone = () => {};
const introDone = new Promise<void>((resolve) => (markIntroDone = resolve));
const recapStorage = new RecapStorage();
app.start(() => recapScreen.close('skip'));
void runIntro({
  splash: new StudioSplash(document.getElementById('studio-splash'), {
    reducedMotion: appearance.current.reducedMotion,
    session: sessionStore(),
    startedAt: firstPaintStart(), // the reveal began at first paint (index.html)
  }),
  recap: recapScreen,
  recapEnabled: () => settings.current.showRecap,
  nextInsight: () => {
    const picked = pickInsight(app!.recapRecords, recapStorage.load().next);
    if (picked) recapStorage.save({ next: picked.next });
    return picked?.insight ?? null;
  },
}).finally(() => {
  app!.endIntro();
  markIntroDone();
});

// Hidden performance overlay for real devices (Settings: tap Version 5 times).
const diagnostics = new Diagnostics(game, () => {
  const zoom = (scene as unknown as { viewport?: { zoom: number } }).viewport?.zoom ?? 1;
  return `${state.getArrows().length} arrows · ${state.rows}×${state.cols} · zoom ${zoom.toFixed(2)}× · haptics ${haptics.kind}`;
});

// Created after the diagnostics overlay it can switch on. Its controls only
// touch its own elements, so this placement changes no event order.
const settingsScreen = new SettingsScreen(
  {
    onBack: () => void app?.goBack(),
    onChange: (patch) => settings.update(patch),
    onPreviewSfx: () => audio.play('release'),
    onToggleDiagnostics: () => (diagnostics.toggle() ? 'diagnostics on' : 'diagnostics off'),
    onAdPrivacyOptions: () => void app?.openAdPrivacyOptions(),
    onTestVibration: async () => {
      const result = await haptics.test();
      if (result.status === 'unsupported') return "This device can't vibrate.";
      if (result.status === 'failed') return "The vibration couldn't be started. Check that the app may vibrate.";
      return isNativeApp()
        ? "Sent. Felt nothing? Check Android Settings → Sound & vibration → Vibration & haptics (media vibration, battery saver, Do not disturb)."
        : 'Sent. Browsers on computers usually have no vibration motor.';
    },
    onReset: () => void app?.resetSettings(),
  },
  { vibration: haptics.supported, audio: typeof AudioContext !== 'undefined' },
  __APP_VERSION__,
);

// Apply settings now and whenever they (or the device's theme / motion preference) change.
// Nothing is rebuilt: the board just redraws, so a level in progress carries on.
const applySettings = () => {
  const current = settings.current;
  audio.applySettings(current);
  hud.setTimerVisible(current.showTimer);
  if (!current.haptics) haptics.stop();
  settingsScreen.render(current, appearance.current);
  settingsScreen.setAudioUnavailable(audio.isUnavailable);
  quickSettings.render(current);
};
settings.subscribe(applySettings);
appearance.onChange(() => {
  scene.refreshTheme();
  settingsScreen.render(settings.current, appearance.current);
});
applySettings();

// Backgrounded app: pause the level timer and save play time, silence music and
// effects, stop any vibration; resume when visible. Browsers report this with
// visibilitychange; the Android app also with native pause/resume. Repeats are harmless.
const setBackground = (hidden: boolean) => {
  app!.setBackground(hidden);
  audio.setHidden(hidden || adShowing); // an ad on screen keeps the game silent until it closes
  if (hidden) haptics.stop();
  else settingsScreen.setAudioUnavailable(audio.isUnavailable);
};
document.addEventListener('visibilitychange', () => setBackground(document.hidden));
audio.setHidden(document.hidden);

// Rewarded ads (Android app only; browsers have no ad SDK and never load it).
// Consent is gathered once the intro is over, then one ad is preloaded. While an
// ad is on screen the level clock pauses, game audio is silent, and a shield
// blocks taps on the game; all of it is undone when the ad closes.
const adShield = document.getElementById('ad-shield');
ads = new RewardedAds({
  backend: isNativeApp() ? admobBackend(ACTIVE_AD_CONFIG) : NO_ADS_BACKEND,
  ledger: {
    remaining: (today) => rewards.remainingAdRewards(today),
    nextRewardId: (today) => rewards.nextAdRewardId(today),
    grant: (today, rewardId) => rewards.grantAdReward(today, rewardId),
  },
  today: () => dayClock.refresh(),
  onChange: () => {
    app?.renderShop();
    settingsScreen.setAdPrivacyOptions(ads?.privacyOptionsRequired ?? false);
  },
  onShowing: (showing) => {
    adShowing = showing;
    app!.setAdShowing(showing);
    audio.setHidden(showing || document.hidden);
    if (showing) haptics.stop();
    if (adShield) adShield.hidden = !showing;
  },
  log: (message) => console.warn(message),
});
app.renderShop();
introDone.then(() => app!.startAdsIfEligible()); // not before the ad-free start is over

// Android: the Back button/gesture follows the game's own navigation and dialogs.
connectNativeApp({ onBack: () => app!.handleBack(true), onBackground: setBackground });

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state, settings, audio, rewards, league, dayClock } });
}
