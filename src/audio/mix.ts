import type { GameSettings } from '../settings/Settings';

/** Gains for the three audio buses, all 0..1. */
export interface ChannelGains {
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
}

/**
 * Slider position (0..1) to gain. Loudness grows roughly with the square of
 * amplitude, so a squared curve makes the slider feel even across its range.
 */
export function perceptualGain(volume: number): number {
  const v = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
  return v * v;
}

/**
 * What each bus should play at for these settings. Master mute silences
 * everything without touching the music and effects switches, so unmuting
 * restores exactly what was there before.
 */
export function channelGains(settings: Pick<GameSettings, 'muted' | 'music' | 'sfx' | 'musicVolume' | 'sfxVolume'>): ChannelGains {
  return {
    master: settings.muted ? 0 : 1,
    music: settings.music ? perceptualGain(settings.musicVolume) : 0,
    sfx: settings.sfx ? perceptualGain(settings.sfxVolume) : 0,
  };
}

/** True when music would actually be heard; the music generator only runs then. */
export function musicAudible(gains: ChannelGains): boolean {
  return gains.master > 0 && gains.music > 0;
}

export function sfxAudible(gains: ChannelGains): boolean {
  return gains.master > 0 && gains.sfx > 0;
}

/**
 * Drops repeats of the same sound that come faster than its minimum gap
 * (rapid chain reactions, double taps), so they never pile up into noise.
 */
export class Throttle {
  private readonly last = new Map<string, number>();

  constructor(private readonly now: () => number) {}

  /** True if `key` may fire now (and records it); false if it fired less than `gapMs` ago. */
  allow(key: string, gapMs: number): boolean {
    const t = this.now();
    const previous = this.last.get(key);
    if (previous !== undefined && t - previous < gapMs) return false;
    this.last.set(key, t);
    return true;
  }

  reset(): void {
    this.last.clear();
  }
}
