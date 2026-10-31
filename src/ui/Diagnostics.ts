import type Phaser from 'phaser';

const KEY = 'neon-escape.debug';

/** Developer diagnostics flag (also enables detailed haptics logging, see native/nativeApp.ts). */
export function diagnosticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function setDiagnostics(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // no storage: the overlay still works for this session
  }
}

/**
 * A tiny performance overlay for checking real devices: frames per second
 * (Phaser's measured rate), arrows on the board and the current zoom. Hidden
 * unless diagnostics are switched on (tap Version in Settings five times).
 * Updates twice a second; costs nothing while off.
 */
export class Diagnostics {
  private readonly element: HTMLElement;
  private timer = 0;

  constructor(
    private readonly game: Phaser.Game,
    private readonly describe: () => string,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'diagnostics';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    document.body.append(this.element);
    if (diagnosticsEnabled()) this.start();
  }

  /** Switches diagnostics on or off; returns the new state. */
  toggle(): boolean {
    const on = !diagnosticsEnabled();
    setDiagnostics(on);
    if (on) this.start();
    else this.stop();
    return on;
  }

  private start(): void {
    this.element.hidden = false;
    window.clearInterval(this.timer);
    const update = () => {
      const fps = Math.round(this.game.loop.actualFps);
      const running = this.game.loop.running;
      this.element.textContent = `${running ? `${fps} fps` : 'idle'} · ${this.describe()}`;
    };
    update();
    this.timer = window.setInterval(update, 500);
  }

  private stop(): void {
    window.clearInterval(this.timer);
    this.element.hidden = true;
  }
}
