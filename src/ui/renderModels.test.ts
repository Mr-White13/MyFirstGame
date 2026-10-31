import { describe, it } from 'vitest';
import { chapterCount, chapterSummary, chapterTiles, currentChapter, queryRecords, recordsSummary, searchLevelIds } from '../progress/chapters';
import { completedCount, nextLevelToPlay, perfectLevels, totalStars } from '../progress/Progress';
import { expectGolden } from './fakeDom.test-helper';
import { LEVEL_COUNT, LEVELS, PROGRESS } from './uiFixtures.test-helper';

// Characterization: the pure data behind Level Select, Records and Profile, for every chapter.
const GOLDEN = new URL('./renderModels.golden.json', import.meta.url);
const revisionOf = (id: number) => LEVELS[id - 1]?.revision ?? 1;

describe('UI render models (golden)', () => {
  it('chapter tiles, summaries, record pages and searches match the recorded output', () => {
    const out: Record<string, unknown> = {};
    for (const [name, progress] of Object.entries(PROGRESS)) {
      const chapters: Record<string, unknown> = {};
      for (let chapter = 0; chapter <= chapterCount(LEVEL_COUNT) + 1; chapter++) {
        const s = chapterSummary(progress, chapter, LEVEL_COUNT);
        const page = queryRecords(progress, LEVEL_COUNT, { chapter }, revisionOf);
        chapters[chapter] = {
          summary: `${s.chapter}: ${s.first}-${s.last} levels=${s.levels} done=${s.completed} stars=${s.stars}/${s.maxStars} unlocked=${s.unlocked}`,
          tiles: chapterTiles(progress, chapter, LEVEL_COUNT).map((t) => `${t.id}:${t.state}:${t.bestStars}`).join(' '),
          releaseTiles: chapterTiles(progress, chapter, LEVEL_COUNT, false).map((t) => `${t.id}:${t.state}`).join(' '),
          records: [`chapter=${page.chapter} matches=${page.matches}`, ...page.entries.map((e) => `${e.levelId}:${e.status}:${e.bestStars}:${e.bestTimeMs}${e.olderLayout ? ':older' : ''}`)],
        };
      }
      const searches: Record<string, string> = {};
      for (const search of ['1', '2', '3', '5', '30', '31', '0', '007', ' 12 ', 'x', '']) {
        const page = queryRecords(progress, LEVEL_COUNT, { search }, revisionOf);
        searches[search] = `chapter=${page.chapter} matches=${page.matches} ids=${page.entries.map((e) => e.levelId).join(',')}`;
      }
      out[name] = {
        header: {
          completed: completedCount(progress, LEVEL_COUNT),
          stars: totalStars(progress, LEVEL_COUNT),
          perfect: perfectLevels(progress, LEVEL_COUNT),
          next: nextLevelToPlay(progress, LEVEL_COUNT),
          currentChapter: currentChapter(progress, LEVEL_COUNT),
        },
        recordsSummary: recordsSummary(progress, LEVEL_COUNT),
        chapters,
        searches,
      };
    }
    // Searches over many levels (page limit, bands).
    out.searchLevelIds = Object.fromEntries(
      ['1', '7', '10', '99', '100', '0001', '12345'].map((q) => {
        const r = searchLevelIds(q, 1500);
        return [q, `matches=${r.matches} ids=${r.ids.join(',')}`];
      }),
    );
    expectGolden(GOLDEN, out);
  });
});
