import { arrow, DIRECTION_VECTORS } from '../core/Arrow';
import type { ArrowData, Direction, LevelData } from '../core/types';

const HEAD_MARKS: Readonly<Record<string, Direction>> = { '^': 'up', v: 'down', '<': 'left', '>': 'right' };
/** An arrow label: one letter, optionally followed by one digit (a, B, a1, Z9…). */
const TOKEN = /^([a-zA-Z][0-9]?)([\^v<>])?$/;
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Labels available in a map: 52 single letters, then 52 × 10 letter+digit labels. */
export const MAX_MAP_ARROWS = LETTERS.length * 11;

/** The label of the `index`-th arrow: a…z, A…Z, then a0…Z0, a1…Z1, … */
export function arrowLabel(index: number): string {
  if (index < 0 || index >= MAX_MAP_ARROWS) throw new Error(`no map label for arrow #${index}`);
  if (index < LETTERS.length) return LETTERS[index];
  const k = index - LETTERS.length;
  return LETTERS[k % LETTERS.length] + String(Math.floor(k / LETTERS.length));
}

/**
 * Builds a level from a readable text map, so each level file shows the
 * board as it will appear in the game.
 *
 * - One string per row, cells separated by whitespace.
 * - `.` is an empty cell.
 * - A label is a body cell of the arrow with that label (case-sensitive): a
 *   letter, or a letter and one digit (`a1`) for boards with more than 52 arrows.
 * - A label followed by `^ v < >` marks that arrow's head and direction.
 *
 * ```
 * levelFromMap(1, [
 *   '.  a  a  a>',
 *   '.  .  .  b^',
 *   '.  .  .  b ',
 * ]);
 * ```
 *
 * Pass `{ revision }` when a level's layout is redesigned (see LevelData.revision),
 * `{ name }` for a special level with a display name (see LevelData.name),
 * `{ outline: true }` for a shaped board (see LevelData.outline),
 * `{ tier }` for a hard or very hard level (see LevelData.tier),
 * `{ lives: 1 }` for a one-life level (see LevelData.lives),
 * `{ curls: true }` for a level with spiral or hook arrows (see below).
 *
 * The body order (tail → head) is recovered by walking back from the head,
 * so every arrow must be a simple, unbranched chain. With `curls`, an arrow
 * may also run alongside itself (a spiral or a hook, where one cell touches
 * two of its own cells): its body is then the first path, in a fixed search
 * order, that starts at the head, steps straight back behind it and visits
 * every cell once. The generator only keeps levels as loaded this way, so a
 * level always plays exactly as it was measured. The result is a plain
 * `LevelData`; validity and solvability are still checked by `validateLevel`.
 */
export function levelFromMap(
  id: number,
  map: readonly string[],
  options: { revision?: number; name?: string; outline?: boolean; tier?: LevelData['tier']; lives?: number; curls?: boolean } = {},
): LevelData {
  const grid = map.map((row) => row.trim().split(/\s+/));
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new Error(`Level ${id}: map is empty`);

  const bodies = new Map<string, { row: number; col: number }[]>();
  const heads = new Map<string, { row: number; col: number; direction: Direction }>();

  grid.forEach((cells, row) => {
    if (cells.length !== cols) throw new Error(`Level ${id}: row ${row} has ${cells.length} cells, expected ${cols}`);
    cells.forEach((token, col) => {
      if (token === '.') return;
      const match = TOKEN.exec(token);
      if (!match) throw new Error(`Level ${id}: invalid token "${token}" at ${row},${col}`);
      const [, letter, mark] = match;
      if (mark) {
        if (heads.has(letter)) throw new Error(`Level ${id}: arrow "${letter}" has two heads`);
        heads.set(letter, { row, col, direction: HEAD_MARKS[mark] });
      }
      const list = bodies.get(letter) ?? [];
      list.push({ row, col });
      bodies.set(letter, list);
    });
  });

  const arrows: ArrowData[] = [];
  for (const [letter, cells] of bodies) {
    const head = heads.get(letter);
    if (!head) throw new Error(`Level ${id}: arrow "${letter}" has no head mark`);
    arrows.push(traceArrow(id, letter, head, cells, options.curls === true));
  }
  // Stable order (by letter) keeps ids and the intro animation predictable.
  arrows.sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    id,
    ...(options.revision === undefined ? {} : { revision: options.revision }),
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.outline ? { outline: true } : {}),
    ...(options.tier === undefined ? {} : { tier: options.tier }),
    ...(options.lives === undefined ? {} : { lives: options.lives }),
    rows,
    cols,
    arrows,
  };
}

const MARK_FOR: Readonly<Record<Direction, string>> = { up: '^', down: 'v', left: '<', right: '>' };

/**
 * The inverse of `levelFromMap`: renders a level as map rows, ready to paste
 * into a level file. Arrows are relabelled a, b, c… (then A, B, C…) in their
 * current order.
 */
export function levelToMap(level: LevelData): string[] {
  if (level.arrows.length > MAX_MAP_ARROWS) throw new Error(`Level ${level.id}: too many arrows for a text map`);
  const grid: string[][] = Array.from({ length: level.rows }, () => Array.from({ length: level.cols }, () => '.'));
  level.arrows.forEach((a, i) => {
    const label = arrowLabel(i);
    a.cells.forEach((c, k) => {
      grid[c.row][c.col] = label + (k === a.cells.length - 1 ? MARK_FOR[a.direction] : '');
    });
  });
  const width = level.arrows.length > LETTERS.length ? 3 : 2;
  return grid.map((row) => row.map((token) => token.padEnd(width)).join(' ').trimEnd());
}

function traceArrow(
  levelId: number,
  letter: string,
  head: { row: number; col: number; direction: Direction },
  cells: readonly { row: number; col: number }[],
  curls = false,
): ArrowData {
  const remaining = new Set(cells.map((c) => `${c.row},${c.col}`));
  const path: [number, number][] = [[head.row, head.col]];
  remaining.delete(`${head.row},${head.col}`);

  // Walk from the head towards the tail; each step must have exactly one way on.
  let current = { row: head.row, col: head.col };
  while (remaining.size > 0) {
    const next = Object.values(DIRECTION_VECTORS)
      .map((v) => ({ row: current.row + v.dRow, col: current.col + v.dCol }))
      .filter((c) => remaining.has(`${c.row},${c.col}`));
    if (next.length !== 1) {
      const curled = next.length > 1 && curls ? traceCurled(head, cells) : null;
      if (curled) return arrow(letter, head.direction, ...curled);
      throw new Error(
        `Level ${levelId}: arrow "${letter}" is ${next.length === 0 ? 'disconnected' : 'branching'} near ${current.row},${current.col}`,
      );
    }
    current = next[0];
    remaining.delete(`${current.row},${current.col}`);
    path.push([current.row, current.col]);
  }
  return arrow(letter, head.direction, ...path.reverse());
}

/** Search steps allowed per curled arrow before it is reported as branching. */
const CURL_SEARCH_LIMIT = 200_000;

/**
 * A spiral or hook arrow's body, tail → head: a depth-first search for a path
 * through every cell that starts at the head and steps straight back behind
 * it first (so the head continues its body), trying neighbours in the fixed
 * DIRECTION_VECTORS order. Null if there is none (or the search runs too long).
 */
function traceCurled(head: { row: number; col: number; direction: Direction }, cells: readonly { row: number; col: number }[]): [number, number][] | null {
  const key = (r: number, c: number) => `${r},${c}`;
  const unvisited = new Set(cells.map((c) => key(c.row, c.col)));
  const back = DIRECTION_VECTORS[head.direction];
  const behind = { row: head.row - back.dRow, col: head.col - back.dCol };
  if (!unvisited.has(key(behind.row, behind.col))) return null;
  const path: [number, number][] = [[head.row, head.col], [behind.row, behind.col]];
  unvisited.delete(key(head.row, head.col));
  unvisited.delete(key(behind.row, behind.col));
  let steps = 0;
  const extend = (row: number, col: number): boolean => {
    if (unvisited.size === 0) return true;
    if (++steps > CURL_SEARCH_LIMIT) return false;
    for (const v of Object.values(DIRECTION_VECTORS)) {
      const r = row + v.dRow;
      const c = col + v.dCol;
      if (!unvisited.has(key(r, c))) continue;
      unvisited.delete(key(r, c));
      path.push([r, c]);
      if (extend(r, c)) return true;
      path.pop();
      unvisited.add(key(r, c));
    }
    return false;
  };
  return extend(behind.row, behind.col) ? path.reverse() : null;
}
