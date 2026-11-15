import { t } from '../i18n/translate';
import { Overlay, requireElement } from './dom';

export interface FailureSummary {
  readonly levelId: number;
  readonly cleared: number;
  readonly total: number;
  readonly mistakes: number;
  /** Set for a Daily League challenge: its number and the points kept today. */
  readonly challenge?: { readonly number: number; readonly today: number; readonly maxToday: number };
  /** Offer "Continue" (watch a rewarded ad for one heart). */
  readonly canContinue?: boolean;
}

export interface FailureActions {
  onTryAgain(): void;
  onLevels(): void;
  /** "Continue": watch a rewarded ad, then the same run goes on with one heart. */
  onContinue?(): void;
}

/** Shown when the last life is lost. Saved progress is never touched by a failure. */
export class GameOverDialog {
  private readonly overlay = new Overlay(requireElement('gameover-dialog'));
  private readonly eyebrow = requireElement('gameover-eyebrow');
  private readonly detail = requireElement('gameover-detail');
  private readonly cleared = requireElement('gameover-cleared');
  private readonly mistakes = requireElement('gameover-mistakes');
  private readonly tryAgainButton = requireElement<HTMLButtonElement>('btn-try-again');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-continue-ad');

  constructor(actions: FailureActions) {
    this.tryAgainButton.addEventListener('click', () => actions.onTryAgain());
    this.continueButton.addEventListener('click', () => actions.onContinue?.());
    this.continueButton.setAttribute('aria-label', t('game.continueAdAria'));
    requireElement('btn-gameover-levels').addEventListener('click', () => actions.onLevels());
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(summary: FailureSummary): void {
    const c = summary.challenge;
    this.eyebrow.textContent = c ? t('game.dailyChallenge', { number: c.number }) : t('game.level', { level: summary.levelId });
    const left = summary.total - summary.cleared;
    this.detail.textContent = c
      ? t('game.gameOverChallenge', { today: c.today, max: c.maxToday })
      : t('game.gameOverArrowsLeft', { count: left });
    requireElement('btn-gameover-levels-label').textContent = t(c ? 'game.league' : 'game.levels');
    this.cleared.textContent = `${summary.cleared} / ${summary.total}`;
    this.mistakes.textContent = String(summary.mistakes);
    this.continueButton.hidden = !summary.canContinue;
    this.overlay.show(summary.canContinue ? this.continueButton : this.tryAgainButton);
  }

  hide(): void {
    this.overlay.hide();
  }
}
