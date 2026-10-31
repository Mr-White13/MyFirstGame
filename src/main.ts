import './style.css';
import { App } from './app/App';
import { Feedback, type FeedbackEvent } from './app/Feedback';
import { AudioManager } from './audio/AudioManager';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { Haptics } from './haptics/Haptics';
import { LEVELS } from './levels';
import { ProfileStorage } from './profile/Profile';
import { StatsStorage } from './profile/Stats';
import { ProgressStorage } from './progress/ProgressStorage';
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
import { Screens } from './ui/Screens';
import { SettingsScreen } from './ui/SettingsScreen';
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
const haptics = new Haptics(() => settings.current.haptics);
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
});
const completeDialog = new CompleteDialog({
  onNext: () => app?.nextLevel(),
  onReplay: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelSelect(),
  onPlayFromStart: () => app?.playFromStart(),
});
const gameOverDialog = new GameOverDialog({
  onTryAgain: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelSelect(),
});
const home = new HomeScreen(LEVELS, {
  onPlay: (id) => void app?.openLevel(id),
  onLevels: () => void app?.showLevelSelect(),
  onProfile: () => void app?.showProfile(),
  onSettings: () => void app?.showSettings(),
  onComingSoon: (feature) => app?.comingSoon(feature),
});
const profileScreen = new ProfileScreen(LEVELS, {
  onBack: () => void app?.goBack(),
  onRename: (name) => app?.renameTo(name),
  onChangeAvatar: () => app?.chooseAvatar(),
  onChangeCountry: () => app?.chooseCountry(),
});

const settingsScreen = new SettingsScreen(
  {
    onBack: () => void app?.goBack(),
    onChange: (patch) => settings.update(patch),
    onPreviewSfx: () => audio.play('release'),
    onReset: () => void app?.resetSettings(),
  },
  { vibration: haptics.supported, audio: typeof AudioContext !== 'undefined' },
  __APP_VERSION__,
);

const game = createGame(requireElement('stage'), scene);
// Sizes the board slot; the scene re-fits the board whenever the slot changes.
const gameLayout = new GameLayout(requireElement('game-ui'), requireElement('hud'), boardSlot, () => scene.relayout());

app = new App({
  levels: LEVELS,
  storage: new ProgressStorage(LEVELS.length),
  profileStorage: new ProfileStorage(),
  statsStorage: new StatsStorage(),
  state,
  scene,
  game,
  screens: new Screens(),
  home,
  levelSelect: new LevelSelect(LEVELS),
  profileScreen,
  hud,
  gameLayout,
  completeDialog,
  confirmDialog: new ConfirmDialog(),
  gameOverDialog,
  avatarPicker: new AvatarPicker(),
  countryPicker: new CountryPicker(),
  toast: new Toast(),
  settings,
  feedback: emit,
});
app.start();

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

// Backgrounded app: silence music and effects, stop any vibration; resume when visible.
document.addEventListener('visibilitychange', () => {
  audio.setHidden(document.hidden);
  if (document.hidden) haptics.stop();
  else settingsScreen.setAudioUnavailable(audio.isUnavailable);
});
audio.setHidden(document.hidden);

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state, settings, audio } });
}
