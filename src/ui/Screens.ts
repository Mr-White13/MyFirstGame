import type { ScreenName } from '../app/Navigation';
import { prefersReducedMotion, requireElement, TRANSITION_MS } from './dom';

export type { ScreenName } from '../app/Navigation';

/**
 * Switches between the full-screen views. Inactive screens stay in the
 * layout (so the game canvas keeps its size) but are invisible and `inert`,
 * which removes them from focus and pointer input.
 */
export class Screens {
  private readonly screens: Record<ScreenName, HTMLElement> = {
    home: requireElement('screen-home'),
    levels: requireElement('screen-levels'),
    game: requireElement('screen-game'),
    profile: requireElement('screen-profile'),
    settings: requireElement('screen-settings'),
    achievements: requireElement('screen-achievements'),
  };
  private current: ScreenName | null = null;

  get active(): ScreenName | null {
    return this.current;
  }

  /** Resolves once the transition has finished. */
  show(name: ScreenName): Promise<void> {
    if (this.current === name) return Promise.resolve();
    const first = this.current === null;
    this.current = name;
    for (const [key, el] of Object.entries(this.screens) as [ScreenName, HTMLElement][]) {
      const active = key === name;
      el.classList.toggle('screen--active', active);
      el.inert = !active;
      el.setAttribute('aria-hidden', String(!active));
    }
    const duration = first || prefersReducedMotion() ? 0 : TRANSITION_MS;
    return new Promise((resolve) => setTimeout(resolve, duration));
  }
}
