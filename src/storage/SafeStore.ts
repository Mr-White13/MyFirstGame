/** The subset of the Web Storage API used here; lets tests pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** What loading found, so storage can protect data it doesn't understand. */
export type SaveStatus = 'empty' | 'current' | 'migrated' | 'corrupt' | 'newer';

/** Turns stored text into a value (never throwing) and back. */
export interface Codec<T> {
  read(raw: string | null): { value: T; status: SaveStatus };
  write(value: T): string;
  /** The value to use when nothing usable could be read. */
  fallback(): T;
}

/** Browser localStorage, or null where it is unavailable (privacy modes, sandboxed frames). */
export function browserStorage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * One versioned JSON record in key-value storage, with the same safety rules
 * for every kind of saved data:
 * - storage failures are swallowed: the game keeps working, just unsaved;
 * - unreadable data is copied to `<key>.backup` before it can be replaced;
 * - data written by a newer game version is backed up and never overwritten.
 */
export class SafeStore<T> {
  private readOnly = false;

  constructor(
    readonly key: string,
    private readonly codec: Codec<T>,
    private readonly store: KeyValueStore | null = browserStorage(),
  ) {}

  get backupKey(): string {
    return `${this.key}.backup`;
  }

  load(): T {
    try {
      const raw = this.store?.getItem(this.key) ?? null;
      const { value, status } = this.codec.read(raw);
      if ((status === 'corrupt' || status === 'newer') && raw !== null) this.backup(raw);
      this.readOnly = status === 'newer';
      return value;
    } catch {
      return this.codec.fallback();
    }
  }

  /** Returns false if nothing was written (storage blocked or full, or a newer save protected). */
  save(value: T): boolean {
    if (!this.store || this.readOnly) return false;
    try {
      this.store.setItem(this.key, this.codec.write(value));
      return true;
    } catch {
      return false;
    }
  }

  private backup(raw: string): void {
    try {
      // Keep the first backup: a later load must not replace it with a worse copy.
      if (this.store && this.store.getItem(this.backupKey) === null) this.store.setItem(this.backupKey, raw);
    } catch {
      // Nothing more we can do without storage.
    }
  }
}

/** Parses JSON into a plain object, or null if it isn't one. */
export function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(raw);
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
