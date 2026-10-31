import { requireElement } from './dom';

export type ToastKind = 'info' | 'achievement' | 'reward';

/**
 * A short, self-dismissing message at the bottom of the screen ("Settings
 * reset", "Achievement unlocked"). It never blocks input and never needs
 * dismissing; a new message replaces the current one.
 */
export class Toast {
  private readonly element = requireElement('toast');
  private timer = 0;

  show(message: string, durationMs = 1800, kind: ToastKind = 'info'): void {
    window.clearTimeout(this.timer);
    this.element.textContent = message;
    this.element.dataset.kind = kind;
    this.element.hidden = false;
    // Next frame, so the CSS transition runs from the hidden state.
    requestAnimationFrame(() => this.element.classList.add('toast--visible'));
    this.timer = window.setTimeout(() => {
      this.element.classList.remove('toast--visible');
      this.timer = window.setTimeout(() => (this.element.hidden = true), 250);
    }, durationMs);
  }
}
