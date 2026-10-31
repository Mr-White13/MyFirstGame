import type { SoundId, SoundOptions } from '../audio/sounds';
import type { HapticId } from '../haptics/Haptics';

/** Something the player should hear or feel. Every one also has a visible counterpart on screen. */
export type FeedbackEvent =
  | { readonly type: 'tap' }
  /** The tapped arrow leaves the board. */
  | { readonly type: 'release' }
  /** A red arrow released automatically; `index` is its place in the chain (0 = first). */
  | { readonly type: 'chain'; readonly index: number }
  /** A tap on a blocked arrow: a collision that costs a life, or a free nudge of an arrow that is already red. */
  | { readonly type: 'blocked'; readonly lifeLost: boolean }
  /** The last arrow is off the board. */
  | { readonly type: 'complete' }
  /** The completion dialog reveals `stars`; `unlocked` if it opened the next level. `reduced` = no stagger. */
  | { readonly type: 'stars'; readonly stars: number; readonly unlocked: boolean; readonly reduced: boolean }
  | { readonly type: 'gameOver' }
  /** A daily reward was claimed. */
  | { readonly type: 'claim' }
  /** One or more achievements unlocked. */
  | { readonly type: 'achievement' }
  /** An Energy Arrow was collected (the point is already saved). */
  | { readonly type: 'energy' }
  /** A league promotion was shown. */
  | { readonly type: 'promoted' };

export interface SoundPlayer {
  play(id: SoundId, options?: SoundOptions & { delay?: number }): boolean;
}

export interface HapticPlayer {
  play(id: HapticId): boolean;
}

/** When the dialog's stars light up (seconds after it opens); matches the CSS `star-in` delays. */
export function starDelays(stars: number, reduced: boolean): number[] {
  return Array.from({ length: stars }, (_, i) => (reduced ? 0.05 + i * 0.12 : 0.28 + i * 0.16));
}

/**
 * Turns game events into sound and haptics. Both are extras: muted or
 * without vibration, the screen still shows everything (flashes, hearts,
 * dialogs), so nothing depends on them.
 */
export class Feedback {
  constructor(
    private readonly sound: SoundPlayer,
    private readonly haptics: HapticPlayer,
  ) {}

  handle(event: FeedbackEvent): void {
    switch (event.type) {
      case 'tap':
        this.sound.play('tap');
        return;
      case 'release':
        this.sound.play('release');
        this.haptics.play('release');
        return;
      case 'chain':
        this.sound.play('chain', { step: event.index });
        // One pulse for the whole chain, not one per arrow.
        if (event.index === 0) this.haptics.play('chain');
        return;
      case 'blocked':
        if (event.lifeLost) {
          this.sound.play('blocked');
          this.sound.play('lifeLost', { delay: 0.12 });
          this.haptics.play('lifeLost');
        } else {
          this.sound.play('nudge');
        }
        return;
      case 'complete':
        this.sound.play('complete');
        this.haptics.play('complete');
        return;
      case 'stars': {
        const delays = starDelays(event.stars, event.reduced);
        delays.forEach((delay, step) => this.sound.play('star', { step, delay }));
        if (event.unlocked) this.sound.play('unlock', { delay: (delays[delays.length - 1] ?? 0) + 0.3 });
        return;
      }
      case 'gameOver':
        this.sound.play('gameOver');
        return;
      case 'claim':
        this.sound.play('claim');
        this.haptics.play('reward');
        return;
      case 'achievement':
        this.sound.play('achievement');
        this.haptics.play('reward');
        return;
      case 'energy':
        this.sound.play('energy');
        this.haptics.play('release');
        return;
      case 'promoted':
        this.sound.play('promoted');
        this.haptics.play('complete');
        return;
    }
  }
}
