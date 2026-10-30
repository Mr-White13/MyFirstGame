import { Overlay, prefersReducedMotion, requireElement } from './dom';

export interface CompletionSummary {
  readonly levelId: number;
  readonly levelCount: number;
  readonly moves: number;
  readonly arrows: number;
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
 * The level-complete dialog. After the last level it switches to a
 * "game complete" variant that offers to start again from level 1.
 */
export class CompleteDialog {
  private readonly overlay = new Overlay(requireElement('complete-dialog'));
  private readonly icon = requireElement('complete-icon') as unknown as SVGUseElement;
  private readonly eyebrow = requireElement('complete-eyebrow');
  private readonly title = requireElement('complete-title');
  private readonly moves = requireElement('complete-moves');
  private readonly movesLabel = requireElement('complete-moves-label');
  private readonly detail = requireElement('complete-detail');
  private readonly unlocked = requireElement('complete-unlocked');
  private readonly nextButton = requireElement<HTMLButtonElement>('btn-next');
  private readonly fromStartButton = requireElement<HTMLButtonElement>('btn-play-from-start');
  private frame = 0;

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
      : `All ${summary.arrows} arrows cleared`;
    this.movesLabel.textContent = summary.moves === 1 ? 'move' : 'moves';

    this.unlocked.hidden = final || summary.unlocked === null;
    this.unlocked.textContent = summary.unlocked === null ? '' : `Level ${summary.unlocked} unlocked`;

    this.nextButton.hidden = final;
    this.fromStartButton.hidden = !final;

    this.overlay.show(final ? this.fromStartButton : this.nextButton);
    this.countUp(summary.moves);
  }

  hide(): void {
    cancelAnimationFrame(this.frame);
    this.overlay.hide();
  }

  /** Rolls the move count up from zero; quick enough not to delay the buttons. */
  private countUp(target: number): void {
    cancelAnimationFrame(this.frame);
    if (prefersReducedMotion() || target === 0) {
      this.moves.textContent = String(target);
      return;
    }
    const duration = 450;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.moves.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) this.frame = requestAnimationFrame(tick);
    };
    this.moves.textContent = '0';
    this.frame = requestAnimationFrame(tick);
  }
}
