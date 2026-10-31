/**
 * NEON ESCAPE's sound effects, synthesised at play time with the Web Audio
 * API. They are original: simple sine and triangle tones with soft envelopes
 * and low-pass filters, no samples and no third-party audio. Every voice is
 * short, peaks well below full scale and avoids harsh high frequencies.
 */

export type SoundId =
  | 'tap'
  | 'release'
  | 'chain'
  | 'blocked'
  | 'nudge'
  | 'lifeLost'
  | 'complete'
  | 'star'
  | 'gameOver'
  | 'unlock'
  | 'claim'
  | 'achievement'
  | 'energy'
  | 'promoted';

export interface SoundOptions {
  /** Chain position or star number: raises the pitch step by step. */
  readonly step?: number;
}

interface Tone {
  readonly type?: OscillatorType;
  readonly freq: number;
  /** Glide to this frequency over the tone (exponential). */
  readonly to?: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  readonly attack?: number;
  /** Low-pass cutoff in Hz; softens the tone. */
  readonly cutoff?: number;
  readonly detune?: number;
}

/** One enveloped oscillator into `out`. Nodes disconnect themselves when finished. */
export function playTone(ctx: BaseAudioContext, out: AudioNode, tone: Tone): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = tone.type ?? 'sine';
  osc.frequency.setValueAtTime(tone.freq, tone.start);
  if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, tone.start + tone.duration);
  if (tone.detune) osc.detune.setValueAtTime(tone.detune, tone.start);

  const attack = tone.attack ?? 0.005;
  env.gain.setValueAtTime(0, tone.start);
  env.gain.linearRampToValueAtTime(tone.gain, tone.start + attack);
  // Exponential decay to (almost) silence: sounds natural and never clicks.
  env.gain.exponentialRampToValueAtTime(0.0001, tone.start + tone.duration);

  let last: AudioNode = env;
  osc.connect(env);
  let filter: BiquadFilterNode | undefined;
  if (tone.cutoff) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tone.cutoff, tone.start);
    env.connect(filter);
    last = filter;
  }
  last.connect(out);
  osc.start(tone.start);
  osc.stop(tone.start + tone.duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
    filter?.disconnect();
  };
}

/** A minor pentatonic scale from A4: chain reactions climb it, so long chains sound musical, not repetitive. */
const PENTATONIC = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

/**
 * Schedules sound `id` at time `t` into `out`. Returns its length in
 * seconds, which the manager uses to count overlapping voices.
 */
export function playSound(ctx: BaseAudioContext, out: AudioNode, id: SoundId, t: number, options: SoundOptions = {}): number {
  const step = Math.max(0, options.step ?? 0);
  switch (id) {
    case 'tap':
      playTone(ctx, out, { freq: 1240, to: 980, start: t, duration: 0.06, gain: 0.12 });
      return 0.06;

    case 'release':
      // A quick upward glide: the arrow "zips" off the board.
      playTone(ctx, out, { type: 'triangle', freq: 520, to: 1180, start: t, duration: 0.16, gain: 0.2, cutoff: 3200 });
      playTone(ctx, out, { freq: 1040, to: 1560, start: t + 0.03, duration: 0.14, gain: 0.07 });
      return 0.17;

    case 'chain': {
      const freq = PENTATONIC[Math.min(step, PENTATONIC.length - 1)];
      playTone(ctx, out, { type: 'triangle', freq, to: freq * 1.5, start: t, duration: 0.14, gain: 0.16, cutoff: 3600 });
      playTone(ctx, out, { freq: freq * 2, start: t + 0.02, duration: 0.18, gain: 0.05 });
      return 0.2;
    }

    case 'blocked':
      // A soft, low bump: clearly "no", never a buzzer.
      playTone(ctx, out, { freq: 190, to: 95, start: t, duration: 0.16, gain: 0.32 });
      playTone(ctx, out, { type: 'square', freq: 120, to: 80, start: t, duration: 0.09, gain: 0.06, cutoff: 700 });
      return 0.16;

    case 'nudge':
      playTone(ctx, out, { freq: 220, to: 170, start: t, duration: 0.08, gain: 0.12 });
      return 0.08;

    case 'lifeLost':
      playTone(ctx, out, { type: 'triangle', freq: 622.25, start: t, duration: 0.14, gain: 0.14, cutoff: 2400 });
      playTone(ctx, out, { type: 'triangle', freq: 466.16, start: t + 0.11, duration: 0.24, gain: 0.14, cutoff: 2000 });
      return 0.35;

    case 'complete': {
      // Rising major arpeggio with a soft shimmer on top.
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) =>
        playTone(ctx, out, { type: 'triangle', freq, start: t + i * 0.085, duration: 0.42, gain: 0.13, cutoff: 3800 }),
      );
      playTone(ctx, out, { freq: 2093, start: t + 0.34, duration: 0.5, gain: 0.03, attack: 0.04 });
      return 0.85;
    }

    case 'star': {
      const freq = [1046.5, 1318.5, 1568][Math.min(step, 2)];
      playTone(ctx, out, { freq, start: t, duration: 0.3, gain: 0.11 });
      playTone(ctx, out, { freq: freq * 1.5, start: t + 0.015, duration: 0.22, gain: 0.035 });
      return 0.3;
    }

    case 'gameOver': {
      // A slow, low descending minor line: final, but calm.
      const notes = [392, 311.13, 261.63];
      notes.forEach((freq, i) =>
        playTone(ctx, out, { type: 'triangle', freq, start: t + i * 0.2, duration: 0.5, gain: 0.15, cutoff: 1400, attack: 0.02 }),
      );
      return 0.95;
    }

    case 'unlock':
      playTone(ctx, out, { freq: 783.99, start: t, duration: 0.22, gain: 0.1 });
      playTone(ctx, out, { freq: 1174.66, start: t + 0.09, duration: 0.36, gain: 0.1 });
      playTone(ctx, out, { freq: 1174.66, start: t + 0.09, duration: 0.36, gain: 0.04, detune: 9 });
      return 0.45;

    case 'claim': {
      // A bright, quick shimmer: credits landing.
      const notes = [987.77, 1318.5, 1975.5];
      notes.forEach((freq, i) => playTone(ctx, out, { freq, start: t + i * 0.06, duration: 0.28, gain: 0.09 }));
      playTone(ctx, out, { type: 'triangle', freq: 659.25, start: t, duration: 0.3, gain: 0.08, cutoff: 2600 });
      return 0.42;
    }

    case 'achievement': {
      // Two-chord "badge" fanfare, soft and short.
      [523.25, 659.25, 783.99].forEach((freq) => playTone(ctx, out, { type: 'triangle', freq, start: t, duration: 0.3, gain: 0.07, cutoff: 3000 }));
      [698.46, 880, 1046.5].forEach((freq) => playTone(ctx, out, { type: 'triangle', freq, start: t + 0.16, duration: 0.5, gain: 0.07, cutoff: 3000 }));
      return 0.66;
    }

    case 'energy':
      // A bright electric "zap" for an Energy Arrow collected.
      playTone(ctx, out, { type: 'triangle', freq: 1318.5, to: 2093, start: t, duration: 0.12, gain: 0.09, cutoff: 4200 });
      playTone(ctx, out, { freq: 2637, start: t + 0.04, duration: 0.18, gain: 0.03 });
      return 0.22;

    case 'promoted': {
      // A rising fanfare, a little longer than an achievement.
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
        playTone(ctx, out, { type: 'triangle', freq, start: t + i * 0.08, duration: 0.5, gain: 0.08, cutoff: 3600 }),
      );
      return 0.9;
    }
  }
}

/** Minimum gap between two plays of the same sound, in ms (see Throttle). */
export const SOUND_GAP_MS: Readonly<Record<SoundId, number>> = {
  tap: 45,
  release: 50,
  chain: 70,
  blocked: 90,
  nudge: 90,
  lifeLost: 200,
  complete: 600,
  star: 60,
  gameOver: 600,
  unlock: 400,
  claim: 400,
  achievement: 700,
  energy: 60,
  promoted: 1000,
};
