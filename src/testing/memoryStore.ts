import type { KeyValueStore } from '../storage/SafeStore';

/** In-memory key-value storage for tests (never imported by the game). */
export class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  /** Keys written, in order (failed writes are not listed). */
  writes: string[] = [];
  /** Makes setItem throw, like full or blocked storage: for every key, or for the keys it returns true for. */
  failWrites: boolean | ((key: string) => boolean) = false;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites === true || (typeof this.failWrites === 'function' && this.failWrites(key))) throw new Error('QuotaExceededError');
    this.writes.push(key);
    this.data.set(key, value);
  }
}
