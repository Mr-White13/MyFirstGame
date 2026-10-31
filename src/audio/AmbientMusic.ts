import { playTone } from './sounds';

/** Seconds per chord. Four chords make one 32-second cycle that repeats seamlessly. */
const BAR = 8;
/** How far ahead notes are scheduled, and how often the scheduler wakes. */
const LOOKAHEAD = 1.5;
const TICK_MS = 250;
const FADE_IN = 2.5;
const FADE_OUT = 0.8;

/** Chord tones in Hz: Am9 – Fmaj7 – Cmaj7 – Em7, voiced low and close for a calm pad. */
const CHORDS: readonly (readonly number[])[] = [
  [220, 261.63, 329.63, 493.88], // A C E B
  [174.61, 220, 261.63, 329.63], // F A C E
  [130.81, 196, 246.94, 329.63], // C G B E
  [164.81, 196, 246.94, 293.66], // E G B D
];
const BASS = [55, 43.65, 65.41, 41.2];

/**
 * An original, generative ambient track: a slow pad over a soft sub bass,
 * with sparse plucks echoing through a delay. Nothing is pre-recorded; it is
 * synthesised as it plays, so it loops forever without a seam and costs no
 * download. Notes are scheduled a little ahead on the audio clock, so timer
 * jitter (or a backgrounded tab) never causes gaps or bursts.
 */
export class AmbientMusic {
  /** Fades the whole track in and out. */
  private readonly fader: GainNode;
  private readonly input: GainNode;
  private readonly nodes: AudioNode[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private playing = false;
  private nextBar = 0;
  private bar = 0;
  private nextPluck = 0;
  private seed = 0x2f6b;

  constructor(
    private readonly ctx: BaseAudioContext,
    out: AudioNode,
  ) {
    this.fader = ctx.createGain();
    this.fader.gain.value = 0;
    // Gentle low-pass keeps the pad warm and out of the way of the effects.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1500;
    // A simple feedback echo gives the plucks some space.
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;

    this.input = ctx.createGain();
    this.input.connect(tone);
    tone.connect(this.fader);
    this.input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.fader);
    this.fader.connect(out);
    this.nodes.push(tone, delay, feedback, wet, this.input, this.fader);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Fades in (or back in, if it was fading out). Does not restart a track already playing. */
  start(): void {
    clearTimeout(this.stopTimer);
    this.stopTimer = undefined;
    const now = this.ctx.currentTime;
    this.ramp(1, FADE_IN);
    if (this.playing) return;
    this.playing = true;
    if (this.nextBar < now) {
      this.nextBar = now + 0.05;
      this.nextPluck = now + 1;
    }
    this.schedule();
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  /** Fades out, then stops scheduling new notes. */
  stop(): void {
    if (!this.playing || this.stopTimer) return;
    this.ramp(0, FADE_OUT);
    this.stopTimer = setTimeout(() => {
      this.stopTimer = undefined;
      this.playing = false;
      clearInterval(this.timer);
    }, FADE_OUT * 1000 + 50);
  }

  destroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.stopTimer);
    this.playing = false;
    this.nodes.forEach((node) => node.disconnect());
  }

  private ramp(value: number, seconds: number): void {
    const g = this.fader.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
  }

  private schedule(): void {
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    // After a long stall (backgrounded, device change) skip ahead instead of catching up in a burst.
    if (this.nextBar < this.ctx.currentTime - BAR) {
      this.nextBar = this.ctx.currentTime + 0.05;
      this.nextPluck = this.nextBar + 1;
    }
    while (this.nextBar < horizon) {
      this.playBar(this.bar % CHORDS.length, this.nextBar);
      this.bar++;
      this.nextBar += BAR;
    }
    while (this.nextPluck < horizon) {
      this.playPluck(this.nextPluck);
      this.nextPluck += 0.5 * (1 + Math.floor(this.random() * 3)); // every 0.5, 1 or 1.5 s
    }
  }

  private playBar(index: number, t: number): void {
    // Long, overlapping envelopes: each chord swells in while the last fades out.
    const length = BAR + 3;
    for (const freq of CHORDS[index]) {
      for (const detune of [-6, 6]) {
        playTone(this.ctx, this.input, { type: 'triangle', freq, start: t, duration: length, gain: 0.022, attack: 2.4, detune, cutoff: 1100 });
      }
    }
    playTone(this.ctx, this.input, { freq: BASS[index], start: t, duration: length, gain: 0.09, attack: 1.5 });
  }

  private playPluck(t: number): void {
    if (this.random() < 0.35) return; // leave space
    const chord = CHORDS[(this.bar + CHORDS.length - 1) % CHORDS.length];
    const freq = chord[Math.floor(this.random() * chord.length)] * 2;
    playTone(this.ctx, this.input, { freq, start: t, duration: 1.1, gain: 0.03, attack: 0.01 });
  }

  /** Small deterministic generator: the same gentle variation every session. */
  private random(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}
