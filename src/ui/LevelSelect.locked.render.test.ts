import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectGolden } from '../testing/golden';
import { byId, installDom, snapshotIds, uninstallDom } from './fakeDom.test-helper';
import { LevelSelect } from './LevelSelect';
import { LEVELS, PROGRESS } from './uiFixtures.test-helper';

// The release build (UNLOCK_ALL_LEVELS_FOR_TESTING = false): really locked tiles, lock icons, hidden testing note.
vi.mock('../progress/testUnlock', async (importOriginal) => {
  const original = await importOriginal<typeof import('../progress/testUnlock')>();
  return {
    ...original,
    UNLOCK_ALL_LEVELS_FOR_TESTING: false,
    canPlayLevel: (p: never, id: number, count: number, unlockAll = false) => original.canPlayLevel(p, id, count, unlockAll),
    isTestPlay: (p: never, id: number, unlockAll = false) => original.isTestPlay(p, id, unlockAll),
  };
});

const GOLDEN = new URL('./LevelSelect.locked.golden.json', import.meta.url);

beforeEach(() => {
  installDom();
});
afterEach(uninstallDom);

describe('LevelSelect render, release build (golden)', () => {
  it('renders locked tiles exactly as before', () => {
    const view = new LevelSelect(LEVELS);
    const selected: number[] = [];
    view.onSelect((id) => selected.push(id));
    view.render(PROGRESS.mid);
    const out = { 'mid/chapter 1': snapshotIds(['levels-testing', 'level-grid'], ['level-grid']) };
    expectGolden(GOLDEN, out);
    byId('level-grid').querySelector('button[data-level="9"]')!.click();
    expect(selected).toEqual([]);
  });
});
