import { describe, expect, it } from 'vitest';
import { SafeStore, type Codec, type KeyValueStore, type SaveStatus } from './SafeStore';

/**
 * The shared save layer: every status, backups, read-only protection and
 * storage failures. A record that could not be read is never overwritten
 * (B5: a failed read used to let the next save replace it).
 */

/** In-memory storage that logs every call and can be told to fail. */
class ScriptedStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  readonly calls: string[] = [];
  failGet: ((key: string) => boolean) | null = null;
  failSet: ((key: string) => boolean) | null = null;

  constructor(entries: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(entries)) this.data.set(k, v);
  }

  getItem(key: string): string | null {
    this.calls.push(`get ${key}`);
    if (this.failGet?.(key)) throw new Error('blocked');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.calls.push(`set ${key}`);
    if (this.failSet?.(key)) throw new Error('quota');
    this.data.set(key, value);
  }
}

/** A tiny codec: "v<version>:<n>". Versions above 2 are newer, 1 is migrated. */
const codec: Codec<{ n: number }> = {
  read(raw: string | null): { value: { n: number }; status: SaveStatus } {
    if (raw === null) return { value: { n: 0 }, status: 'empty' };
    const m = /^v(\d+):(\d+)$/.exec(raw);
    if (!m) return { value: { n: -1 }, status: 'corrupt' };
    const version = Number(m[1]);
    if (version > 2) return { value: { n: -2 }, status: 'newer' };
    return { value: { n: Number(m[2]) }, status: version === 2 ? 'current' : 'migrated' };
  },
  write: (value) => `v2:${value.n}`,
  fallback: () => ({ n: 99 }),
};

const KEY = 'k';
const make = (store: KeyValueStore | null, c: Codec<{ n: number }> = codec) => new SafeStore(KEY, c, store);

describe('SafeStore.load', () => {
  it('empty: the codec value, no backup', () => {
    const store = new ScriptedStore();
    expect(make(store).load()).toEqual({ n: 0 });
    expect(store.calls).toEqual(['get k']);
  });

  it('current and migrated: the codec value, no backup, saves allowed', () => {
    for (const raw of ['v2:5', 'v1:5']) {
      const store = new ScriptedStore({ k: raw });
      const safe = make(store);
      expect(safe.load()).toEqual({ n: 5 });
      expect(safe.save({ n: 6 })).toBe(true);
      expect(store.calls).toEqual(['get k', 'set k']);
      expect(store.data.get(KEY)).toBe('v2:6');
    }
  });

  it('corrupt: backed up to <key>.backup, then saves overwrite the main record', () => {
    const store = new ScriptedStore({ k: 'garbage' });
    const safe = make(store);
    expect(safe.backupKey).toBe('k.backup');
    expect(safe.load()).toEqual({ n: -1 });
    expect(store.calls).toEqual(['get k', 'get k.backup', 'set k.backup']);
    expect(store.data.get('k.backup')).toBe('garbage');
    expect(safe.save({ n: 1 })).toBe(true);
    expect(store.data.get(KEY)).toBe('v2:1');
  });

  it('keeps the first backup: a later unreadable record never replaces it', () => {
    const store = new ScriptedStore({ k: 'first', 'k.backup': 'older' });
    make(store).load();
    expect(store.data.get('k.backup')).toBe('older');
    expect(store.calls).toEqual(['get k', 'get k.backup']);
  });

  it('newer: backed up and read-only; saves return false and write nothing', () => {
    const store = new ScriptedStore({ k: 'v3:7' });
    const safe = make(store);
    expect(safe.load()).toEqual({ n: -2 });
    expect(store.data.get('k.backup')).toBe('v3:7');
    store.calls.length = 0;
    expect(safe.save({ n: 1 })).toBe(false);
    expect(store.calls).toEqual([]);
    expect(store.data.get(KEY)).toBe('v3:7');
  });

  it('read-only ends when a later load finds a record it understands', () => {
    const store = new ScriptedStore({ k: 'v3:7' });
    const safe = make(store);
    safe.load();
    store.data.set(KEY, 'v2:4');
    expect(safe.load()).toEqual({ n: 4 });
    expect(safe.save({ n: 8 })).toBe(true);
  });

  it('no storage at all: the codec value for "nothing stored", and saves return false', () => {
    const safe = make(null);
    expect(safe.load()).toEqual({ n: 0 });
    expect(safe.save({ n: 1 })).toBe(false);
  });

  it('a throwing read gives the fallback and protects the record: saves are refused (B5)', () => {
    const store = new ScriptedStore({ k: 'v2:42' });
    store.failGet = (key) => key === KEY;
    const safe = make(store);
    expect(safe.load()).toEqual({ n: 99 });
    expect(store.data.has('k.backup')).toBe(false);
    store.calls.length = 0;
    expect(safe.save({ n: 99 })).toBe(false);
    expect(store.calls).toEqual([]);
    expect(store.data.get(KEY)).toBe('v2:42'); // the real record is kept
  });

  it('after a failed read, a later load that succeeds makes it writable again', () => {
    const store = new ScriptedStore({ k: 'v2:42' });
    store.failGet = () => true;
    const safe = make(store);
    safe.load();
    store.failGet = null;
    expect(safe.load()).toEqual({ n: 42 });
    expect(safe.save({ n: 43 })).toBe(true);
    expect(store.data.get(KEY)).toBe('v2:43');
  });

  it('a codec that throws gives the fallback and protects the record', () => {
    const throwing: Codec<{ n: number }> = { ...codec, read: () => { throw new Error('bug'); } };
    const store = new ScriptedStore({ k: 'v2:1' });
    const safe = make(store, throwing);
    expect(safe.load()).toEqual({ n: 99 });
    expect(safe.save({ n: 5 })).toBe(false);
    expect(store.data.get(KEY)).toBe('v2:1');
  });

  it('a failing backup is swallowed and the value still returned', () => {
    for (const failure of ['get', 'set'] as const) {
      const store = new ScriptedStore({ k: 'garbage' });
      if (failure === 'get') store.failGet = (key) => key === 'k.backup';
      else store.failSet = (key) => key === 'k.backup';
      const safe = make(store);
      expect(safe.load()).toEqual({ n: -1 });
      expect(store.data.has('k.backup')).toBe(false);
      expect(safe.save({ n: 3 })).toBe(true); // still writable: corrupt data is not protected beyond the backup attempt
    }
  });

  it('a newer record whose backup fails is still read-only', () => {
    const store = new ScriptedStore({ k: 'v9:1' });
    store.failSet = (key) => key === 'k.backup';
    const safe = make(store);
    safe.load();
    store.failSet = null;
    expect(safe.save({ n: 1 })).toBe(false);
    expect(store.data.get(KEY)).toBe('v9:1');
  });
});

describe('SafeStore.save', () => {
  it('returns false when the write throws (storage full or blocked), and keeps working afterwards', () => {
    const store = new ScriptedStore();
    const safe = make(store);
    safe.load();
    store.failSet = () => true;
    expect(safe.save({ n: 1 })).toBe(false);
    expect(store.data.has(KEY)).toBe(false);
    store.failSet = null;
    expect(safe.save({ n: 2 })).toBe(true);
    expect(store.data.get(KEY)).toBe('v2:2');
  });

  it('saving before any load writes (nothing is read-only yet)', () => {
    const store = new ScriptedStore({ k: 'v9:1' });
    expect(make(store).save({ n: 1 })).toBe(true);
    expect(store.data.get(KEY)).toBe('v2:1');
  });
});
