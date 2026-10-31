import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSettings, withSettings, type GameSettings } from '../settings/Settings';
import { AudioManager, type AudioEnvironment } from './AudioManager';
import { channelGains, musicAudible, perceptualGain, sfxAudible, Throttle } from './mix';
import { SOUND_GAP_MS, type SoundId } from './sounds';

// ------------------------------------------------------------------ a fake Web Audio graph

class FakeParam {
  value = 0;
  readonly targets: number[] = [];
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number) {
    this.targets.push(v);
    this.value = v;
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target: unknown) {
    this.connections.push(target);
    return target;
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  readonly destination = new FakeNode();
  oscillators = 0;
  resumeFails = false;
  closed = false;
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createOscillator() {
    this.oscillators++;
    return Object.assign(new FakeNode(), {
      type: 'sine',
      frequency: new FakeParam(),
      detune: new FakeParam(),
      start() {},
      stop() {},
      onended: null as null | (() => void),
    });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam() });
  }
  createDelay() {
    return Object.assign(new FakeNode(), { delayTime: new FakeParam() });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam() });
  }
  resume() {
    if (this.resumeFails) return Promise.reject(new Error('NotAllowedError'));
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    this.closed = true;
    return Promise.resolve();
  }
}

function setup(settings: GameSettings = createSettings(), env: Partial<AudioEnvironment> = {}) {
  const ctx = new FakeContext();
  let clock = 0;
  const created: FakeContext[] = [];
  const audio = new AudioManager(settings, {
    createContext: () => {
      created.push(ctx);
      return ctx as unknown as AudioContext;
    },
    now: () => clock,
    ...env,
  });
  return { audio, ctx, created, advance: (ms: number) => (clock += ms) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => vi.useRealTimers());

describe('mixing', () => {
  it('uses a perceptual volume curve', () => {
    expect(perceptualGain(0)).toBe(0);
    expect(perceptualGain(1)).toBe(1);
    expect(perceptualGain(0.5)).toBe(0.25);
    expect(perceptualGain(2)).toBe(1);
    expect(perceptualGain(NaN)).toBe(0);
  });

  it('master mute silences everything but keeps the channel settings', () => {
    const gains = channelGains({ ...createSettings(), muted: true });
    expect(gains.master).toBe(0);
    expect(gains.music).toBeGreaterThan(0);
    expect(gains.sfx).toBeGreaterThan(0);
    expect(musicAudible(gains)).toBe(false);
    expect(sfxAudible(gains)).toBe(false);
  });

  it('music on/off only affects music', () => {
    const off = channelGains({ ...createSettings(), music: false });
    expect(off.music).toBe(0);
    expect(off.sfx).toBeGreaterThan(0);
    expect(musicAudible(off)).toBe(false);
    expect(sfxAudible(off)).toBe(true);
  });

  it('sound effects on/off only affect effects', () => {
    const off = channelGains({ ...createSettings(), sfx: false });
    expect(off.sfx).toBe(0);
    expect(musicAudible(off)).toBe(true);
    expect(sfxAudible(off)).toBe(false);
  });

  it('keeps music and effect volumes independent', () => {
    const g = channelGains({ ...createSettings(), musicVolume: 0.2, sfxVolume: 0.9 });
    expect(g.music).toBeCloseTo(0.04);
    expect(g.sfx).toBeCloseTo(0.81);
  });

  it('throttles repeats of the same key only', () => {
    let t = 0;
    const throttle = new Throttle(() => t);
    expect(throttle.allow('chain', 70)).toBe(true);
    expect(throttle.allow('chain', 70)).toBe(false);
    expect(throttle.allow('tap', 70)).toBe(true);
    t = 70;
    expect(throttle.allow('chain', 70)).toBe(true);
  });

  it('has a gap for every sound', () => {
    const ids: SoundId[] = ['tap', 'release', 'chain', 'blocked', 'nudge', 'lifeLost', 'complete', 'star', 'gameOver', 'unlock'];
    for (const id of ids) expect(SOUND_GAP_MS[id]).toBeGreaterThan(0);
  });
});

describe('audio manager', () => {
  it('creates nothing and plays nothing before a user gesture (autoplay policy)', () => {
    const { audio, created } = setup();
    expect(audio.play('tap')).toBe(false);
    expect(created).toHaveLength(0);
    expect(audio.ready).toBe(false);
  });

  it('unlocks on a gesture, then plays effects and starts the music', async () => {
    const { audio, ctx } = setup();
    const target = new EventTarget();
    audio.listenForGestures(target);
    target.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(audio.ready).toBe(true);
    expect(audio.musicPlaying).toBe(true);
    const before = ctx.oscillators;
    expect(audio.play('release')).toBe(true);
    expect(ctx.oscillators).toBeGreaterThan(before);
    audio.destroy();
  });

  it('respects master mute at all times and applies changes immediately', async () => {
    const { audio } = setup();
    audio.unlock();
    await flush();
    audio.applySettings(withSettings(createSettings(), { muted: true }));
    expect(audio.currentGains.master).toBe(0);
    expect(audio.play('tap')).toBe(false);
    expect(audio.musicPlaying).toBe(true); // fading out…
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 900));
    expect(audio.musicPlaying).toBe(false); // …then stopped
    audio.applySettings(createSettings());
    expect(audio.play('tap')).toBe(true);
    expect(audio.musicPlaying).toBe(true);
    audio.destroy();
  });

  it('turning music off stops it without affecting effects', async () => {
    const { audio } = setup();
    audio.unlock();
    await flush();
    audio.applySettings(withSettings(createSettings(), { music: false }));
    expect(audio.currentGains.music).toBe(0);
    expect(audio.play('release')).toBe(true);
    audio.destroy();
  });

  it('turning effects off silences effects but not music', async () => {
    const { audio } = setup();
    audio.unlock();
    await flush();
    audio.applySettings(withSettings(createSettings(), { sfx: false }));
    expect(audio.play('release')).toBe(false);
    expect(audio.musicPlaying).toBe(true);
    audio.destroy();
  });

  it('does not start the music twice', async () => {
    const { audio, ctx } = setup();
    audio.unlock();
    await flush();
    const afterFirst = ctx.oscillators;
    audio.unlock();
    audio.applySettings(createSettings());
    await flush();
    expect(ctx.oscillators).toBe(afterFirst); // no second set of notes scheduled
    audio.destroy();
  });

  it('throttles rapid repeats and caps overlapping voices', async () => {
    const { audio, advance } = setup();
    audio.unlock();
    await flush();
    expect(audio.play('chain', { step: 0 })).toBe(true);
    expect(audio.play('chain', { step: 1 })).toBe(false); // too soon
    let played = 0;
    for (let i = 0; i < 20; i++) {
      advance(100);
      if (audio.play('chain', { step: i })) played++;
    }
    expect(played).toBeLessThan(20); // the audio clock didn't move, so voices pile up and get capped
    audio.destroy();
  });

  it('suspends in the background and resumes when visible', async () => {
    const { audio, ctx } = setup();
    audio.unlock();
    await flush();
    audio.setHidden(true);
    expect(ctx.state).toBe('suspended');
    expect(audio.play('tap')).toBe(false);
    audio.unlock(); // gestures while hidden don't wake it
    await flush();
    expect(ctx.state).toBe('suspended');
    audio.setHidden(false);
    await flush();
    expect(ctx.state).toBe('running');
    audio.destroy();
  });

  it('survives a missing audio device and retries on the next gesture', async () => {
    let attempts = 0;
    const ctx = new FakeContext();
    const audio = new AudioManager(createSettings(), {
      createContext: () => {
        attempts++;
        if (attempts === 1) throw new Error('NotSupportedError: no output device');
        return ctx as unknown as AudioContext;
      },
      now: () => 0,
    });
    expect(() => audio.unlock()).not.toThrow();
    expect(audio.isUnavailable).toBe(true);
    expect(audio.play('tap')).toBe(false);
    audio.unlock();
    await flush();
    expect(audio.isUnavailable).toBe(false);
    expect(audio.ready).toBe(true);
    audio.destroy();
  });

  it('handles a refused resume and browsers without Web Audio', async () => {
    const { audio, ctx } = setup();
    ctx.resumeFails = true;
    audio.unlock();
    await flush();
    expect(audio.ready).toBe(false);
    expect(audio.play('tap')).toBe(false);
    const none = new AudioManager(createSettings(), { createContext: () => null, now: () => 0 });
    none.unlock();
    expect(none.isUnavailable).toBe(true);
  });

  it('releases the device on destroy', async () => {
    const { audio, ctx } = setup();
    audio.unlock();
    await flush();
    audio.destroy();
    expect(ctx.closed).toBe(true);
    expect(audio.play('tap')).toBe(false);
  });
});
