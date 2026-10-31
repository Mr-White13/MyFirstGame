import Phaser from 'phaser';
import { FrameStats } from './frameStats';

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
 * (Phaser's measured rate), frame times over the last half second (average
 * and worst interval, share of frames over 20 ms, CPU work per frame), arrows
 * on the board and the current zoom. Hidden unless diagnostics are switched
 * on (tap Version in Settings five times). Costs nothing while off.
 */
export class Diagnostics {
  private readonly element: HTMLElement;
  private timer = 0;
  private readonly stats = new FrameStats();
  private frameStart = 0;
  private lastFrame = 0;
  private readonly onPreStep = () => {
    const now = performance.now();
    if (this.lastFrame > 0) this.pendingInterval = now - this.lastFrame;
    this.lastFrame = now;
    this.frameStart = now;
  };
  private pendingInterval = 0;
  private readonly onPostRender = () => {
    if (this.pendingInterval > 0) this.stats.add(this.pendingInterval, performance.now() - this.frameStart);
  };

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
    this.game.events.off(Phaser.Core.Events.PRE_STEP, this.onPreStep).on(Phaser.Core.Events.PRE_STEP, this.onPreStep);
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.onPostRender).on(Phaser.Core.Events.POST_RENDER, this.onPostRender);
    const update = () => {
      const fps = Math.round(this.game.loop.actualFps);
      const running = this.game.loop.running;
      const f = this.stats.take();
      const times = f ? ` · ${f.avg.toFixed(1)}/${f.worst.toFixed(0)} ms · ${Math.round(f.slowShare * 100)}% >20 ms · cpu ${f.work.toFixed(1)} ms` : '';
      this.element.textContent = `${running ? `${fps} fps` : 'idle'}${times} · ${this.describe()}`;
    };
    update();
    this.timer = window.setInterval(update, 500);
  }

  private stop(): void {
    window.clearInterval(this.timer);
    this.game.events.off(Phaser.Core.Events.PRE_STEP, this.onPreStep);
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.onPostRender);
    this.lastFrame = 0;
    this.element.hidden = true;
  }
}
