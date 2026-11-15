import type { RunEvent } from '../core/GameState';
import { browserStorage, isNonNegativeNumber, isPositiveInt, readVersioned, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';

/**
 * A level left unfinished: what the player had done (replayed to rebuild the
 * board, see GameState.replay) and the time played so far. Kept when the
 * player goes back to Home or the app is closed or backgrounded, so the
 * level continues where it was, even days later. One at a time; cleared
 * when that level is won, lost or restarted.
 */
export interface SavedRun {
  readonly levelId: number;
  /** Layout revision it was played on: a different layout can't be resumed. */
  readonly revision: number;
  readonly events: readonly RunEvent[];
  /** Active play time so far, all of it already in the lifetime statistics. */
  readonly timeMs: number;
}

export const SAVED_RUN_KEY = 'neon-escape.run';
export const SAVED_RUN_VERSION = 1;
/** More steps than any level needs; anything longer isn't a real run. */
const MAX_EVENTS = 5000;

function readEvent(value: unknown): RunEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const e = value as Record<string, unknown>;
  if (e.kind === 'life' || e.kind === 'revive') return { kind: e.kind };
  if (e.kind === 'tap' && typeof e.arrowId === 'string' && e.arrowId.length > 0 && e.arrowId.length <= 64 && typeof e.at === 'number' && Number.isFinite(e.at)) {
    return { kind: 'tap', arrowId: e.arrowId, at: e.at };
  }
  return null;
}

/** Reads the saved run; anything malformed means "no run" (the level just starts fresh). Never throws. */
export function readSavedRun(raw: string | null): { value: SavedRun | null; status: SaveStatus } {
  const header = readVersioned(raw, SAVED_RUN_VERSION);
  if ('status' in header) return { value: null, status: header.status };
  const run = header.data.run;
  if (run === null) return { value: null, status: 'current' };
  if (typeof run !== 'object' || run === undefined) return { value: null, status: 'corrupt' };
  const r = run as Record<string, unknown>;
  if (!isPositiveInt(r.levelId) || !isPositiveInt(r.revision) || !isNonNegativeNumber(r.timeMs) || !Array.isArray(r.events) || r.events.length > MAX_EVENTS) {
    return { value: null, status: 'corrupt' };
  }
  const events = r.events.map(readEvent);
  if (events.some((e) => e === null)) return { value: null, status: 'corrupt' };
  return { value: { levelId: r.levelId, revision: r.revision, timeMs: Math.round(r.timeMs), events: events as RunEvent[] }, status: 'current' };
}

export function serializeSavedRun(run: SavedRun | null): string {
  return JSON.stringify({ version: SAVED_RUN_VERSION, run });
}

export class SavedRunStorage {
  private readonly safe: SafeStore<SavedRun | null>;

  constructor(store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(SAVED_RUN_KEY, { read: readSavedRun, write: serializeSavedRun, fallback: () => null }, store);
  }

  load(): SavedRun | null {
    return this.safe.load();
  }

  /** Saves the run, or `null` to forget it. */
  save(run: SavedRun | null): boolean {
    return this.safe.save(run);
  }
}
