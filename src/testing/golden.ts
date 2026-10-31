import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

/**
 * Golden reference data for characterization tests (test code only: never
 * imported by the game).
 *
 * A missing golden file is an error, never silently created. Run with
 * UPDATE_GOLDEN=1 to (re)write it from the actual value: only do that for a
 * deliberate, reviewed behaviour change, and check the diff of the JSON file.
 */

const updating = () => process.env.UPDATE_GOLDEN === '1';

function read(path: string): unknown {
  if (!existsSync(path)) throw new Error(`Missing golden file ${path} (run with UPDATE_GOLDEN=1 once to create it)`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

const write = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);

/** Returns the committed copy of `file` to compare `actual` against. */
export function golden<T>(file: URL, actual: T): T {
  const path = fileURLToPath(file);
  if (updating()) write(path, actual);
  return read(path) as T;
}

/** Asserts that `actual` equals the golden copy in `file`, or its `section` when the file holds several. */
export function expectGolden(file: URL, actual: unknown, section?: string): void {
  const path = fileURLToPath(file);
  if (updating()) {
    const stored = section !== undefined && existsSync(path) ? (read(path) as Record<string, unknown>) : undefined;
    write(path, section === undefined ? actual : { ...stored, [section]: actual });
    return;
  }
  const stored = read(path) as Record<string, unknown>;
  expect(actual).toEqual(section === undefined ? stored : stored[section]);
}

/** `value` as it looks after a JSON round trip (drops undefined fields), for comparing with a golden copy. */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
