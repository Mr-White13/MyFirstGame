import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectGolden } from '../testing/golden';
import { byId, installDom, serialize, snapshotIds, uninstallDom } from './fakeDom.test-helper';
import { RecordsScreen } from './RecordsScreen';
import { LEVELS, PROGRESS } from './uiFixtures.test-helper';

// Characterization: the Records DOM exactly as rendered today (R5 shared chapter nav / star row safety net).
const GOLDEN = new URL('./RecordsScreen.golden.json', import.meta.url);
const IDS = [
  'records-chapter-title',
  'records-chapter-meta',
  'btn-records-chapter-prev',
  'btn-records-chapter-next',
  'records-search',
  'records-note',
  'records-list',
];
const snap = () => snapshotIds(IDS, ['records-list']);

beforeEach(() => {
  installDom();
});
afterEach(uninstallDom);

function make() {
  let backs = 0;
  const view = new RecordsScreen(LEVELS, () => backs++);
  return { view, backs: () => backs };
}

function type(value: string): void {
  const search = byId('records-search');
  search.value = value;
  search.dispatch('input');
}

describe('RecordsScreen render (golden)', () => {
  it('renders chapters and searches exactly as before', () => {
    const out: Record<string, unknown> = {};
    make().view.render(PROGRESS.fresh);
    out['screen (fresh)'] = serialize(byId('screen-records'));
    for (const [name, progress] of Object.entries(PROGRESS)) {
      installDom();
      const { view } = make();
      view.render(progress);
      out[`${name}/auto`] = snap();
      view.showChapter(2);
      out[`${name}/chapter 2`] = snap();
    }
    installDom();
    const { view } = make();
    view.render(PROGRESS.mid);
    // Exact, prefix, several bands, none, non-digits (stripped), leading zeros.
    for (const query of ['5', '1', '2', '3', '31', '0', 'a7', '007', '']) {
      type(query);
      out[`mid/search "${query}"`] = snap();
    }
    // More matches than one page (only reachable with over 100 levels).
    installDom();
    const many = new RecordsScreen(
      Array.from({ length: 150 }, (_, i) => ({ id: i + 1, rows: 5, cols: 5, arrows: [] })),
      () => {},
    );
    many.render(PROGRESS.mid);
    type('1');
    out['150 levels/search "1"'] = snapshotIds(['records-chapter-meta', 'records-note']);
    expectGolden(GOLDEN, out);
  });
});

describe('RecordsScreen interactions', () => {
  it('prev / next page chapters (clamped) and clear the search; reset follows the next level again', () => {
    const { view, backs } = make();
    view.render(PROGRESS.chapter2);
    const title = () => byId('records-chapter-title').textContent;
    expect(title()).toBe("It's Just the Beginning"); // level 20 is the next to play
    byId('btn-records-chapter-next').click();
    expect(title()).toBe('Tangled Lines');
    byId('btn-records-chapter-next').click();
    expect(title()).toBe('Tangled Lines');
    type('7');
    expect(title()).toBe('Search');
    expect(view.query).toEqual({ search: '7' });
    byId('btn-records-chapter-prev').click(); // disabled in the page; a click still pages from the chosen chapter
    expect(title()).toBe("It's Just the Beginning");
    expect(byId('records-search').value).toBe('');
    byId('btn-records-chapter-next').click();
    view.reset();
    expect(title()).toBe("It's Just the Beginning");
    byId('btn-records-back').click();
    expect(backs()).toBe(1);
  });

  it('strips non-digits from the search field as typed', () => {
    const { view } = make();
    view.render(PROGRESS.mid);
    type(' 1x2 ');
    expect(byId('records-search').value).toBe('12');
    expect(view.query).toEqual({ search: '12' });
  });
});
