import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../testing/memoryStore';
import { readSavedRun, SAVED_RUN_KEY, SavedRunStorage, serializeSavedRun, type SavedRun } from './SavedRun';

const RUN: SavedRun = {
  levelId: 27,
  revision: 2,
  timeMs: 61_234,
  events: [
    { kind: 'tap', arrowId: 'a3', at: 1520.5 },
    { kind: 'tap', arrowId: 'a7', at: 2210 },
    { kind: 'life' },
    { kind: 'revive' },
  ],
};

describe('saved unfinished level', () => {
  it('round-trips through storage', () => {
    const store = new MemoryStore();
    const storage = new SavedRunStorage(store);
    expect(storage.load()).toBeNull();
    expect(storage.save(RUN)).toBe(true);
    expect(new SavedRunStorage(store).load()).toEqual(RUN);
    storage.save(null);
    expect(new SavedRunStorage(store).load()).toBeNull();
  });

  it('treats anything malformed as no run (the level starts fresh) and backs the data up', () => {
    const bad = [
      '{not json',
      JSON.stringify({ version: 1, run: { ...RUN, levelId: 0 } }),
      JSON.stringify({ version: 1, run: { ...RUN, timeMs: -1 } }),
      JSON.stringify({ version: 1, run: { ...RUN, events: [{ kind: 'tap', arrowId: '', at: 1 }] } }),
      JSON.stringify({ version: 1, run: { ...RUN, events: [{ kind: 'jump' }] } }),
      JSON.stringify({ version: 1, run: { ...RUN, events: 'a3' } }),
    ];
    for (const raw of bad) expect(readSavedRun(raw)).toEqual({ value: null, status: 'corrupt' });
    const store = new MemoryStore();
    store.setItem(SAVED_RUN_KEY, bad[1]);
    expect(new SavedRunStorage(store).load()).toBeNull();
    expect(store.getItem(`${SAVED_RUN_KEY}.backup`)).toBe(bad[1]);
  });

  it('never overwrites a run saved by a newer version of the game', () => {
    const store = new MemoryStore();
    const newer = JSON.stringify({ version: 2, run: RUN });
    store.setItem(SAVED_RUN_KEY, newer);
    const storage = new SavedRunStorage(store);
    expect(storage.load()).toBeNull();
    expect(storage.save(null)).toBe(false);
    expect(store.getItem(SAVED_RUN_KEY)).toBe(newer);
  });

  it('writes a small, versioned record', () => {
    expect(JSON.parse(serializeSavedRun(RUN))).toEqual({ version: 1, run: RUN });
    expect(readSavedRun(serializeSavedRun(null))).toEqual({ value: null, status: 'current' });
  });
});
