import { describe, expect, it } from 'vitest';
import { NavigationHistory } from './Navigation';

describe('NavigationHistory', () => {
  it('starts on Home', () => {
    const nav = new NavigationHistory();
    expect(nav.current).toBe('home');
    expect(nav.backTarget).toBe('home');
  });

  it('Home → Levels → Game: back from the game returns to Levels, then Home', () => {
    const nav = new NavigationHistory();
    nav.go('levels');
    nav.go('game');
    expect(nav.backTarget).toBe('levels');
    expect(nav.back()).toBe('levels');
    expect(nav.back()).toBe('home');
  });

  it('Home → Play: back from the game returns to Home', () => {
    const nav = new NavigationHistory();
    nav.go('game');
    expect(nav.back()).toBe('home');
  });

  it('Home → Profile → back returns to Home', () => {
    const nav = new NavigationHistory();
    nav.go('profile');
    expect(nav.backTarget).toBe('home');
    expect(nav.back()).toBe('home');
  });

  it('never returns into a level the player already left', () => {
    const nav = new NavigationHistory();
    nav.go('game'); // Play from Home
    nav.go('levels'); // "Levels" on the completion dialog
    expect(nav.backTarget).toBe('home');
    nav.go('game'); // pick another level
    nav.go('profile');
    expect(nav.back()).toBe('levels');
    expect(nav.back()).toBe('home');
  });

  it('going Home clears the history; revisiting a screen does not stack duplicates', () => {
    const nav = new NavigationHistory();
    nav.go('levels');
    nav.go('profile');
    nav.go('levels');
    expect(nav.backTarget).toBe('home');
    nav.go('home');
    expect(nav.current).toBe('home');
    expect(nav.back()).toBe('home');
  });

  it('moving to the next level keeps the game screen', () => {
    const nav = new NavigationHistory();
    nav.go('levels');
    nav.go('game');
    nav.go('game'); // Next level from the completion dialog
    expect(nav.current).toBe('game');
    expect(nav.back()).toBe('levels');
  });
});
