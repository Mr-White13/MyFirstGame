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

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    antialias: true,
    scene,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.max(1, parent.clientWidth * ratio),
      height: Math.max(1, parent.clientHeight * ratio),
      zoom: 1 / ratio,
      autoRound: false,
    },
    input: { activePointers: 1 },
  });

  // Follow the container size (rotation, browser chrome, DevTools device switch).
  const observer = new ResizeObserver(() => {
    if (!game.isBooted) return;
    const nextRatio = devicePixelRatio();
    if (nextRatio !== ratio) {
      ratio = nextRatio;
      game.scale.setZoom(1 / ratio);
    }
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    game.scale.resize(width * ratio, height * ratio);
    // Phaser only writes the canvas CSS size when it differs from the game size,
    // so after a DPR change back to 1 the old (zoomed) CSS size would stick.
    game.canvas.style.width = `${width}px`;
    game.canvas.style.height = `${height}px`;
    // Re-measure the canvas so pointer coordinates map correctly to the new CSS size.
    game.scale.refresh();
  });
  observer.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());

  return game;
}
