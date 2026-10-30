import Phaser from 'phaser';

const devicePixelRatio = (): number => Math.min(window.devicePixelRatio || 1, 3);

/**
 * Creates the Phaser game inside `parent`, filling it completely.
 *
 * Phaser 3 has no built-in high-DPI support, so the canvas is rendered at
 * device-pixel size and displayed at CSS size via `zoom = 1 / dpr`. This keeps
 * arrows crisp on phone screens; input coordinates are mapped by Phaser.
 */
export function createGame(parent: HTMLElement, scene: Phaser.Scene): Phaser.Game {
  let ratio = devicePixelRatio();
  const size = () => ({ width: Math.max(1, parent.clientWidth), height: Math.max(1, parent.clientHeight) });
  const initial = size();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    antialias: true,
    disableContextMenu: true, // no long-press / right-click menu on the board
    scene,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(initial.width * ratio),
      height: Math.round(initial.height * ratio),
      zoom: 1 / ratio,
      autoRound: false,
    },
    input: { activePointers: 1 }, // a single touch: no accidental multi-finger moves
  });

  const fit = () => {
    if (!game.isBooted) return;
    const nextRatio = devicePixelRatio();
    if (nextRatio !== ratio) {
      ratio = nextRatio;
      game.scale.setZoom(1 / ratio);
    }
    const { width, height } = size();
    game.scale.resize(Math.round(width * ratio), Math.round(height * ratio));
    // Phaser only writes the canvas CSS size when it differs from the game size,
    // so after a DPR change back to 1 the old (zoomed) CSS size would stick.
    game.canvas.style.width = `${width}px`;
    game.canvas.style.height = `${height}px`;
    // Re-measure the canvas so pointer coordinates map correctly to the new CSS size.
    game.scale.refresh();
  };

  // Follow the container size (rotation, browser chrome, DevTools device switch).
  // The container can also change size between config and boot, so fit once when ready.
  // A pixel-ratio change alone (browser zoom, moving to another monitor) doesn't
  // resize the container, but does fire a window resize.
  const observer = new ResizeObserver(fit);
  observer.observe(parent);
  window.addEventListener('resize', fit);
  game.events.once(Phaser.Core.Events.READY, fit);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    observer.disconnect();
    window.removeEventListener('resize', fit);
  });

  return game;
}
