import { formatPrecise } from '../core/time';
import { Overlay, requireElement } from './dom';

export interface CompletionSummary {
  readonly levelId: number;
  readonly levelCount: number;
  readonly arrows: number;
  /** Stars earned in this run (1..3) = lives left. */
  readonly stars: number;
  readonly directClears: number;
  readonly autoClears: number;
  readonly mistakes: number;
  /** Active play time of this run. */
  readonly timeMs: number;
  /** Fastest time on this level after this run (may be this run). */
  readonly bestTimeMs: number;
  /** True if this run was the fastest so far. */
  readonly newBestTime: boolean;
  /** True if this run improved the level's best rating (or set its first one). */
  readonly newBestStars: boolean;
  /** Level newly unlocked by this completion, if any. */
  readonly unlocked: number | null;
}

/** A completed Daily League challenge. */
export interface ChallengeCompletion {
  readonly number: number;
  readonly stars: number;
  readonly timeMs: number;
  readonly mistakes: number;
  readonly collected: number;
  readonly perChallenge: number;
  /** Points first collected during this attempt. */
  readonly newPoints: number;
  readonly today: number;
  readonly maxToday: number;
  readonly leagueName: string;
  /** True if another challenge today is still unfinished. */
  readonly hasNext: boolean;
}

export interface CompletionActions {
  onNext(): void;
  onReplay(): void;
  onLevels(): void;
  onPlayFromStart(): void;
}

/**
 * The level-complete dialog: stars, time and personal best, run statistics
 * and next steps. After the last level it switches to a "game complete"
 * variant that offers to start again from level 1.
 */
export class CompleteDialog {
  private readonly overlay = new Overlay(requireElement('complete-dialog'));
  private readonly icon = requireElement('complete-icon') as unknown as SVGUseElement;
  private readonly eyebrow = requireElement('complete-eyebrow');
  private readonly title = requireElement('complete-title');
  private readonly stars = requireElement('complete-stars');
  private readonly lives = requireElement('complete-lives');
  private readonly detail = requireElement('complete-detail');
  private readonly time = requireElement('complete-time');
  private readonly bestTime = requireElement('complete-best-time');
  private readonly arrows = requireElement('complete-arrows');
  private readonly chain = requireElement('complete-chain');
  private readonly mistakes = requireElement('complete-mistakes');
  private readonly newTime = requireElement('complete-new-time');
  private readonly best = requireElement('complete-best');
  private readonly unlocked = requireElement('complete-unlocked');
  private readonly nextButton = requireElement<HTMLButtonElement>('btn-next');
  private readonly fromStartButton = requireElement<HTMLButtonElement>('btn-play-from-start');
  private readonly levelStats = requireElement('complete-level-stats');
  private readonly challengeStats = requireElement('complete-challenge-stats');
  private readonly nextLabel = requireElement('btn-next-label');
  private readonly levelsLabel = requireElement('btn-levels-label');

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
    this.setChallengeMode(false);
    const final = summary.levelId === summary.levelCount;
    this.overlay.element.classList.toggle('overlay--final', final);
    this.icon.setAttribute('href', final ? '#icon-star' : '#icon-check');
    this.eyebrow.textContent = final ? `Level ${summary.levelId} · Final level` : `Level ${summary.levelId}`;
    this.title.textContent = final ? 'All levels complete!' : 'Level complete';
    this.detail.textContent = final
      ? `You escaped all ${summary.levelCount} levels. Thanks for playing!`
      : summary.mistakes === 0
        ? 'Flawless: not a single mistake'
        : '';
    this.detail.hidden = this.detail.textContent === '';

    // Stars light up one after another (CSS staggers them via --i).
    const stars = [...this.stars.children] as SVGElement[];
    stars.forEach((star, index) => {
      star.classList.toggle('star--earned', index < summary.stars);
      star.style.setProperty('--i', String(index));
    });
    this.stars.setAttribute('aria-label', `${summary.stars} of ${stars.length} stars`);
    this.lives.textContent = `${summary.stars} ${summary.stars === 1 ? 'life' : 'lives'} left`;

    this.time.textContent = formatPrecise(summary.timeMs);
    this.bestTime.textContent = formatPrecise(summary.bestTimeMs);
    this.arrows.textContent = String(summary.directClears + summary.autoClears);
    this.chain.textContent = summary.autoClears > 0 ? ` · ${summary.autoClears} by chain` : '';
    this.mistakes.textContent = String(summary.mistakes);

    // The time and the rating are separate records: either can improve on its own.
    this.newTime.hidden = !summary.newBestTime;
    this.best.hidden = !summary.newBestStars;
    this.unlocked.hidden = final || summary.unlocked === null;
    this.unlocked.textContent = summary.unlocked === null ? '' : `Level ${summary.unlocked} unlocked`;

    this.nextButton.hidden = final;
    this.fromStartButton.hidden = !final;
    this.overlay.show(final ? this.fromStartButton : this.nextButton);
  }

  /** The challenge variant: stars, time, Energy Arrows and points instead of personal bests and unlocks. */
  showChallenge(c: ChallengeCompletion): void {
    this.setChallengeMode(true);
    this.overlay.element.classList.remove('overlay--final');
    this.icon.setAttribute('href', '#icon-bolt');
    this.eyebrow.textContent = `Daily League · ${c.leagueName}`;
    this.title.textContent = `Challenge ${c.number}/3 complete`;
    this.detail.textContent = c.mistakes === 0 ? 'Flawless: not a single mistake' : '';
    this.detail.hidden = this.detail.textContent === '';
    const stars = [...this.stars.children] as SVGElement[];
    stars.forEach((star, index) => {
      star.classList.toggle('star--earned', index < c.stars);
      star.style.setProperty('--i', String(index));
    });
    this.stars.setAttribute('aria-label', `${c.stars} of ${stars.length} stars`);
    this.lives.textContent = `${c.stars} ${c.stars === 1 ? 'life' : 'lives'} left`;
    requireElement('complete-challenge-time').textContent = formatPrecise(c.timeMs);
    requireElement('complete-energy').textContent = `${c.collected} / ${c.perChallenge}`;
    requireElement('complete-new-points').textContent = `+${c.newPoints}`;
    requireElement('complete-today').textContent = `${c.today} / ${c.maxToday}`;
    this.newTime.hidden = true;
    this.best.hidden = true;
    this.unlocked.hidden = true;
    this.nextButton.hidden = false;
    this.fromStartButton.hidden = true;
    this.nextLabel.textContent = c.hasNext ? 'Next challenge' : 'League';
    this.overlay.show(this.nextButton);
  }

  private setChallengeMode(on: boolean): void {
    this.levelStats.hidden = on;
    this.challengeStats.hidden = !on;
    this.levelsLabel.textContent = on ? 'League' : 'Levels';
    if (!on) this.nextLabel.textContent = 'Next level';
  }

  hide(): void {
    this.overlay.hide();
  }
}
