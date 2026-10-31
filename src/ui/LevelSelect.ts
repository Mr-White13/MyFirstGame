import type { LevelData } from '../core/types';
import { chapterCount, chapterOf, chapterSummary, chapterTiles, clampChapter, currentChapter, type LevelTile } from '../progress/chapters';
import { completedCount, MAX_STARS, nextLevelToPlay, totalStars, type Progress } from '../progress/Progress';
import { UNLOCK_ALL_LEVELS_FOR_TESTING } from '../progress/testUnlock';
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

/**
 * Level selection screen: overall progress, one chapter of level tiles at a
 * time (see progress/chapters.ts) with previous / next and "jump to current",
 * and a "play" shortcut. Only the shown chapter's tiles (at most 20) exist in
 * the page, however many levels the game has.
 */
export class LevelSelect {
  private readonly grid = requireElement<HTMLOListElement>('level-grid');
  private readonly count = requireElement('progress-count');
  private readonly total = requireElement('progress-total');
  private readonly fill = requireElement('progress-fill');
  private readonly stars = requireElement('progress-stars');
  private readonly starsTotal = requireElement('progress-stars-total');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-continue');
  private readonly chapterTitle = requireElement('chapter-title');
  private readonly chapterMeta = requireElement('chapter-meta');
  private readonly prevButton = requireElement<HTMLButtonElement>('btn-chapter-prev');
  private readonly nextButton = requireElement<HTMLButtonElement>('btn-chapter-next');
  private readonly currentButton = requireElement<HTMLButtonElement>('btn-chapter-current');
  private selectHandler: (levelId: number) => void = () => {};
  private continueLevel = 1;
  /** The chapter on screen; null until the player (or a focus) picks one: then it follows the current level. */
  private chapter: number | null = null;
  private progress?: Progress;

  constructor(private readonly levels: readonly LevelData[]) {
    // One delegated listener; tiles are re-rendered whenever progress or the chapter changes.
    this.grid.addEventListener('click', (event) => {
      const tile = (event.target as Element).closest<HTMLButtonElement>('button[data-level]');
      if (tile && !tile.disabled) this.selectHandler(Number(tile.dataset.level));
    });
    this.continueButton.addEventListener('click', () => this.selectHandler(this.continueLevel));
    this.prevButton.addEventListener('click', () => this.showChapter(this.shownChapter - 1));
    this.nextButton.addEventListener('click', () => this.showChapter(this.shownChapter + 1));
    this.currentButton.addEventListener('click', () => {
      if (this.progress) this.showChapter(currentChapter(this.progress, this.levels.length));
    });
    requireElement('levels-testing').hidden = !UNLOCK_ALL_LEVELS_FOR_TESTING;
  }

  onBack(handler: () => void): void {
    requireElement('btn-levels-back').addEventListener('click', handler);
  }

  onSelect(handler: (levelId: number) => void): void {
    this.selectHandler = handler;
  }

  /** The chapter currently shown. */
  get shownChapter(): number {
    const count = this.levels.length;
    return this.chapter ?? (this.progress ? currentChapter(this.progress, count) : 1);
  }

  render(progress: Progress): void {
    this.progress = progress;
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

    this.renderChapter();
  }

  /** Shows a chapter (clamped to the ones that exist). */
  showChapter(chapter: number): void {
    this.chapter = clampChapter(chapter, this.levels.length);
    this.renderChapter();
  }

  /** Shows the level's chapter and focuses its tile (or the play button) so keyboard users land somewhere sensible. */
  focusLevel(levelId: number): void {
    this.showChapter(chapterOf(levelId));
    const tile = this.grid.querySelector<HTMLButtonElement>(`button[data-level="${levelId}"]`);
    (tile && !tile.disabled ? tile : this.continueButton).focus({ preventScroll: true });
  }

  private renderChapter(): void {
    const progress = this.progress;
    if (!progress) return;
    const levelCount = this.levels.length;
    const chapter = clampChapter(this.shownChapter, levelCount);
    const chapters = chapterCount(levelCount);
    const summary = chapterSummary(progress, chapter, levelCount);
    this.chapterTitle.textContent = `Chapter ${chapter}`;
    this.chapterMeta.textContent = `Levels ${summary.first}–${summary.last} · ${summary.completed}/${summary.levels} done · ${summary.stars}/${summary.maxStars} ★`;
    this.prevButton.disabled = chapter <= 1;
    this.nextButton.disabled = chapter >= chapters;
    this.currentButton.disabled = chapter === currentChapter(progress, levelCount);
    this.grid.setAttribute('aria-label', `Chapter ${chapter} of ${chapters}: levels ${summary.first} to ${summary.last}`);
    this.grid.replaceChildren(...chapterTiles(progress, chapter, levelCount).map((tile) => this.tile(tile)));
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

  private tile(tile: LevelTile): HTMLLIElement {
    const level = this.levels[tile.id - 1];
    const { state, bestStars } = tile;
    const completed = state === 'completed';

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.level = String(tile.id);
    button.className = 'level-tile';
    button.classList.toggle('level-tile--locked', state === 'locked' || state === 'test');
    button.classList.toggle('level-tile--completed', completed);
    button.classList.toggle('level-tile--current', state === 'current');
    // Testing flag: really locked levels can still be opened (shown with a dashed outline; results not saved).
    button.classList.toggle('level-tile--test', state === 'test');
    button.disabled = state === 'locked';
    const description =
      state === 'test'
        ? 'locked, open for testing, result not saved'
        : state === 'locked'
          ? 'locked'
          : !completed
            ? 'not completed yet'
            : bestStars === null
              ? 'completed, not yet rated'
              : `completed with ${bestStars} of ${MAX_STARS} stars`;
    button.setAttribute('aria-label', `Level ${tile.id}, ${level.rows} by ${level.cols}, ${description}`);

    const number = document.createElement('span');
    number.className = 'level-tile__number';
    number.textContent = String(tile.id);
    // Rated levels show their best stars; the rest show the grid size.
    const meta = completed && bestStars !== null ? this.starRow(bestStars) : document.createElement('span');
    if (!(completed && bestStars !== null)) {
      meta.className = 'level-tile__meta';
      meta.textContent = `${level.rows}×${level.cols}`;
    }
    button.append(number, meta);
    if (state === 'locked') button.append(icon('lock', 'level-tile__mark'));
    else if (completed) button.append(icon('check', 'level-tile__mark'));

    const item = document.createElement('li');
    item.append(button);
    return item;
  }
}
