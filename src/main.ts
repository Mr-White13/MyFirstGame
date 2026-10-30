import './style.css';
import { App } from './app/App';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { LEVELS } from './levels';
import { ProfileStorage } from './profile/Profile';
import { StatsStorage } from './profile/Stats';
import { ProgressStorage } from './progress/ProgressStorage';
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
import { Toast } from './ui/Toast';

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
  onComingSoon: (feature) => app?.comingSoon(feature),
});
const profileScreen = new ProfileScreen(LEVELS, {
  onBack: () => void app?.goBack(),
  onRename: (name) => app?.renameTo(name),
  onChangeAvatar: () => app?.chooseAvatar(),
  onChangeCountry: () => app?.chooseCountry(),
});

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
});
app.start();

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state } });
}
