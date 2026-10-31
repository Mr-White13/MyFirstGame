import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Golden reference data for characterization tests (test code only: never
 * imported by the game).
 *
 * Returns the committed copy of `file` to compare against. A missing file is
 * an error, never silently created. Run with UPDATE_GOLDEN=1 to (re)write it
 * from `actual`: only do that for a deliberate, reviewed behaviour change, and
 * check the diff of the JSON file.
 */
export function golden<T>(file: URL, actual: T): T {
  const path = fileURLToPath(file);
  if (process.env.UPDATE_GOLDEN === '1') writeFileSync(path, `${JSON.stringify(actual, null, 1)}\n`);
  if (!existsSync(path)) throw new Error(`Missing golden file ${path} (run with UPDATE_GOLDEN=1 once to create it)`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** `value` as it looks after a JSON round trip (drops undefined fields), for comparing with a golden copy. */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
