import { describe, expect, it } from 'vitest';
import { Feedback, starDelays, type FeedbackEvent } from '../app/Feedback';
import type { SoundId } from '../audio/sounds';
import {
  effectDuration,
  HAPTIC_EFFECTS,
  Haptics,
  TEST_EFFECT,
  toWebPattern,
  webVibrationBackend,
  type HapticEffect,
  type HapticId,
  type HapticsBackend,
} from './Haptics';

function recorder(supported = true) {
  const calls: { effect: HapticEffect; label: string }[] = [];
  let stops = 0;
  const backend: HapticsBackend = {
    kind: supported ? 'native' : 'none',
    supported,
    play: (effect, label) => calls.push({ effect, label }),
    stop: () => void stops++,
    test: async () => ({ status: 'sent' }),
  };
  return { calls, backend, stops: () => stops };
}

describe('haptics', () => {
  it('plays the named effect when enabled and supported', () => {
    const { calls, backend } = recorder();
    const haptics = new Haptics(() => true, backend, () => 0);
    expect(haptics.play('release')).toBe(true);
    expect(calls).toEqual([{ effect: HAPTIC_EFFECTS.release, label: 'release' }]);
  });

  it('respects the Vibration setting, read live', () => {
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

  it('does nothing on devices without vibration, and says so in the test', async () => {
    const { calls, backend } = recorder(false);
    const haptics = new Haptics(() => true, backend);
    expect(haptics.supported).toBe(false);
    expect(haptics.play('complete')).toBe(false);
    haptics.stop();
    expect(calls).toHaveLength(0);
    expect(await haptics.test()).toEqual({ status: 'unsupported' });
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

  it('stops a vibration in progress (background, setting off)', () => {
    const r = recorder();
    new Haptics(() => true, r.backend).stop();
    expect(r.stops()).toBe(1);
  });

  it('uses pulses long enough to feel, and never long buzzes', () => {
    for (const [id, effect] of Object.entries(HAPTIC_EFFECTS)) {
      expect(effect.timings.length, id).toBe(effect.amplitudes.length);
      const strongest = Math.max(...effect.timings.filter((_, i) => effect.amplitudes[i] > 0));
      expect(strongest, id).toBeGreaterThanOrEqual(30); // the old 8 ms pulses were too short to feel
      expect(effectDuration(effect), id).toBeLessThanOrEqual(350);
      for (const a of effect.amplitudes) expect(a >= 0 && a <= 255, id).toBe(true);
    }
    expect(effectDuration(TEST_EFFECT)).toBeGreaterThanOrEqual(300);
  });

  it('converts effects to Web Vibration patterns', () => {
    expect(toWebPattern({ timings: [32], amplitudes: [140] })).toEqual([32]);
    expect(toWebPattern({ timings: [45, 60, 45], amplitudes: [230, 0, 230] })).toEqual([45, 60, 45]);
    expect(toWebPattern({ timings: [20, 30, 40], amplitudes: [100, 200, 0] })).toEqual([50, 40]); // merged
    expect(toWebPattern({ timings: [10, 30], amplitudes: [0, 255] })).toEqual([0, 10, 30]); // starts with a pause
  });

  it('runs the diagnostic even when the Vibration setting is off', async () => {
    let tested = 0;
    const backend: HapticsBackend = { kind: 'native', supported: true, play: () => undefined, stop: () => undefined, test: async () => (tested++, { status: 'sent' }) };
    const haptics = new Haptics(() => false, backend);
    expect(await haptics.test()).toEqual({ status: 'sent' });
    expect(tested).toBe(1);
  });

  it('web backend: missing API, no user activation and throwing calls are all harmless', async () => {
    expect(webVibrationBackend({}).supported).toBe(false);
    expect(webVibrationBackend({}).kind).toBe('none');
    expect(webVibrationBackend(undefined).supported).toBe(false);
    expect(() => webVibrationBackend({}).play(HAPTIC_EFFECTS.release, 'release')).not.toThrow();
    expect(await webVibrationBackend({}).test(TEST_EFFECT)).toMatchObject({ status: 'unsupported' });

    const calls: unknown[] = [];
    const inactive = webVibrationBackend({ vibrate: (p) => (calls.push(p), true), userActivation: { hasBeenActive: false } });
    inactive.play(HAPTIC_EFFECTS.release, 'release');
    expect(calls).toHaveLength(0);

    const active = webVibrationBackend({ vibrate: (p) => (calls.push(p), true), userActivation: { hasBeenActive: true } });
    active.play(HAPTIC_EFFECTS.lifeLost, 'lifeLost');
    expect(calls).toEqual([[45, 60, 45]]);
    expect(await active.test(TEST_EFFECT)).toEqual({ status: 'sent' });

    const throwing = webVibrationBackend({
      vibrate: () => {
        throw new Error('blocked by permissions policy');
      },
    });
    expect(throwing.supported).toBe(true);
    expect(() => throwing.play(HAPTIC_EFFECTS.release, 'release')).not.toThrow();
    expect(await throwing.test(TEST_EFFECT)).toMatchObject({ status: 'failed' });
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
