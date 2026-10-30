import './style.css';
import { App } from './app/App';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { LEVELS } from './levels';
import { ProgressStorage } from './progress/ProgressStorage';
import { GameScene } from './scenes/GameScene';
import { CompleteDialog } from './ui/CompleteDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { requireElement } from './ui/dom';
import { Hud } from './ui/Hud';
import { LevelSelect } from './ui/LevelSelect';
import { Screens } from './ui/Screens';

const state = new GameState(LEVELS[0]);
const hud = new Hud();
state.subscribe((snapshot) => hud.update(snapshot));

// The scene and dialogs report back to the app, which is created right after them.
let app: App | undefined;
const scene = new GameScene(state, {
  onLevelSolved: () => app?.handleLevelSolved(),
  onCelebrationEnd: () => app?.handleCelebrationEnd(),
});
const completeDialog = new CompleteDialog({
  onNext: () => app?.nextLevel(),
  onReplay: () => app?.restartLevel(),
  onLevels: () => void app?.showLevelSelect(),
  onPlayFromStart: () => app?.playFromStart(),
});

const game = createGame(requireElement('board'), scene);

app = new App({
  levels: LEVELS,
  storage: new ProgressStorage(LEVELS.length),
  state,
  scene,
  game,
  screens: new Screens(),
  levelSelect: new LevelSelect(LEVELS),
  hud,
  completeDialog,
  confirmDialog: new ConfirmDialog(),
});
app.start();

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state } });
}
