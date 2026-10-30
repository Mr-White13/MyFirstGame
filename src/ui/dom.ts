export function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Must match the screen/overlay transition durations in style.css. */
export const TRANSITION_MS = 220;

/**
 * A full-screen dialog layer. Fades in via the `overlay--visible` class; the
 * class is added a frame after un-hiding so the CSS transition actually runs.
 */
export class Overlay {
  private frame = 0;

  constructor(readonly element: HTMLElement) {}

  get isOpen(): boolean {
    return !this.element.hidden;
  }

  show(focusTarget?: HTMLElement): void {
    cancelAnimationFrame(this.frame);
    this.element.classList.remove('overlay--visible');
    this.element.hidden = false;
    this.frame = requestAnimationFrame(() => this.element.classList.add('overlay--visible'));
    focusTarget?.focus({ preventScroll: true });
  }

  hide(): void {
    cancelAnimationFrame(this.frame);
    this.element.classList.remove('overlay--visible');
    this.element.hidden = true;
  }
}
