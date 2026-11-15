import { formatPrecise } from '../core/time';
import type { LevelData } from '../core/types';
import { chapterCount, chapterOf, chapterName, chapterSummary, clampChapter, queryRecords, revealedLevelCount, type RecordEntry, type RecordsQuery } from '../progress/chapters';
import type { Progress } from '../progress/Progress';
import { chapterMeta, shownChapter } from './chapterNav';
import { requireElement, starIcons } from './dom';
import { t } from '../i18n/translate';

/**
 * Personal records, one page at a time: a chapter of 20 levels (previous /
 * next), or the levels matching a typed level number. Only the rows on the
 * page are created, however many levels the game has.
 */
export class RecordsScreen {
  private readonly list = requireElement<HTMLOListElement>('records-list');
  private readonly note = requireElement('records-note');
  private readonly search = requireElement<HTMLInputElement>('records-search');
  private readonly number = requireElement('records-chapter-number');
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
    return Math.min(shownChapter(this.chapter, this.progress, this.levels.length), chapterCount(this.revealed));
  }

  /** Levels the player may see (up to the end of the chapter reached). */
  private get revealed(): number {
    return this.progress ? revealedLevelCount(this.progress, this.levels.length) : this.levels.length;
  }

  render(progress: Progress): void {
    this.progress = progress;
    this.renderPage();
  }

  /** Shows a chapter (clamped), clearing any search. */
  showChapter(chapter: number): void {
    this.chapter = clampChapter(chapter, this.revealed);
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
    const count = this.revealed; // never page or search past the chapters reached
    const page = queryRecords(progress, count, this.query, (id) => this.levels[id - 1]?.revision ?? 1);

    const chapter = page.chapter ?? (page.entries[0] ? chapterOf(page.entries[0].levelId) : this.shownChapter);
    const summary = chapterSummary(progress, chapter, count);
    this.number.textContent = page.chapter === null ? t('profile.recordsTitle') : t('profile.recordsChapter', { chapter: summary.chapter });
    this.title.textContent = page.chapter === null ? t('profile.recordsSearch') : chapterName(summary.chapter);
    this.meta.textContent =
      page.chapter === null
        ? t('profile.recordsMatches', { count: page.matches })
        : chapterMeta(summary);
    this.prev.disabled = page.chapter === null || page.chapter <= 1;
    this.next.disabled = page.chapter === null || page.chapter >= chapterCount(count);
    this.note.textContent =
      page.chapter !== null
        ? ''
        : page.entries.length === 0
          ? t('profile.recordsNoLevel', { search: this.search.value, count })
          : page.matches > page.entries.length
            ? t('profile.recordsFirst', { count: page.entries.length })
            : '';
    if (page.entries.some((e) => e.olderLayout)) {
      this.note.textContent = [this.note.textContent, t('profile.recordsOlderNote')].filter(Boolean).join(' ');
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
    name.textContent = t('profile.recordLevel', { level: entry.levelId });
    const time = document.createElement('span');
    time.className = 'record__time';
    time.textContent = entry.bestTimeMs != null ? formatPrecise(entry.bestTimeMs) : completed ? t('profile.recordNotTimed') : entry.status === 'locked' ? t('profile.recordLocked') : '–';
    time.classList.toggle('record__time--none', entry.bestTimeMs == null);
    const stars = document.createElement('span');
    stars.className = 'record__stars';
    const earned = entry.bestStars ?? 0;
    stars.append(...starIcons(earned));
    if (entry.olderLayout) item.title = t('profile.recordOlderTitle');
    item.setAttribute('aria-label', this.ariaLabel(entry, time.textContent ?? '', earned));
    item.append(name, time, stars);
    return item;
  }

  /** The row read out by screen readers, as one whole sentence. */
  private ariaLabel(entry: RecordEntry, time: string, earned: number): string {
    const params = { level: entry.levelId, time, count: earned };
    if (entry.status === 'locked') return t('profile.recordAriaLocked', params);
    if (entry.status !== 'completed') return t('profile.recordAriaNotCompleted', params);
    if (entry.bestStars === null) return t(entry.olderLayout ? 'profile.recordAriaUnrankedOlder' : 'profile.recordAriaUnranked', params);
    return t(entry.olderLayout ? 'profile.recordAriaStarsOlder' : 'profile.recordAriaStars', params);
  }
}
