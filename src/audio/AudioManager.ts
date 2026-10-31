import type { GameSettings } from '../settings/Settings';
import { AmbientMusic } from './AmbientMusic';
import { channelGains, musicAudible, sfxAudible, Throttle, type ChannelGains } from './mix';
import { playSound, SOUND_GAP_MS, type SoundId, type SoundOptions } from './sounds';

/** At most this many effects overlap; extra ones are dropped (chains stay clean, never clip). */
const MAX_VOICES = 6;
/** Gain changes glide over this long (seconds) so switches and sliders never click. */
const GAIN_GLIDE = 0.04;

export interface AudioEnvironment {
  /** Creates the audio context. Returns null (or throws) where Web Audio is unavailable. */
  createContext(): AudioContext | null;
  /** ms clock for throttling. */
  now(): number;
}

export const browserAudioEnvironment: AudioEnvironment = {
  createContext() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null;
  },
  now: () => performance.now(),
};

/** Events that count as a user gesture for unlocking audio (autoplay policy). */
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

/**
 * The game's one audio system: a music bus and an effects bus under a master
 * gain, all in a single AudioContext.
 *
 * - **Autoplay:** nothing is created until the first tap or key press. Sounds
 *   requested before that are dropped; music starts once unlocked.
 * - **Settings:** read live; master mute, the two switches and the two
 *   volumes take effect at once (with a short glide, so no clicks).
 * - **Background:** hiding the page fades the music and suspends the
 *   context; showing it again resumes.
 * - **Failures:** no Web Audio, a missing or busy output device, or a context
 *   the system interrupted never throw into the game. The next gesture tries again.
 *
 * Phaser's own sound system is turned off (`audio.noAudio` in createGame):
 * everything here is synthesised, so it needs no loader or decoded files,
 * and one context is cheaper than two.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private music?: AmbientMusic;
  private gains: ChannelGains;
  private hidden = false;
  private unavailable = false;
  private readonly throttle: Throttle;
  /** End times (audio clock) of effects still sounding. */
  private voices: number[] = [];
  private readonly onGesture = () => this.unlock();
  private gestureTarget?: EventTarget;

  constructor(
    settings: GameSettings,
    private readonly env: AudioEnvironment = browserAudioEnvironment,
  ) {
    this.gains = channelGains(settings);
    this.throttle = new Throttle(env.now);
  }

  /** True once the context exists and is running. */
  get ready(): boolean {
    return this.ctx?.state === 'running';
  }

  /** True if the browser offers no Web Audio at all, or creating the context failed. */
  get isUnavailable(): boolean {
    return this.unavailable;
  }

  get currentGains(): ChannelGains {
    return this.gains;
  }

  get musicPlaying(): boolean {
    return this.music?.isPlaying ?? false;
  }

  /** Unlocks on the first user gesture on `target` (and resumes after interruptions on later ones). */
  listenForGestures(target: EventTarget): void {
    this.gestureTarget = target;
    UNLOCK_EVENTS.forEach((type) => target.addEventListener(type, this.onGesture, { capture: true, passive: true }));
  }

  /**
   * Creates or resumes the context. Call only from a user gesture: browsers
   * refuse to start audio otherwise.
   */
  unlock(): void {
    if (this.hidden) return;
    if (!this.ctx && !this.create()) return;
    const ctx = this.ctx!;
    if (ctx.state !== 'running') {
      ctx.resume().then(
        () => this.syncMusic(),
        () => undefined, // device busy or gone: the next gesture tries again
      );
    } else {
      this.syncMusic();
    }
  }

  /** Applies volume, mute and channel switches immediately. */
  applySettings(settings: GameSettings): void {
    this.gains = channelGains(settings);
    if (!this.ctx) return;
    this.glide(this.master, this.gains.master);
    this.glide(this.musicBus, this.gains.music);
    this.glide(this.sfxBus, this.gains.sfx);
    this.syncMusic();
  }

  /**
   * Plays an effect now (or `delay` seconds from now). Silently does nothing
   * while locked, muted, backgrounded, too soon after the same sound, or when
   * too many effects are already sounding.
   */
  play(id: SoundId, options: SoundOptions & { delay?: number } = {}): boolean {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || ctx.state !== 'running' || this.hidden || !sfxAudible(this.gains)) return false;
    // Stars are three different notes meant to follow each other; everything else throttles per sound.
    const key = id === 'star' ? `${id}:${options.step ?? 0}` : id;
    if (!this.throttle.allow(key, SOUND_GAP_MS[id])) return false;
    const now = ctx.currentTime;
    this.voices = this.voices.filter((end) => end > now);
    if (this.voices.length >= MAX_VOICES) return false;
    try {
      const start = now + Math.max(0, options.delay ?? 0);
      const length = playSound(ctx, this.sfxBus, id, start, options);
      this.voices.push(start + length);
      return true;
    } catch {
      return false;
    }
  }

  /** Page hidden (app backgrounded): fade the music and suspend. Visible again: resume. */
  setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'closed') return;
    if (hidden) {
      this.music?.stop();
      ctx.suspend().catch(() => undefined);
    } else {
      ctx.resume().then(
        () => this.syncMusic(),
        () => undefined,
      );
    }
  }

  /** Releases the audio device and every node. */
  destroy(): void {
    if (this.gestureTarget) {
      const target = this.gestureTarget;
      UNLOCK_EVENTS.forEach((type) => target.removeEventListener(type, this.onGesture, { capture: true }));
    }
    this.music?.destroy();
    this.music = undefined;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private create(): boolean {
    let ctx: AudioContext | null = null;
    try {
      ctx = this.env.createContext();
    } catch {
      ctx = null;
    }
    if (!ctx) {
      this.unavailable = true;
      return false;
    }
    this.unavailable = false;
    this.ctx = ctx;
    // A gentle limiter on the master bus: even a burst of effects can't clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    this.master = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.master.gain.value = this.gains.master;
    this.musicBus.gain.value = this.gains.music;
    this.sfxBus.gain.value = this.gains.sfx;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(limiter);
    limiter.connect(ctx.destination);
    this.music = new AmbientMusic(ctx, this.musicBus);
    return true;
  }

  /** Music runs only while it can be heard, the page is visible and audio is unlocked. */
  private syncMusic(): void {
    if (!this.music || !this.ctx) return;
    if (musicAudible(this.gains) && !this.hidden && this.ctx.state === 'running') this.music.start();
    else this.music.stop();
  }

  private glide(node: GainNode | undefined, value: number): void {
    if (!node || !this.ctx) return;
    node.gain.setTargetAtTime(value, this.ctx.currentTime, GAIN_GLIDE / 3);
  }
}
