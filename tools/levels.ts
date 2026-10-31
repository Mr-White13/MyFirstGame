/*
 * NEON ESCAPE level tools (developer only).
 *
 *   npm run levels:analyze [-- --level N]     difficulty table, or details for one level
 *   npm run levels:validate                   check every registered level; exit 1 on problems
 *   npm run levels:generate -- [options]      generate candidate levels offline
 *
 * Generate options:
 *   --size N | --rows N --cols N   grid (default 7×7)
 *   --min S --max S                accepted difficulty score range (default 40–60)
 *   --seed N                       random seed (default 1); same seed + options = same level
 *   --count N                      how many distinct levels to produce (default 1)
 *   --arrows MIN-MAX               arrow count range (default scales with the grid)
 *   --length N                     longest arrow in cells (default 5)
 *   --turns N                      most turns per arrow (default 2)
 *   --bend P                       chance of turning at each step, 0..1 (default 0.35)
 *   --budget N                     most difficulty analyses per level (default 1200; bounds run time)
 *   --attempts N                   attempts per level before giving up (default 300)
 *   --id N                         level id for the output (default next free id)
 *   --out PATH                     also write the first level to a .ts file (never overwrites)
 *
 *   npm run levels:plan -- [--plan tools/level-plan.json] [--force]
 *     generates every level listed in a plan file, in order, each avoiding
 *     near-duplicates of all levels before it, and writes src/levels/levelNN.ts.
 *     Existing files are kept unless --force. Each entry may list several seeds:
 *     the first that produces an acceptable level wins (reproducible).
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeDifficulty, type DifficultyReport } from '../src/core/difficulty';
import { validateLevel } from '../src/core/levelValidation';
import type { LevelData } from '../src/core/types';
import { generateLevel, layoutSimilarity } from '../src/levelgen/generateLevel';
import { LEVELS } from '../src/levels';
import { levelToMap } from '../src/levels/levelMap';

type Args = Record<string, string | true>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[token.slice(2)] = next;
      i++;
    } else {
      args[token.slice(2)] = true;
    }
  }
  return args;
}

function num(args: Args, key: string, fallback: number): number {
  const value = args[key];
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) fail(`--${key} must be a number, got "${String(value)}"`);
  return n;
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const fixed = (x: number) => x.toFixed(2);

function table(headers: string[], rows: (string | number)[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells: (string | number)[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  return [line(headers), widths.map((w) => '─'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

function summaryRow(level: LevelData, r: DifficultyReport): (string | number)[] {
  return [
    level.id,
    `${level.rows}×${level.cols}`,
    r.exact.arrows,
    r.exact.initialFree,
    pct(r.exact.blockedShare),
    r.exact.depth,
    r.exact.blockingRelations,
    r.exact.longRangeBlocks,
    fixed(r.estimated.wrongTapsPerMove),
    r.score,
    r.category,
    r.lives ? pct(r.lives.random.winRate) : '–',
    r.lives ? pct(r.lives.nearSighted.winRate) : '–',
    r.lives ? fixed(r.lives.random.averageChainClears) : '–',
    r.lives ? r.lives.deceptiveArrows : '–',
    r.lives ? r.lives.riskScore : '–',
  ];
}

const SUMMARY_HEADERS = [
  '#', 'grid', 'arrows', 'free', 'blocked', 'depth', 'links', 'far', 'wrong/move', 'score', 'category',
  'win rand', 'win near', 'chain', 'decoys', 'risk',
];

function details(level: LevelData, r: DifficultyReport): string {
  const e = r.exact;
  const s = r.estimated;
  return [
    `Level ${level.id} — ${level.rows}×${level.cols} — score ${r.score} (${r.category})`,
    '',
    ...levelToMap(level).map((row) => `  ${row}`),
    '',
    'Exact',
    `  arrows ${e.arrows}, density ${pct(e.density)}, turns ${e.turns}`,
    `  free at start ${e.initialFree} (${pct(1 - e.blockedShare)}), blocked ${pct(e.blockedShare)}`,
    `  blocking links ${e.blockingRelations} (max ${e.maxBlockers} on one line, ${e.longRangeBlocks} long-range)`,
    `  depth ${e.depth}, waves [${e.waves.join(', ')}]`,
    `  ambiguous joins ${e.ambiguousJoins}`,
    'Estimated (random-tapping player, fixed seed)',
    `  average choices ${fixed(s.averageChoices)}, average free share ${pct(s.averageFreeShare)}, bottleneck ${pct(s.bottleneckShare)}`,
    `  wrong taps per move ${fixed(s.wrongTapsPerMove)}`,
    'Score components (search model)',
    ...r.components.map((c) => `  ${c.name.padEnd(13)} ${fixed(c.value)} × ${c.weight}`),
    ...(r.lives
      ? [
          'Lives model (simulated strategies, 3 lives, fixed seed)',
          `  random tapper:  expected mistakes ${fixed(r.lives.random.expectedMistakes)}, finishes ${pct(r.lives.random.winRate)}, chain clears ${fixed(r.lives.random.averageChainClears)}`,
          `  near-sighted:   expected mistakes ${fixed(r.lives.nearSighted.expectedMistakes)}, finishes ${pct(r.lives.nearSighted.winRate)}, chain clears ${fixed(r.lives.nearSighted.averageChainClears)}`,
          `  deceptive arrows (next cell clear, still blocked): ${r.lives.deceptiveArrows}`,
          `  risk score ${r.lives.riskScore} / 100`,
        ]
      : []),
  ].join('\n');
}

function analyze(args: Args): void {
  const only = args.level !== undefined ? num(args, 'level', 0) : null;
  if (only !== null) {
    const level = LEVELS.find((l) => l.id === only) ?? fail(`no level ${only}`);
    console.log(details(level, analyzeDifficulty(level)));
    return;
  }
  if (args.json) {
    const data = LEVELS.map((l) => ({ id: l.id, rows: l.rows, cols: l.cols, ...analyzeDifficulty(l) }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const rows = LEVELS.map((l) => summaryRow(l, analyzeDifficulty(l)));
  console.log(table(SUMMARY_HEADERS, rows));
  console.log('\nSearch model: links = blocking relations; far = blockers 3+ cells away; wrong/move = blocked taps per move by a random tapper; score/category = 0–100 search score.');
  console.log('Lives model: win rand / win near = share of simulated runs finishing within 3 lives (random / near-sighted tapper);');
  console.log('  chain = arrows cleared by chain reactions per random run; decoys = arrows that look free but are blocked; risk = 0–100 failure risk.');
  console.log('All figures are heuristic estimates from simulated strategies, not measurements of human players.');
}

function validate(): void {
  let problems = 0;
  LEVELS.forEach((level, index) => {
    const issues: string[] = [];
    if (level.id !== index + 1) issues.push(`id ${level.id} at position ${index + 1}`);
    try {
      validateLevel(level);
    } catch (error) {
      issues.push((error as Error).message);
    }
    const report = issues.length === 0 ? analyzeDifficulty(level) : null;
    if (report && report.exact.ambiguousJoins > 0) issues.push(`${report.exact.ambiguousJoins} ambiguous arrow join(s)`);
    LEVELS.forEach((other) => {
      if (other.id > level.id && layoutSimilarity(level, other) > 0.6) issues.push(`very similar to level ${other.id}`);
    });
    if (issues.length) {
      problems++;
      console.log(`✖ level ${level.id}: ${issues.join('; ')}`);
    } else {
      console.log(`✔ level ${level.id}  ${level.rows}×${level.cols}  ${level.arrows.length} arrows  score ${report!.score} (${report!.category})`);
    }
  });
  if (problems) fail(`${problems} level(s) have problems`);
  console.log(`\nAll ${LEVELS.length} levels are valid and solvable.`);
}

function levelFile(level: LevelData, note: string): string {
  const rows = levelToMap(level).map((row) => `  '${row}',`);
  return [
    `import { levelFromMap } from './levelMap';`,
    ``,
    `/** Level ${level.id} — ${note} */`,
    `export default levelFromMap(${level.id}, [`,
    ...rows,
    `]);`,
    ``,
  ].join('\n');
}

function generate(args: Args): void {
  const size = num(args, 'size', 7);
  const rows = num(args, 'rows', size);
  const cols = num(args, 'cols', size);
  const minScore = num(args, 'min', 40);
  const maxScore = num(args, 'max', 60);
  const seed = num(args, 'seed', 1);
  const count = num(args, 'count', 1);
  const id = num(args, 'id', LEVELS.length + 1);
  let arrows: { min: number; max: number } | undefined;
  if (typeof args.arrows === 'string') {
    const [lo, hi] = args.arrows.split('-').map(Number);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) fail('--arrows must look like 10-16');
    arrows = { min: lo, max: hi };
  }

  const produced: LevelData[] = [];
  for (let n = 0; n < count; n++) {
    const runSeed = seed + n * 1000;
    const result = generateLevel({
      rows,
      cols,
      minScore,
      maxScore,
      seed: runSeed,
      id,
      arrows,
      maxLength: num(args, 'length', 5),
      maxTurns: num(args, 'turns', 2),
      turnChance: num(args, 'bend', 0.35),
      workBudget: num(args, 'budget', 1200),
      attempts: num(args, 'attempts', 300),
      avoid: [...LEVELS, ...produced],
    });
    if (!result.ok) fail(`seed ${runSeed}: ${result.reason}`);
    produced.push(result.level);

    const note = `generated (seed ${runSeed}, attempt ${result.attempt}), score ${result.report.score} (${result.report.category}). Review before adding.`;
    console.log(`\n${'═'.repeat(60)}\n${details(result.level, result.report)}\n`);
    console.log('── level file ──');
    console.log(levelFile(result.level, note));

    if (n === 0 && typeof args.out === 'string') {
      const target = path.resolve(args.out);
      if (fs.existsSync(target)) fail(`${target} already exists; not overwriting`);
      fs.writeFileSync(target, levelFile(result.level, note));
      console.log(`Wrote ${target}`);
    }
  }
}

interface PlanEntry {
  readonly id: number;
  readonly size: number;
  readonly arrows: readonly [number, number];
  readonly length: number;
  readonly turns: number;
  readonly bend?: number;
  readonly score: readonly [number, number];
  readonly seeds: readonly number[];
  /** Most arrows free at the start (optional). */
  readonly maxFree?: number;
  readonly note?: string;
}

/** Generates a series of permanent levels from a plan file (offline; review the output before shipping). */
function plan(args: Args): void {
  const file = path.resolve(typeof args.plan === 'string' ? args.plan : 'tools/level-plan.json');
  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as PlanEntry[];
  const force = args.force === true;
  const known: LevelData[] = [...LEVELS];
  for (const entry of entries) {
    const target = path.resolve('src/levels', `level${String(entry.id).padStart(2, '0')}.ts`);
    const existing = LEVELS.find((l) => l.id === entry.id);
    if (existing && !force) {
      console.log(`Level ${entry.id}: already in the game, skipped`);
      continue;
    }
    const started = Date.now();
    let made: { level: LevelData; report: DifficultyReport; seed: number; attempt: number } | null = null;
    for (const seed of entry.seeds) {
      const result = generateLevel({
        rows: entry.size,
        cols: entry.size,
        minScore: entry.score[0],
        maxScore: entry.score[1],
        seed,
        id: entry.id,
        arrows: { min: entry.arrows[0], max: entry.arrows[1] },
        maxLength: entry.length,
        maxTurns: entry.turns,
        turnChance: entry.bend ?? 0.35,
        attempts: 120,
        workBudget: 900,
        avoid: known.filter((l) => l.id !== entry.id),
        maxInitialFree: entry.maxFree,
      });
      if (result.ok) {
        made = { level: result.level, report: result.report, seed, attempt: result.attempt };
        break;
      }
      console.log(`Level ${entry.id}: seed ${seed} failed (${result.reason.split('(')[0].trim()})`);
    }
    if (!made) fail(`Level ${entry.id}: no seed produced a level; adjust the plan`);
    const { level, report, seed, attempt } = made;
    known.push(level);
    const note = `generated from tools/level-plan.json (seed ${seed}, attempt ${attempt}), score ${report.score} (${report.category}).`;
    if (fs.existsSync(target) && !force) fail(`${target} already exists; use --force to replace it`);
    fs.writeFileSync(target, levelFile(level, note));
    console.log(
      `Level ${entry.id}: ${entry.size}×${entry.size}, ${level.arrows.length} arrows, score ${report.score}, depth ${report.exact.depth}, free at start ${report.exact.initialFree} (${((Date.now() - started) / 1000).toFixed(1)} s) → ${path.relative(process.cwd(), target)}`,
    );
  }
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (command) {
  case 'analyze':
    analyze(args);
    break;
  case 'validate':
    validate();
    break;
  case 'generate':
    generate(args);
    break;
  case 'plan':
    plan(args);
    break;
  default:
    console.log('Usage: levels <analyze|validate|generate|plan> [options]   (see tools/levels.ts for options)');
    process.exit(command ? 1 : 0);
}
