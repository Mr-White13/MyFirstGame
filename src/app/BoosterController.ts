import {
  BOOSTER_IDS,
  BOOSTER_LOCK_MS,
  BOOSTERS,
  blockMessage,
  checkBooster,
  hintTarget,
  REVEAL_MS,
  type BoosterBlock,
  type BoosterContext,
  type BoosterId,
} from '../boosters/Boosters';
import type { GameState } from '../core/GameState';
import type { BoosterBarView } from '../ui/BoosterBar';

/** What the controller needs, as small interfaces (tests pass plain objects). */
export interface BoosterDeps {
  readonly state: Pick<GameState, 'isPlaying' | 'lives' | 'maxLives' | 'escapableArrows' | 'getArrows' | 'blockerOf' | 'restoreLife'>;
  readonly scene: {
    readonly hintShowing: boolean;
    readonly revealShowing: boolean;
    showHint(arrowId: string): boolean;
    showReveal(arrowIds: readonly string[], ms: number): boolean;
  };
  /** The existing Energy Credits wallet (Rewards). `spend` saves the charge; false = nothing was charged. */
  readonly wallet: { readonly credits: number; spend(id: BoosterId): boolean };
  /** The open attempt: booster uses are counted per attempt. */
  readonly attempt: { readonly isOpen: boolean; useBooster(id: BoosterId): void };
  readonly bar: { render(view: BoosterBarView): void; flash(id: BoosterId): void };
  /** The current run: challenges and the tutorial levels have no boosters, test plays get them free. */
  readonly mode: () => { readonly challenge: boolean; readonly testPlay: boolean; readonly tutorial?: boolean };
  /** A short message for the player (the toast). */
  readonly notify: (message: string) => void;
  /** Sound / haptics when a booster works. */
  readonly onUsed?: (id: BoosterId) => void;
  readonly now?: () => number;
  /** Runs `fn` after `ms` (to refresh the bar when Reveal ends). */
  readonly later?: (fn: () => void, ms: number) => void;
}

export type BoosterOutcome = { readonly used: true; readonly charged: number } | { readonly used: false; readonly reason: BoosterBlock };

/**
 * Hint, Reveal and Extra Heart during a level. For each tap it:
 * 1. checks the booster can do something now (BoosterContext), and finds its
 *    target on the current board, before any payment;
 * 2. pays: credits through the existing wallet (one saved write), or free in
 *    a test play (no real credits are ever spent there);
 * 3. applies the effect (the scene's highlight, or GameState.restoreLife),
 *    with the same synchronous checks as step 1, so it can't fail after paying;
 * 4. counts the use for the attempt and ignores further booster taps for
 *    BOOSTER_LOCK_MS, so a double tap never pays twice.
 * A failed or invalid activation never charges anything.
 */
export class BoosterController {
  private lockedUntil = -Infinity;
  private readonly now: () => number;

  constructor(private readonly deps: BoosterDeps) {
    this.now = deps.now ?? (() => performance.now());
  }

  use(id: BoosterId): BoosterOutcome {
    const { state, scene, wallet, attempt, mode } = this.deps;
    if (mode().tutorial) return { used: false, reason: 'not-playing' }; // no toolbar there: nothing to explain
    const check = checkBooster(id, this.context());
    if (!check.ok) return this.refuse(id, check.reason);

    // Find the target first: nothing is charged when there is nothing to show.
    let apply: () => boolean;
    if (id === 'hint') {
      const target = hintTarget(state);
      if (!target) return this.refuse(id, 'no-target');
      apply = () => scene.showHint(target);
    } else if (id === 'reveal') {
      const targets = state.escapableArrows().map((a) => a.id);
      if (targets.length === 0) return this.refuse(id, 'no-target');
      apply = () => scene.showReveal(targets, REVEAL_MS);
    } else {
      apply = () => state.restoreLife();
    }

    const charged = check.payment.kind === 'credits' ? check.payment.cost : 0;
    if (charged > 0 && !wallet.spend(id)) return this.refuse(id, 'insufficient');
    const applied = apply();
    // Unreachable by construction (step 1 checked the same conditions in this same tick);
    // kept as a guard so a future change can't silently take credits for nothing.
    if (!applied) console.error(`[boosters] ${id} was paid but not applied`);

    if (attempt.isOpen) attempt.useBooster(id);
    this.lockedUntil = this.now() + BOOSTER_LOCK_MS;
    this.deps.bar.flash(id);
    this.deps.onUsed?.(id);
    if (id === 'heart') this.deps.notify(mode().testPlay ? 'Extra Heart: +1 heart (free in test play)' : `Extra Heart: +1 heart · −${charged} credits`);
    if (id === 'reveal') this.deps.later?.(() => this.render(), REVEAL_MS + 50);
    this.render();
    return { used: true, charged };
  }

  /** Refreshes the toolbar: balance, costs, and which boosters would work now. */
  render(): void {
    const { challenge, testPlay, tutorial } = this.deps.mode();
    const ctx = { ...this.context(), locked: false };
    const available = Object.fromEntries(BOOSTER_IDS.map((id) => [id, checkBooster(id, ctx).ok])) as Record<BoosterId, boolean>;
    this.deps.bar.render({ visible: !challenge && !tutorial, credits: this.deps.wallet.credits, free: testPlay, available });
  }

  private context(): BoosterContext {
    const { state, scene, wallet, attempt, mode } = this.deps;
    const { challenge, testPlay } = mode();
    const playing = state.isPlaying && attempt.isOpen;
    return {
      playing,
      challenge,
      testPlay,
      credits: wallet.credits,
      lives: state.lives,
      maxLives: state.maxLives,
      escapable: playing ? state.escapableArrows().length : 0,
      hintShowing: scene.hintShowing,
      revealShowing: scene.revealShowing,
      locked: this.now() < this.lockedUntil,
    };
  }

  private refuse(id: BoosterId, reason: BoosterBlock): BoosterOutcome {
    const message = blockMessage(id, reason, this.deps.wallet.credits);
    if (message) this.deps.notify(message);
    return { used: false, reason };
  }
}

/** The first-time tip, shown once (see App): what the boosters cost. Short, so it stays a small toast. */
export const BOOSTER_TIP = `Stuck? Boosters: ${BOOSTER_IDS.map((id) => `${BOOSTERS[id].name} ${BOOSTERS[id].cost}`).join(' · ')} credits`;
