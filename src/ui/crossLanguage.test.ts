import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starDelays } from '../app/Feedback';
import { STREAK_WINDOW_MS } from '../core/types';
import { PALETTES } from '../render/theme';
import { LANDSCAPE_QUERY, TRANSITION_MS } from './dom';
import { Toast } from './Toast';

/**
 * Values that live in TypeScript and again in CSS or Android resources,
 * formerly kept in step only by comments. These tests fail when one side
 * changes without the other. Known mismatches (audit B9) are recorded as
 * they are, so fixing them is a visible, deliberate change.
 */

const CSS = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const start = CSS.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No rule ${selector} in style.css`);
  return CSS.slice(start, CSS.indexOf('}', start));
}

const ms = (value: string) => (value.endsWith('ms') ? Number(value.slice(0, -2)) : Number(value.slice(0, -1)) * 1000);

describe('TypeScript and style.css agree', () => {
  it('TRANSITION_MS is the --transition token', () => {
    const token = /--transition:\s*([\d.]+m?s);/.exec(rule(':root'))![1];
    expect(ms(token)).toBe(TRANSITION_MS);
  });

  it('LANDSCAPE_QUERY is the landscape media query', () => {
    expect(CSS).toContain(`@media ${LANDSCAPE_QUERY} {`);
  });

  it('the streak pips drain over STREAK_WINDOW_MS', () => {
    const drain = /animation:\s*streak-drain\s+([\d.]+m?s)/.exec(rule('.momentum--timing i.momentum__pip--on'))![1];
    expect(ms(drain)).toBe(STREAK_WINDOW_MS);
  });

  it('B9 (recorded as is): star sounds play 20 ms after the CSS stars light up, and still stagger under reduced motion', () => {
    const delay = /animation-delay:\s*calc\((\d+)ms \+ var\(--i, 0\) \* (\d+)ms\)/.exec(rule('.overlay--visible .star--earned'))!;
    const css = [0, 1, 2].map((i) => (Number(delay[1]) + i * Number(delay[2])) / 1000);
    expect(css).toEqual([0.26, 0.42, 0.58]);
    expect(starDelays(3, false).map((s) => Math.round(s * 1000) / 1000)).toEqual([0.28, 0.44, 0.6]);
    expect(starDelays(3, true).map((s) => Math.round(s * 1000) / 1000)).toEqual([0.05, 0.17, 0.29]);
  });
});

describe('Toast and its CSS fade', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  });

  it('hides the element only after the CSS fade-out has finished', () => {
    vi.useFakeTimers();
    const classes = new Set<string>();
    const element = { textContent: '', hidden: true, dataset: {} as Record<string, string>, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
    Object.assign(globalThis, {
      document: { getElementById: () => element },
      window: { setTimeout, clearTimeout },
      requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0),
    });
    const fade = Math.max(...[...rule('.toast').matchAll(/(\d+)ms/g)].map((m) => Number(m[1])));
    new Toast().show('Hi', 1000);
    vi.advanceTimersByTime(1000);
    expect(classes.has('toast--visible')).toBe(false); // fading out
    vi.advanceTimersByTime(fade);
    expect(element.hidden).toBe(false); // still fading: 200 ms of CSS, hidden after 250 ms
    vi.advanceTimersByTime(250 - fade);
    expect(element.hidden).toBe(true);
  });
});

describe('Android resources and the theme', () => {
  it('the launch background is the Dark Neon page colour', () => {
    const xml = readFileSync(new URL('../../android/app/src/main/res/values/launch.xml', import.meta.url), 'utf8');
    const color = /<color name="launch_background">#([0-9a-fA-F]{6})<\/color>/.exec(xml)![1];
    expect(parseInt(color, 16)).toBe(PALETTES.dark.background);
  });
});
