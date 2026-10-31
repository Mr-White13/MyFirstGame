import { describe, expect, it } from 'vitest';
import { Feedback, starDelays, type FeedbackEvent } from '../app/Feedback';
import type { SoundId } from '../audio/sounds';
import { HAPTIC_PATTERNS, Haptics, webVibrationBackend, type HapticId, type HapticsBackend } from './Haptics';

function recorder(supported = true) {
  const calls: (number | readonly number[])[] = [];
  const backend: HapticsBackend = { supported, vibrate: (p) => calls.push(p) };
  return { calls, backend };
}

describe('haptics', () => {
  it('vibrates when enabled and supported', () => {
    const { calls, backend } = recorder();
    const haptics = new Haptics(() => true, backend, () => 0);
    expect(haptics.play('release')).toBe(true);
    expect(calls).toEqual([HAPTIC_PATTERNS.release]);
  });

  it('respects the player preference, read live', () => {
    const { calls, backend } = recorder();
    let enabled = false;
    let t = 0;
    const haptics = new Haptics(() => enabled, backend, () => t);
    expect(haptics.play('blocked')).toBe(false);
    enabled = true;
    t = 1000;
    expect(haptics.play('blocked')).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('does nothing on devices without vibration', () => {
    const { calls, backend } = recorder(false);
    const haptics = new Haptics(() => true, backend);
    expect(haptics.supported).toBe(false);
    expect(haptics.play('complete')).toBe(false);
    haptics.stop();
    expect(calls).toHaveLength(0);
  });

  it('never buzzes continuously: rapid repeats are dropped', () => {
    const { calls, backend } = recorder();
    let t = 0;
    const haptics = new Haptics(() => true, backend, () => t);
    for (let i = 0; i < 10; i++) {
      haptics.play('chain');
      t += 50;
    }
    expect(calls.length).toBe(1);
  });

  it('keeps every pattern short', () => {
    for (const pattern of Object.values(HAPTIC_PATTERNS)) {
      const total = typeof pattern === 'number' ? pattern : pattern.reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(250);
    }
  });

  it('web backend: missing API, no user activation and throwing calls are all harmless', () => {
    expect(webVibrationBackend({}).supported).toBe(false);
    expect(webVibrationBackend(undefined).supported).toBe(false);
    expect(() => webVibrationBackend({}).vibrate(10)).not.toThrow();

    const calls: unknown[] = [];
    const inactive = webVibrationBackend({ vibrate: (p) => (calls.push(p), true), userActivation: { hasBeenActive: false } });
    inactive.vibrate(10);
    expect(calls).toHaveLength(0);

    const active = webVibrationBackend({ vibrate: (p) => (calls.push(p), true), userActivation: { hasBeenActive: true } });
    active.vibrate([10, 20, 10]);
    expect(calls).toEqual([[10, 20, 10]]);

    const throwing = webVibrationBackend({
      vibrate: () => {
        throw new Error('blocked by permissions policy');
      },
    });
    expect(throwing.supported).toBe(true);
    expect(() => throwing.vibrate(10)).not.toThrow();
  });
});

describe('feedback mapping', () => {
  function setup() {
    const sounds: { id: SoundId; step?: number; delay?: number }[] = [];
    const haptics: HapticId[] = [];
    const feedback = new Feedback(
      { play: (id, o) => (sounds.push({ id, ...o }), true) },
      { play: (id) => (haptics.push(id), true) },
    );
    const send = (e: FeedbackEvent) => feedback.handle(e);
    return { sounds, haptics, send };
  }

  it('maps gameplay events to sounds and haptics', () => {
    const { sounds, haptics, send } = setup();
    send({ type: 'release' });
    send({ type: 'blocked', lifeLost: true });
    send({ type: 'complete' });
    send({ type: 'gameOver' });
    expect(sounds.map((s) => s.id)).toEqual(['release', 'blocked', 'lifeLost', 'complete', 'gameOver']);
    expect(haptics).toEqual(['release', 'lifeLost', 'complete']);
  });

  it('a free nudge is quiet and never vibrates', () => {
    const { sounds, haptics, send } = setup();
    send({ type: 'blocked', lifeLost: false });
    expect(sounds.map((s) => s.id)).toEqual(['nudge']);
    expect(haptics).toEqual([]);
  });

  it('a chain climbs in pitch and vibrates once, not once per arrow', () => {
    const { sounds, haptics, send } = setup();
    for (let index = 0; index < 4; index++) send({ type: 'chain', index });
    expect(sounds.map((s) => s.step)).toEqual([0, 1, 2, 3]);
    expect(haptics).toEqual(['chain']);
  });

  it('reward claims and achievements play a sound and one short pulse', () => {
    const { sounds, haptics, send } = setup();
    send({ type: 'claim' });
    send({ type: 'achievement' });
    expect(sounds.map((s) => s.id)).toEqual(['claim', 'achievement']);
    expect(haptics).toEqual(['reward', 'reward']);
  });

  it('stars follow the dialog reveal, then the unlock', () => {
    const { sounds, send } = setup();
    send({ type: 'stars', stars: 3, unlocked: true, reduced: false });
    expect(sounds.map((s) => s.id)).toEqual(['star', 'star', 'star', 'unlock']);
    const delays = sounds.map((s) => s.delay ?? 0);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(starDelays(3, true)[2]).toBeLessThan(starDelays(3, false)[2]);
  });
});
