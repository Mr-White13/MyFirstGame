export type ScreenName = 'home' | 'levels' | 'game' | 'profile';

/**
 * Where "back" goes. A small history of screens with two rules:
 * - Home is the root: going home clears the history.
 * - Gameplay is never a back target: once the player leaves a level, it is
 *   dropped from the history, so back from Levels never returns into a
 *   finished or abandoned game.
 * Revisiting a screen already in the history returns to it rather than
 * stacking a duplicate, so the history can't grow without bound.
 */
export class NavigationHistory {
  private stack: ScreenName[] = ['home'];

  get current(): ScreenName {
    return this.stack[this.stack.length - 1];
  }

  /** The screen "back" would show from the current one. */
  get backTarget(): ScreenName {
    return this.stack[this.stack.length - 2] ?? 'home';
  }

  go(screen: ScreenName): void {
    if (screen === 'home') {
      this.stack = ['home'];
      return;
    }
    if (this.current === screen) return;
    if (screen !== 'game') this.stack = this.stack.filter((s) => s !== 'game');
    const existing = this.stack.indexOf(screen);
    if (existing >= 0) this.stack = this.stack.slice(0, existing + 1);
    else this.stack.push(screen);
  }

  /** Leaves the current screen; returns the screen now shown. */
  back(): ScreenName {
    if (this.stack.length > 1) this.stack.pop();
    while (this.current === 'game' && this.stack.length > 1) this.stack.pop();
    return this.current;
  }
}
