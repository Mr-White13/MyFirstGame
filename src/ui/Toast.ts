import { requireElement } from './dom';

/** A short, self-dismissing message at the bottom of the screen (e.g. "Coming soon"). */
export class Toast {
  private readonly element = requireElement('toast');
  private timer = 0;

  show(message: string, durationMs = 1800): void {
    window.clearTimeout(this.timer);
    this.element.textContent = message;
    this.element.hidden = false;
    // Next frame, so the CSS transition runs from the hidden state.
    requestAnimationFrame(() => this.element.classList.add('toast--visible'));
    this.timer = window.setTimeout(() => {
      this.element.classList.remove('toast--visible');
      this.timer = window.setTimeout(() => (this.element.hidden = true), 250);
    }, durationMs);
  }
}
