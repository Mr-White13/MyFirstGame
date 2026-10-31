import { currentChapter, type ChapterSummary } from '../progress/chapters';
import type { Progress } from '../progress/Progress';

/** The chapter on screen: the one the player chose, else the chapter of the level to play next (1 before progress is known). */
export function shownChapter(chosen: number | null, progress: Progress | undefined, levelCount: number): number {
  return chosen ?? (progress ? currentChapter(progress, levelCount) : 1);
}

/** The line under a chapter title, e.g. "Levels 1–20 · 5/20 done · 12/60 ★". */
export function chapterMeta(summary: ChapterSummary): string {
  return `Levels ${summary.first}–${summary.last} · ${summary.completed}/${summary.levels} done · ${summary.stars}/${summary.maxStars} ★`;
}
