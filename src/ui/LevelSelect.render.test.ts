import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectGolden } from '../testing/golden';
import { byId, installDom, serialize, snapshotIds, uninstallDom, type FakeDocument } from './fakeDom.test-helper';
import { LevelSelect } from './LevelSelect';
import { LEVELS, PROGRESS } from './uiFixtures.test-helper';

// Characterization: the Level Select DOM exactly as rendered today (R5 / R13 safety net).
const GOLDEN = new URL('./LevelSelect.golden.json', import.meta.url);
/** Everything LevelSelect writes to; the whole screen is also kept once, for the static markup. */
const IDS = [
  'progress-count',
  'progress-total',
  'progress-fill',
  'progress-stars',
  'progress-stars-total',
  'btn-continue',
  'chapter-title',
  'chapter-meta',
  'btn-chapter-prev',
  'btn-chapter-next',
  'btn-chapter-current',
  'levels-testing',
  'level-grid',
];
const snap = () => snapshotIds(IDS, ['level-grid']);

let doc: FakeDocument;
beforeEach(() => {
  doc = installDom();
});
afterEach(uninstallDom);

function make() {
  const view = new LevelSelect(LEVELS);
  const selected: number[] = [];
  view.onSelect((id) => selected.push(id));
  return { view, selected };
}

describe('LevelSelect render (golden)', () => {
  it('renders every progress state and chapter exactly as before', () => {
    const out: Record<string, unknown> = {};
    make().view.render(PROGRESS.fresh);
    out['screen (fresh)'] = serialize(byId('screen-levels'));
    for (const [name, progress] of Object.entries(PROGRESS)) {
      installDom();
      const { view } = make();
      view.render(progress);
      out[`${name}/auto (chapter ${view.shownChapter})`] = snap();
      view.showChapter(view.shownChapter === 1 ? 2 : 1);
      out[`${name}/other (chapter ${view.shownChapter})`] = snap();
    }
    expectGolden(GOLDEN, out);
  });
});

describe('LevelSelect interactions', () => {
  it('prev / next step through chapters, clamped, and current jumps back', () => {
    const { view } = make();
    view.render(PROGRESS.mid);
    const title = () => byId('chapter-title').textContent;
    expect(title()).toBe("It's Just the Beginning");
    expect(byId('btn-chapter-prev').disabled).toBe(true);
    expect(byId('btn-chapter-current').disabled).toBe(true);
    byId('btn-chapter-next').click();
    expect(title()).toBe('Tangled Lines');
    expect(byId('btn-chapter-next').disabled).toBe(true);
    expect(byId('btn-chapter-current').disabled).toBe(false);
    byId('btn-chapter-next').click(); // disabled in the page, but a click still clamps
    expect(title()).toBe('Tangled Lines');
    byId('btn-chapter-current').click();
    expect(title()).toBe("It's Just the Beginning");
    byId('btn-chapter-prev').click();
    expect(title()).toBe("It's Just the Beginning");
    // The chosen chapter survives a re-render.
    byId('btn-chapter-next').click();
    view.render(PROGRESS.mid);
    expect(title()).toBe('Tangled Lines');
  });

  it('a tile click (delegated, from any child) selects its level; locked tiles do nothing', () => {
    const { view, selected } = make();
    view.render(PROGRESS.mid);
    const grid = byId('level-grid');
    const tile = (id: number) => grid.querySelector(`button[data-level="${id}"]`)!;
    tile(3).click();
    tile(8).children[0].click(); // the number span inside the tile
    tile(12).click(); // locked but open for testing (UNLOCK_ALL_LEVELS_FOR_TESTING)
    grid.click(); // the grid itself
    byId('btn-continue').click();
    expect(selected).toEqual([3, 8, 12, 8]);
    tile(12).setAttribute('disabled', ''); // a really locked tile
    tile(12).click();
    expect(selected).toEqual([3, 8, 12, 8]);
  });

  it('continue opens level 1 once everything is complete', () => {
    const { view, selected } = make();
    view.render(PROGRESS.allComplete);
    byId('btn-continue').click();
    expect(selected).toEqual([1]);
  });

  it('focusLevel shows the level chapter and focuses its tile, or the play button', () => {
    const { view } = make();
    view.render(PROGRESS.mid);
    view.focusLevel(23);
    expect(view.shownChapter).toBe(2);
    expect(doc.activeElement?.dataset.level).toBe('23');
    view.focusLevel(2);
    expect(byId('chapter-title').textContent).toBe("It's Just the Beginning");
    expect(doc.activeElement?.dataset.level).toBe('2');
    view.focusLevel(99); // clamps to the last chapter; no such tile: the play button
    expect(view.shownChapter).toBe(2);
    expect(doc.activeElement?.id).toBe('btn-continue');
  });

  it('before any render the shown chapter is 1 and showChapter draws nothing', () => {
    const { view } = make();
    expect(view.shownChapter).toBe(1);
    view.showChapter(2);
    expect(byId('level-grid').children).toHaveLength(0);
    expect(view.shownChapter).toBe(2);
  });
});
