import type { LevelData } from '../core/types';
import {
  completedCount,
  isCompleted,
  isUnlocked,
  MAX_STARS,
  nextLevelToPlay,
  totalStars,
  type Progress,
} from '../progress/Progress';
import { requireElement } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon(name: string, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#icon-${name}`);
  svg.append(use);
  return svg;
}

/** Level selection screen: progress summary, level tiles and a "play" shortcut. */
export class LevelSelect {
  private readonly grid = requireElement<HTMLOListElement>('level-grid');
  private readonly count = requireElement('progress-count');
  private readonly total = requireElement('progress-total');
  private readonly fill = requireElement('progress-fill');
  private readonly stars = requireElement('progress-stars');
  private readonly starsTotal = requireElement('progress-stars-total');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-continue');
  private selectHandler: (levelId: number) => void = () => {};
  private continueLevel = 1;

  constructor(private readonly levels: readonly LevelData[]) {
    // One delegated listener; tiles are re-rendered whenever progress changes.
    this.grid.addEventListener('click', (event) => {
      const tile = (event.target as Element).closest<HTMLButtonElement>('button[data-level]');
      if (tile && !tile.disabled) this.selectHandler(Number(tile.dataset.level));
    });
    this.continueButton.addEventListener('click', () => this.selectHandler(this.continueLevel));
  }

  onBack(handler: () => void): void {
    requireElement('btn-levels-back').addEventListener('click', handler);
  }

  onSelect(handler: (levelId: number) => void): void {
    this.selectHandler = handler;
  }

  render(progress: Progress): void {
    const levelCount = this.levels.length;
    const done = completedCount(progress, levelCount);
    this.count.textContent = String(done);
    this.total.textContent = String(levelCount);
    this.fill.style.width = `${(done / levelCount) * 100}%`;
    this.stars.textContent = String(totalStars(progress, levelCount));
    this.starsTotal.textContent = String(levelCount * MAX_STARS);

    this.continueLevel = nextLevelToPlay(progress, levelCount);
    const allDone = done === levelCount;
    this.continueButton.textContent = allDone
      ? 'Play again'
      : done === 0
        ? 'Start'
        : `Continue · Level ${this.continueLevel}`;
    if (allDone) this.continueLevel = 1;

    this.grid.replaceChildren(...this.levels.map((level) => this.tile(level, progress)));
  }

  /** Focuses the tile for a level (or the play button) so keyboard users land somewhere sensible. */
  focusLevel(levelId: number): void {
    const tile = this.grid.querySelector<HTMLButtonElement>(`button[data-level="${levelId}"]`);
    (tile && !tile.disabled ? tile : this.continueButton).focus({ preventScroll: true });
  }

  private starRow(earned: number): HTMLSpanElement {
    const row = document.createElement('span');
    row.className = 'level-tile__stars';
    for (let i = 0; i < MAX_STARS; i++) {
      const star = icon('spark', i < earned ? 'star-mini star-mini--earned' : 'star-mini');
      row.append(star);
    }
    return row;
  }

  private tile(level: LevelData, progress: Progress): HTMLLIElement {
    const unlocked = isUnlocked(progress, level.id);
    const completed = isCompleted(progress, level.id);
    const current = unlocked && !completed && level.id === nextLevelToPlay(progress, this.levels.length);

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.level = String(level.id);
    button.className = 'level-tile';
    button.classList.toggle('level-tile--locked', !unlocked);
    button.classList.toggle('level-tile--completed', completed);
    button.classList.toggle('level-tile--current', current);
    button.disabled = !unlocked;
    const bestStars = progress.completed[level.id]?.bestStars ?? null;
    const state = !unlocked
      ? 'locked'
      : !completed
        ? 'not completed yet'
        : bestStars === null
          ? 'completed, not yet rated'
          : `completed with ${bestStars} of ${MAX_STARS} stars`;
    button.setAttribute('aria-label', `Level ${level.id}, ${level.rows} by ${level.cols}, ${state}`);

    const number = document.createElement('span');
    number.className = 'level-tile__number';
    number.textContent = String(level.id);
    // Rated levels show their best stars; the rest show the grid size.
    const meta = completed && bestStars !== null ? this.starRow(bestStars) : document.createElement('span');
    if (!(completed && bestStars !== null)) {
      meta.className = 'level-tile__meta';
      meta.textContent = `${level.rows}×${level.cols}`;
    }
    button.append(number, meta);
    if (!unlocked) button.append(icon('lock', 'level-tile__mark'));
    else if (completed) button.append(icon('check', 'level-tile__mark'));

    const item = document.createElement('li');
    item.append(button);
    return item;
  }
}
