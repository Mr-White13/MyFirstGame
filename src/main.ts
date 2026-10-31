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
import { GameLayout } from './ui/GameLayout';
import { GameOverDialog } from './ui/GameOverDialog';
import { HomeScreen } from './ui/HomeScreen';
import { Hud } from './ui/Hud';
import { LevelSelect } from './ui/LevelSelect';
import { AvatarPicker, CountryPicker } from './ui/Pickers';
import { ProfileScreen } from './ui/ProfileScreen';
import { RecordsScreen } from './ui/RecordsScreen';
import { RecapDialog } from './ui/RecapDialog';
import { Screens } from './ui/Screens';
import { SettingsScreen } from './ui/SettingsScreen';
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
const haptics = new Haptics(() => settings.current.haptics, isNativeApp() ? nativeHapticsBackend() : webVibrationBackend());
const feedback = new Feedback(audio, haptics);
const emit = (event: FeedbackEvent) => feedback.handle(event);

// Every enabled button in the app gives a soft tap sound (no vibration: taps already feel like taps).
document.getElementById('app')?.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest?.('button');
  if (button && !button.disabled) emit({ type: 'tap' });
});

const state = new GameState(LEVELS[0]);
const hud = new Hud();
state.subscribe((snapshot) => hud.update(snapshot));

// The scene and the UI report back to the app, which is created right after them.
let app: App | undefined;
const boardSlot = requireElement('board-slot');
const scene = new GameScene(state, {
  boardSlot,
  onLevelSolved: () => app?.handleLevelSolved(),
  onCelebrationEnd: () => app?.handleCelebrationEnd(),
  onLevelLost: () => app?.handleLevelLost(),
  onLevelFailed: () => app?.handleLevelFailed(),
  onFeedback: emit,
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
const completeDialog = new CompleteDialog({
  onNext: () => app?.nextLevel(),
  onReplay: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelsOrLeague(),
  onPlayFromStart: () => app?.playFromStart(),
});
const gameOverDialog = new GameOverDialog({
  onTryAgain: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelsOrLeague(),
});
const home = new HomeScreen(LEVELS, {
  onPlay: (id) => void app?.openLevel(id),
  onLevels: () => void app?.showLevelSelect(),
  onProfile: () => void app?.showProfile(),
  onSettings: () => void app?.showSettings(),
  onDaily: () => app?.openDaily(),
  onAchievements: () => void app?.showAchievements(),
  onLeague: () => void app?.showLeague(),
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

const settingsScreen = new SettingsScreen(
  {
    onBack: () => void app?.goBack(),
    onChange: (patch) => settings.update(patch),
    onPreviewSfx: () => audio.play('release'),
    onToggleDiagnostics: () => (diagnostics.toggle() ? 'diagnostics on' : 'diagnostics off'),
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
const dailyDialog = new DailyDialog(() => app?.claimDaily());
const achievementsScreen = new AchievementsScreen(() => void app?.goBack());

const game = createGame(requireElement('stage'), scene);
// Sizes the board slot; the scene re-fits the board whenever the slot changes.
const gameLayout = new GameLayout(requireElement('game-ui'), requireElement('hud'), boardSlot, () => scene.relayout());

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
});
app.start();

// Cold launch: the Mr. White Games splash (already on screen from index.html),
// then optionally one recap insight, then Home, which is ready underneath.
const recapDialog = new RecapDialog();
const recapStorage = new RecapStorage();
app.beginIntro(() => recapDialog.close('skip'));
void runIntro({
  splash: new StudioSplash(document.getElementById('studio-splash'), {
    reducedMotion: appearance.current.reducedMotion,
    session: sessionStore(),
    startedAt: firstPaintStart(), // the reveal began at first paint (index.html)
  }),
  recap: recapDialog,
  recapEnabled: () => settings.current.showRecap,
  nextInsight: () => {
    const picked = pickInsight(app!.recapRecords, recapStorage.load().next);
    if (picked) recapStorage.save({ next: picked.next });
    return picked?.insight ?? null;
  },
}).finally(() => app!.endIntro());

// Hidden performance overlay for real devices (Settings: tap Version 5 times).
const diagnostics = new Diagnostics(game, () => {
  const zoom = (scene as unknown as { viewport?: { zoom: number } }).viewport?.zoom ?? 1;
  return `${state.getArrows().length} arrows · ${state.rows}×${state.cols} · zoom ${zoom.toFixed(2)}× · haptics ${haptics.kind}`;
});

// Apply settings now and whenever they (or the device's theme / motion preference) change.
// Nothing is rebuilt: the board just redraws, so a level in progress carries on.
const applySettings = () => {
  const current = settings.current;
  audio.applySettings(current);
  hud.setTimerVisible(current.showTimer);
  if (!current.haptics) haptics.stop();
  settingsScreen.render(current, appearance.current);
  settingsScreen.setAudioUnavailable(audio.isUnavailable);
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
  audio.setHidden(hidden);
  if (hidden) haptics.stop();
  else settingsScreen.setAudioUnavailable(audio.isUnavailable);
};
document.addEventListener('visibilitychange', () => setBackground(document.hidden));
audio.setHidden(document.hidden);

// Android: the Back button/gesture follows the game's own navigation and dialogs.
connectNativeApp({ onBack: () => app!.handleBack(true), onBackground: setBackground });

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state, settings, audio, rewards, league, dayClock } });
}
