import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AttemptTracker } from '../app/AttemptTracker';
import { SettingsStore, type ThemeChoice } from '../settings/Settings';
import type { KeyValueStore } from '../storage/SafeStore';
import { ThemePicker } from './ThemePicker';

type Listener = (event: { target: unknown; preventDefault(): void }) => void;

interface FakeElement {
  hidden: boolean;
  readonly dataset: Record<string, string>;
  children: FakeElement[];
  readonly attributes: Map<string, string>;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, listener: Listener): void;
  dispatch(type: string, target?: unknown): void;
  focus(): void;
  closest(selector: string): FakeElement | null;
  querySelector(selector: string): FakeElement | null;
  querySelectorAll(): FakeElement[];
}

/** Just enough of an element for the picker (the tests run without a DOM). */
function fakeElement(dataset: Record<string, string> = {}): FakeElement {
  const listeners = new Map<string, Listener[]>();
  const attributes = new Map<string, string>();
  const el: FakeElement = {
    hidden: true,
    dataset,
    children: [],
    attributes,
    setAttribute: (name, value) => void attributes.set(name, value),
    addEventListener: (type, listener) => void listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    dispatch: (type, target = el) => listeners.get(type)?.forEach((l) => l({ target, preventDefault() {} })),
    focus() {},
    closest: (selector) => (selector === '[data-theme-choice]' && dataset.themeChoice ? el : null),
    querySelector: (selector) => el.children.find((c) => selector.includes('aria-checked') && c.attributes.get('aria-checked') === 'true') ?? null,
    querySelectorAll: () => el.children,
  };
  return el;
}

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

let elements: Map<string, FakeElement>;
let options: Record<ThemeChoice, FakeElement>;

beforeEach(() => {
  elements = new Map();
  options = {
    dark: fakeElement({ themeChoice: 'dark' }),
    light: fakeElement({ themeChoice: 'light' }),
    colorful: fakeElement({ themeChoice: 'colorful' }),
    system: fakeElement({ themeChoice: 'system' }),
  };
  (globalThis as { document?: unknown }).document = {
    getElementById(id: string) {
      if (!elements.has(id)) {
        const el = fakeElement();
        if (id === 'theme-popover') el.children = Object.values(options);
        elements.set(id, el);
      }
      return elements.get(id);
    },
  };
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

/** A picker wired like main.ts: real settings store, a level timer paused while open. */
function setup() {
  let now = 0;
  const tracker = new AttemptTracker(() => now);
  const settings = new SettingsStore(new MemoryStore());
  const events: string[] = [];
  const picker = new ThemePicker({
    onOpen: () => {
      events.push('open');
      tracker.timer.pause('picker');
    },
    onClose: () => {
      events.push('close');
      tracker.timer.resume('picker');
    },
    onPick: (theme) => settings.update({ theme }),
    current: () => settings.current.theme,
  });
  tracker.begin(1, 1);
  tracker.interactive();
  return { picker, settings, tracker, events, advance: (ms: number) => (now += ms) };
}

describe('in-game theme picker', () => {
  it('opens from the palette button and marks the saved theme', () => {
    const { settings, events } = setup();
    settings.update({ theme: 'colorful' });
    elements.get('btn-theme')!.dispatch('click');
    expect(events).toEqual(['open']);
    expect(elements.get('theme-popover')!.hidden).toBe(false);
    expect(elements.get('theme-backdrop')!.hidden).toBe(false);
    expect(elements.get('btn-theme')!.attributes.get('aria-expanded')).toBe('true');
    expect(options.colorful.attributes.get('aria-checked')).toBe('true');
    expect(options.dark.attributes.get('aria-checked')).toBe('false');
  });

  it.each(['dark', 'light', 'colorful', 'system'] as const)('applies %s at once, saves it and closes', (theme) => {
    const { picker, settings, events } = setup();
    if (theme === 'dark') settings.update({ theme: 'light' });
    picker.show();
    elements.get('theme-popover')!.dispatch('click', options[theme]);
    expect(settings.current.theme).toBe(theme);
    expect(picker.isOpen).toBe(false);
    expect(elements.get('theme-popover')!.hidden).toBe(true);
    expect(events).toEqual(['open', 'close']);
  });

  it('persists the choice through the existing settings record', () => {
    const store = new MemoryStore();
    const settings = new SettingsStore(store);
    const picker = new ThemePicker({ onOpen() {}, onClose() {}, onPick: (theme) => settings.update({ theme }), current: () => settings.current.theme });
    picker.show();
    picker.pick('light');
    expect(new SettingsStore(store).current.theme).toBe('light');
  });

  it('closes on an outside tap or Back without changing the theme', () => {
    const { picker, settings, events } = setup();
    picker.show();
    elements.get('theme-backdrop')!.dispatch('pointerdown');
    expect(picker.isOpen).toBe(false);
    picker.show();
    picker.close(); // what Back / Escape call
    picker.close(); // repeated close is harmless
    expect(settings.current.theme).toBe('dark');
    expect(events).toEqual(['open', 'close', 'open', 'close']);
  });

  it('toggles closed when the palette button is tapped again', () => {
    const { picker } = setup();
    elements.get('btn-theme')!.dispatch('click');
    elements.get('btn-theme')!.dispatch('click');
    expect(picker.isOpen).toBe(false);
  });

  it('pauses the level timer while open and resumes it afterwards', () => {
    const { picker, tracker, advance } = setup();
    advance(3_000);
    picker.show();
    advance(60_000); // browsing themes isn't play time
    expect(tracker.timer.elapsed()).toBe(3_000);
    picker.pick('light');
    advance(2_000);
    expect(tracker.timer.elapsed()).toBe(5_000);
  });

  it('ignores clicks that are not on a theme option', () => {
    const { picker, settings } = setup();
    picker.show();
    elements.get('theme-popover')!.dispatch('click', fakeElement());
    expect(picker.isOpen).toBe(true);
    expect(settings.current.theme).toBe('dark');
  });
});
