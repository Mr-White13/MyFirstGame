import './style.css';
import { App } from './app/App';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { LEVELS } from './levels';
import { ProgressStorage } from './progress/ProgressStorage';
import { GameScene } from './scenes/GameScene';
import { CompleteDialog } from './ui/CompleteDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { GameOverDialog } from './ui/GameOverDialog';
import { requireElement } from './ui/dom';
import { GameLayout } from './ui/GameLayout';
import { Hud } from './ui/Hud';
import { LevelSelect } from './ui/LevelSelect';
import { Screens } from './ui/Screens';

const state = new GameState(LEVELS[0]);
const hud = new Hud();
state.subscribe((snapshot) => hud.update(snapshot));

// The scene and dialogs report back to the app, which is created right after them.
let app: App | undefined;
const boardSlot = requireElement('board-slot');
const scene = new GameScene(state, {
  boardSlot,
  onLevelSolved: () => app?.handleLevelSolved(),
  onCelebrationEnd: () => app?.handleCelebrationEnd(),
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

const game = createGame(requireElement('stage'), scene);
// Sizes the board slot; the scene re-fits the board whenever the slot changes.
const gameLayout = new GameLayout(requireElement('game-ui'), requireElement('hud'), boardSlot, () => scene.relayout());

app = new App({
  levels: LEVELS,
  storage: new ProgressStorage(LEVELS.length),
  state,
  scene,
  game,
  screens: new Screens(),
  levelSelect: new LevelSelect(LEVELS),
  hud,
  gameLayout,
  completeDialog,
  confirmDialog: new ConfirmDialog(),
  gameOverDialog,
});
app.start();

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { app, game, scene, state } });
}
