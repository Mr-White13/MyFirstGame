import { reducedMotion } from '../render/motion';

export function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

/** The resolved reduced-motion preference (player setting, or the device's when set to Auto). */
export const prefersReducedMotion = (): boolean => reducedMotion();

/** Must match the landscape media query in style.css. */
export const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 520px)';

/** Must match the screen/overlay transition durations in style.css. */
export const TRANSITION_MS = 220;

/**
 * A full-screen dialog layer. Fades in via the `overlay--visible` class (added
 * a frame after un-hiding so the CSS transition runs) and fades out before
 * being hidden again. While it fades out it no longer counts as open and
 * ignores clicks, so a double tap can't trigger a button twice.
 */
export class Overlay {
  private frame = 0;
  private hideTimer = 0;
  private open = false;

  constructor(readonly element: HTMLElement) {}

  get isOpen(): boolean {
    return this.open;
  }

  show(focusTarget?: HTMLElement): void {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.hideTimer);
    this.open = true;
    this.element.inert = false;
    this.element.classList.remove('overlay--visible');
    this.element.hidden = false;
    this.frame = requestAnimationFrame(() => this.element.classList.add('overlay--visible'));
    focusTarget?.focus({ preventScroll: true });
  }

  hide(): void {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.hideTimer);
    if (!this.open && this.element.hidden) return;
    this.open = false;
    this.element.inert = true; // no clicks or focus while fading out
    this.element.classList.remove('overlay--visible');
    const duration = prefersReducedMotion() ? 0 : TRANSITION_MS;
    this.hideTimer = window.setTimeout(() => {
      this.element.hidden = true;
    }, duration);
  }
}
