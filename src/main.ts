import './style.css';
import { GameState } from './core/GameState';
import { createGame } from './createGame';
import { level1 } from './levels/level1';
import { GameScene } from './scenes/GameScene';
import { Hud } from './ui/Hud';

const state = new GameState(level1);
const hud = new Hud();

const scene = new GameScene(state, {
  onLevelComplete: () => hud.showWin(state.snapshot().moves),
});

state.subscribe((snapshot) => hud.update(snapshot));
hud.onRestart(() => {
  hud.hideWin();
  scene.restartLevel();
});

const boardElement = document.getElementById('board');
if (!boardElement) throw new Error('Missing #board in index.html');
const game = createGame(boardElement, scene);

// Handy for inspecting the game from DevTools during development.
if (import.meta.env.DEV) {
  Object.assign(window, { neon: { game, scene, state } });
}
