import { prefersReducedMotion } from './dom';

/** Pieces per burst at normal effects; "low" effects use a third. */
const PIECES = 90;
/** The longest piece's fall plus delay; the layer is removed after this. */
const LIFETIME_MS = 3200;
const COLORS = ['var(--cyan)', 'var(--purple)', 'var(--orange)', 'var(--green)', 'var(--pink)'];

/**
 * A short confetti burst over the whole screen when a level is completed.
 * Plain DOM and CSS (only transform and opacity animate), above the
 * completion dialog and never catching taps. Nothing with reduced motion or
 * effects off.
 */
export class Confetti {
  private layer: HTMLElement | null = null;
  private timer = 0;

  burst(): void {
    const effects = document.documentElement.dataset.effects;
    if (prefersReducedMotion() || effects === 'off') return;
    this.clear();
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    const count = effects === 'low' ? Math.round(PIECES / 3) : PIECES;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('i');
      const style = piece.style;
      style.left = `${Math.random() * 100}%`;
      style.background = COLORS[i % COLORS.length];
      style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
      style.setProperty('--spin', `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540)}deg`);
      style.animationDuration = `${1800 + Math.random() * 900}ms`;
      style.animationDelay = `${Math.random() * 450}ms`;
      if (i % 3 === 0) piece.classList.add('confetti__strip');
      layer.append(piece);
    }
    document.body.append(layer);
    this.layer = layer;
    this.timer = window.setTimeout(() => this.clear(), LIFETIME_MS);
  }

  private clear(): void {
    window.clearTimeout(this.timer);
    this.layer?.remove();
    this.layer = null;
  }
}
