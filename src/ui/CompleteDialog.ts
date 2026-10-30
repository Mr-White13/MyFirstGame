import { Overlay, requireElement } from './dom';

export interface CompletionSummary {
  readonly levelId: number;
  readonly levelCount: number;
  readonly arrows: number;
  /** Stars earned in this run (1..3). */
  readonly stars: number;
  readonly directClears: number;
  readonly autoClears: number;
  readonly mistakes: number;
  /** True if this run improved the level's best rating (or set its first one). */
  readonly newBest: boolean;
  /** Level newly unlocked by this completion, if any. */
  readonly unlocked: number | null;
}

export interface CompletionActions {
  onNext(): void;
  onReplay(): void;
  onLevels(): void;
  onPlayFromStart(): void;
}

/**
 * The level-complete dialog: star rating, run statistics and next steps.
 * After the last level it switches to a "game complete" variant that offers
 * to start again from level 1.
 */
export class CompleteDialog {
  private readonly overlay = new Overlay(requireElement('complete-dialog'));
  private readonly icon = requireElement('complete-icon') as unknown as SVGUseElement;
  private readonly eyebrow = requireElement('complete-eyebrow');
  private readonly title = requireElement('complete-title');
  private readonly stars = requireElement('complete-stars');
  private readonly detail = requireElement('complete-detail');
  private readonly direct = requireElement('complete-direct');
  private readonly auto = requireElement('complete-auto');
  private readonly mistakes = requireElement('complete-mistakes');
  private readonly best = requireElement('complete-best');
  private readonly unlocked = requireElement('complete-unlocked');
  private readonly nextButton = requireElement<HTMLButtonElement>('btn-next');
  private readonly fromStartButton = requireElement<HTMLButtonElement>('btn-play-from-start');

  constructor(actions: CompletionActions) {
    this.nextButton.addEventListener('click', () => actions.onNext());
    this.fromStartButton.addEventListener('click', () => actions.onPlayFromStart());
    requireElement('btn-replay').addEventListener('click', () => actions.onReplay());
    requireElement('btn-levels').addEventListener('click', () => actions.onLevels());
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(summary: CompletionSummary): void {
    const final = summary.levelId === summary.levelCount;
    this.overlay.element.classList.toggle('overlay--final', final);
    this.icon.setAttribute('href', final ? '#icon-star' : '#icon-check');
    this.eyebrow.textContent = final ? `Level ${summary.levelId} · Final level` : `Level ${summary.levelId}`;
    this.title.textContent = final ? 'All levels complete!' : 'Level complete';
    this.detail.textContent = final
      ? `You escaped all ${summary.levelCount} levels. Thanks for playing!`
      : summary.mistakes === 0
        ? `Flawless: all ${summary.arrows} arrows cleared without a mistake`
        : `All ${summary.arrows} arrows cleared`;

    // Stars light up one after another (CSS staggers them via --i).
    const stars = [...this.stars.children] as SVGElement[];
    stars.forEach((star, index) => {
      star.classList.toggle('star--earned', index < summary.stars);
      star.style.setProperty('--i', String(index));
    });
    this.stars.setAttribute('aria-label', `${summary.stars} of ${stars.length} stars`);

    this.direct.textContent = String(summary.directClears);
    this.auto.textContent = String(summary.autoClears);
    this.mistakes.textContent = String(summary.mistakes);

    this.best.hidden = !summary.newBest;
    this.unlocked.hidden = final || summary.unlocked === null;
    this.unlocked.textContent = summary.unlocked === null ? '' : `Level ${summary.unlocked} unlocked`;

    this.nextButton.hidden = final;
    this.fromStartButton.hidden = !final;
    this.overlay.show(final ? this.fromStartButton : this.nextButton);
  }

  hide(): void {
    this.overlay.hide();
  }
}
