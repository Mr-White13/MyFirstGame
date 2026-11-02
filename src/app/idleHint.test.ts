import { describe, expect, it } from 'vitest';
import { IDLE_HINT_MS, IdleHint, idleHintText } from './idleHint';

describe('idle hint ("only N arrows can move")', () => {
  it('is due once after IDLE_HINT_MS of level time without a tap, only during play', () => {
    const hint = new IdleHint();
    hint.activity(0);
    expect(hint.due(IDLE_HINT_MS - 1, true)).toBe(false);
    expect(hint.due(IDLE_HINT_MS, false)).toBe(false); // not playing (won, lost)
    expect(hint.due(IDLE_HINT_MS, true)).toBe(true);
    expect(hint.due(IDLE_HINT_MS * 3, true)).toBe(false); // once per idle spell
  });

  it('a tap starts a new idle spell', () => {
    const hint = new IdleHint();
    hint.activity(0);
    expect(hint.due(IDLE_HINT_MS, true)).toBe(true);
    hint.activity(10_000);
    expect(hint.due(10_000 + IDLE_HINT_MS - 1, true)).toBe(false);
    expect(hint.due(10_000 + IDLE_HINT_MS, true)).toBe(true);
  });

  it('says how many arrows can move', () => {
    expect(idleHintText(3)).toBe('Only 3 arrows can move right now.');
    expect(idleHintText(1)).toBe('Only 1 arrow can move right now. Can you find it?');
  });
});
