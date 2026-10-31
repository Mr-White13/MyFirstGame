import { formatPrecise } from '../core/time';
import type { LevelData } from '../core/types';
import { chapterCount, chapterOf, chapterSummary, clampChapter, currentChapter, queryRecords, type RecordEntry, type RecordsQuery } from '../progress/chapters';
import { MAX_STARS, type Progress } from '../progress/Progress';
import { requireElement } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Personal records, one page at a time: a chapter of 20 levels (previous /
 * next), or the levels matching a typed level number. Only the rows on the
 * page are created, however many levels the game has.
 */
export class RecordsScreen {
  private readonly list = requireElement<HTMLOListElement>('records-list');
  private readonly note = requireElement('records-note');
  private readonly search = requireElement<HTMLInputElement>('records-search');
  private readonly title = requireElement('records-chapter-title');
  private readonly meta = requireElement('records-chapter-meta');
  private readonly prev = requireElement<HTMLButtonElement>('btn-records-chapter-prev');
  private readonly next = requireElement<HTMLButtonElement>('btn-records-chapter-next');
  private progress?: Progress;
  /** Chosen chapter; null follows the chapter of the level to play next. */
  private chapter: number | null = null;

  constructor(
    private readonly levels: readonly LevelData[],
    onBack: () => void,
  ) {
    requireElement('btn-records-back').addEventListener('click', onBack);
    this.prev.addEventListener('click', () => this.showChapter(this.shownChapter - 1));
    this.next.addEventListener('click', () => this.showChapter(this.shownChapter + 1));
    this.search.addEventListener('input', () => {
      // Digits only (some keyboards allow more in a numeric field).
      const digits = this.search.value.replace(/\D/g, '');
      if (digits !== this.search.value) this.search.value = digits;
      this.renderPage();
    });
  }

  private get shownChapter(): number {
    return this.chapter ?? (this.progress ? currentChapter(this.progress, this.levels.length) : 1);
  }

  render(progress: Progress): void {
    this.progress = progress;
    this.renderPage();
  }

  /** Shows a chapter (clamped), clearing any search. */
  showChapter(chapter: number): void {
    this.chapter = clampChapter(chapter, this.levels.length);
    this.search.value = '';
    this.renderPage();
  }

  /** Back to the chapter of the level to play next, with no search (each time the screen opens). */
  reset(): void {
    this.chapter = null;
    this.search.value = '';
    this.renderPage();
  }

  /** The query for the current controls. */
  get query(): RecordsQuery {
    const typed = this.search.value.trim();
    return typed ? { search: typed } : { chapter: this.shownChapter };
  }

  private renderPage(): void {
    const progress = this.progress;
    if (!progress) return;
    const count = this.levels.length;
    const page = queryRecords(progress, count, this.query, (id) => this.levels[id - 1]?.revision ?? 1);

    const chapter = page.chapter ?? (page.entries[0] ? chapterOf(page.entries[0].levelId) : this.shownChapter);
    const summary = chapterSummary(progress, chapter, count);
    this.title.textContent = page.chapter === null ? 'Search' : `Chapter ${summary.chapter}`;
    this.meta.textContent =
      page.chapter === null
        ? `${page.matches} matching ${page.matches === 1 ? 'level' : 'levels'}`
        : `Levels ${summary.first}–${summary.last} · ${summary.completed}/${summary.levels} done · ${summary.stars}/${summary.maxStars} ★`;
    this.prev.disabled = page.chapter === null || page.chapter <= 1;
    this.next.disabled = page.chapter === null || page.chapter >= chapterCount(count);
    this.note.textContent =
      page.chapter !== null
        ? ''
        : page.entries.length === 0
          ? `No level ${this.search.value}: the game has levels 1–${count}.`
          : page.matches > page.entries.length
            ? `Showing the first ${page.entries.length}. Type more digits to narrow it down.`
            : '';
    if (page.entries.some((e) => e.olderLayout)) {
      this.note.textContent = [this.note.textContent, '* Best set on an earlier layout of the level.'].filter(Boolean).join(' ');
    }
    this.list.replaceChildren(...page.entries.map((entry) => this.row(entry)));
  }

  private row(entry: RecordEntry): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'record';
    const completed = entry.status === 'completed';
    item.classList.toggle('record--empty', !completed);
    item.classList.toggle('record--older', entry.olderLayout);

    const name = document.createElement('span');
    name.className = 'record__level';
    name.textContent = `Level ${entry.levelId}`;
    const time = document.createElement('span');
    time.className = 'record__time';
    time.textContent = entry.bestTimeMs != null ? formatPrecise(entry.bestTimeMs) : completed ? 'not timed' : entry.status === 'locked' ? 'locked' : '–';
    time.classList.toggle('record__time--none', entry.bestTimeMs == null);
    const stars = document.createElement('span');
    stars.className = 'record__stars';
    const earned = entry.bestStars ?? 0;
    for (let i = 0; i < MAX_STARS; i++) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', i < earned ? 'star-mini star-mini--earned' : 'star-mini');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#icon-spark');
      svg.append(use);
      stars.append(svg);
    }
    if (entry.olderLayout) item.title = 'Set on an earlier layout of this level';
    item.setAttribute(
      'aria-label',
      completed
        ? `Level ${entry.levelId}: best time ${time.textContent}, ${entry.bestStars === null ? 'unranked' : `${earned} stars`}${entry.olderLayout ? ', set on an earlier layout' : ''}`
        : `Level ${entry.levelId}: ${entry.status}`,
    );
    item.append(name, time, stars);
    return item;
  }
}
