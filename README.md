# NEON ESCAPE

A 2D arrow-clearing puzzle game for mobile, built with **Phaser 3**, **TypeScript** and **Vite**.

Tap an arrow to send it flying off the board in the direction it points. It can only leave if nothing is in its way. Clear every arrow to finish the level.

The game has **10 hand-made levels** that grow from a 5-arrow tutorial to dense 9×9 boards. It includes a level select screen, unlockable progression and progress saved in the browser.

## Requirements

- Node.js 18+ (developed with Node 22)
- npm

## Getting started

```bash
npm install
npm run dev
```

Vite prints a local URL (default http://localhost:5173). Open it in Chrome.

### Playing on a real phone

1. Connect the phone and the computer to the same Wi-Fi network.
2. Run `npm run dev`. Because the dev server runs with `host: true`, Vite also prints a **Network** URL such as `http://192.168.1.23:5173/`.
3. Open that URL in Chrome on the phone.
4. If the page doesn't load, allow Node.js through the computer's firewall for private networks. On Windows, a prompt usually appears the first time.

Optionally, in Chrome's menu choose **Add to Home screen** to play full-screen without the address bar.

### Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload                  |
| `npm run typecheck` | TypeScript checks for the game and the level tools     |
| `npm run build`     | Type-check, then create a production build in `dist/` |
| `npm run preview`   | Serve the production build locally                    |
| `npm test`          | Run the unit tests once (Vitest)                      |
| `npm run test:watch` | Run the unit tests in watch mode                     |
| `npm run levels:analyze` | Difficulty table for every level (`-- --level N` for details, `-- --json` for data) |
| `npm run levels:validate` | Check every level: valid, solvable, readable, not a near-duplicate |
| `npm run levels:generate` | Generate candidate levels offline (see "Level tools" below) |

## Playing as an Android phone in Chrome DevTools

1. Run `npm run dev` and open http://localhost:5173 in Chrome.
2. Open DevTools: `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on macOS).
3. Click the **Toggle device toolbar** icon (phone/tablet) or press `Ctrl+Shift+M` (`Cmd+Shift+M` on macOS).
4. In the device dropdown at the top of the page, choose an Android device such as **Pixel 7** or **Samsung Galaxy S20 Ultra**. Use **Edit…** to add more devices, or **Responsive** to drag to any size.
5. DevTools now emulates touch input, so clicks behave like taps. Portrait is the main layout. Use the rotate button to check landscape, where the HUD moves into a side column.

Good sizes to check are 360×800, 390×844 and 412×915 (use **Responsive** and type the size).

## How to play

- Tap any part of an arrow, including its head. Near-misses within about half a cell still count. The arrow lights up while your finger is on it, and the move happens when you lift your finger. Slide away before lifting to cancel.
- **Clear path:** the arrow flashes, slides along its own body and leaves the board. This counts as one move.
- **Blocked:** the arrow turns red and slides up to the arrow in its way, which flashes orange and gets knocked. Then it springs back. Blocked attempts do not count as moves.
- Only one arrow moves at a time. Taps made while an arrow is still crossing the board are ignored, so fast double taps can't trigger two moves.
- Remove all arrows to complete the level: the board pulses green and a summary shows your move count. **Restart** resets the level at any time, even mid-animation.

## Screens and progression

1. **Level select** (start screen): all 10 levels with their grid size, a "*n* / 10 levels completed" bar and a Start / Continue / Play again button that opens the next unfinished level.
   - Completed levels show a green check.
   - The next level to play has a purple glow.
   - Locked levels are dimmed with a lock and can't be opened.
2. **Gameplay**: a compact HUD sits directly above the board: back, the level title and restart, then a strip with moves, a progress meter and arrows left. Restart is disabled until you have made a move. The back button returns to level select. If you've made moves on an unfinished level, you're asked to confirm first. Your saved progress is never affected. **Escape** works as back on desktop.
3. **Level complete**: shows moves, the level number and which level was just unlocked, with **Next level**, **Restart** and **Levels**. After level 10, a **game-complete** variant congratulates you and offers **Play from level 1**.

Only level 1 is unlocked at first. Completing a level unlocks the next one. You can replay any unlocked level, and replaying never locks anything again.

### Saved progress

Progress is stored in `localStorage` under the key `neon-escape.progress`:

```json
{ "version": 2, "highestUnlocked": 4, "completed": { "1": { "bestMoves": 5, "revision": 1 }, "2": { "bestMoves": 6, "revision": 2 } } }
```

- Progress is saved the moment the last arrow leaves the board, before any dialog, so leaving early can't lose a completion.
- Missing or corrupted data starts a new game. Individual bad entries are dropped and valid ones are kept.
- **Nothing is silently destroyed.** Unreadable data is copied to `neon-escape.progress.backup` before it can be replaced. A save written by a *newer* game version is backed up and never overwritten.
- **Version 1 saves are migrated.** Unlocks and completions are kept. The next save writes version 2.
- **Level revisions.** Each record stores the `revision` of the level layout it was set on. When a level is redesigned (its `revision` goes up), the player keeps the completion and the unlock, but the old best move count isn't compared with the new layout. The next clear starts a fresh record.
- Unlocks are repaired to match completions, so if levels are added later, players who finished the old last level get the new one unlocked.
- If storage is unavailable (private mode, blocked or full), the game still works. Progress just isn't saved.

To reset your progress, run `localStorage.removeItem('neon-escape.progress')` in the DevTools console, or clear the site's data.

## Levels

Ten curated levels with a steadily rising estimated difficulty. The full analysis, including the
original set, the redesign and an old-vs-new comparison, is in [docs/level-analysis.md](docs/level-analysis.md).

| Level | Grid | Arrows | Free at start | Depth | Score | Category | Idea |
| ----- | ---- | ------ | ------------- | ----- | ----- | -------- | ---- |
| 1 | 7×7 | 5  | 3 | 2  | 14 | Very easy | Tutorial: two arrows, each blocked by one free arrow |
| 2 | 7×7 | 6  | 3 | 3  | 23 | Easy | Straight arrows; the first small chain |
| 3 | 7×7 | 8  | 4 | 4  | 28 | Easy–medium | First bent arrows |
| 4 | 7×7 | 10 | 4 | 5  | 37 | Easy–medium | Long arrows blocked from several cells away |
| 5 | 7×7 | 11 | 3 | 8  | 45 | Medium | Tight board: the visual sweep stops working |
| 6 | 8×8 | 13 | 4 | 6  | 47 | Medium | Mostly long-range blocking |
| 7 | 8×8 | 12 | 2 | 11 | 54 | Medium–hard | Fewer arrows than level 6 but harder: L-hooks, one free arrow per step |
| 8 | 8×8 | 18 | 2 | 11 | 57 | Medium–hard | Interlocking L-shapes mid-chain |
| 9 | 9×9 | 20 | 4 | 12 | 59 | Hard | Dense board with long hooks |
| 10 | 9×9 | 23 | 1 | 15 | 63 | Hard | First major challenge: one free arrow, fifteen-step chain |

### How difficulty works

The rules make some things impossible. Removing an arrow only frees cells, so a level can never
become unsolvable, any order of free arrows works, and the move count always equals the arrow
count. The only real challenge is **finding an arrow that can escape**, again and again.
`src/core/difficulty.ts` measures this:

- **Exact metrics** come straight from the rules: arrows free at the start, blocking links,
  long-range links, dependency depth and waves, density, turns, and ambiguous joins.
- **Estimated metrics** come from simulating a random tapper with a fixed seed, so they are
  deterministic. They give wrong taps per move, average choices and the free share.
- **The score (0–100)** is a weighted heuristic over both, with categories from Very easy to
  Very hard. It is an approximation for ordering levels and has not been validated with players.

## Project structure

```
├── index.html             App shell: level select and game screens, dialogs, shared SVG icons
├── vite.config.ts
├── docs/level-analysis.md  Difficulty analysis of the levels (old vs new)
├── tools/                 Level CLI (analyze, validate, generate) and its build config
├── tsconfig.json
└── src/
    ├── main.ts            Entry point: creates the parts and hands them to App
    ├── app/
    │   └── App.ts         Navigation and progression: screens, level loading, saving, transition lock
    ├── createGame.ts      Phaser bootstrap: high-DPI canvas covering the game screen
    ├── style.css          All styling: screens, HUD, level tiles, dialogs (mobile-first, landscape variants)
    │
    ├── core/              Pure game logic, no Phaser or DOM imports
    │   ├── types.ts           Direction, Cell, ArrowData, LevelData, MoveResult, GameSnapshot
    │   ├── Arrow.ts           Direction vectors and arrow helpers (head, step, authoring helper)
    │   ├── Grid.ts            Cell occupancy map
    │   ├── PathChecker.ts     Is the way from an arrow's head to the board edge clear?
    │   ├── GameState.ts       Current level state, moves, win detection, level switching, notifications
    │   ├── levelValidation.ts Checks arrow shapes, overlaps and solvability
    │   ├── solver.ts          Finds a clearing order (proves solvability)
    │   ├── difficulty.ts      Difficulty metrics and the 0–100 score
    │   └── random.ts          Seeded random numbers (reproducible analysis and generation)
    │
    ├── levels/            Level data only
    │   ├── index.ts           Registry: LEVELS in play order, LEVEL_COUNT, getLevel(id)
    │   ├── levelMap.ts        levelFromMap() / levelToMap(): text maps ↔ LevelData
    │   └── level01.ts … level10.ts
    │
    ├── levelgen/          Offline level generator (developer tool, not in the game bundle)
    │   └── generateLevel.ts   Seeded generation, refinement, layout similarity
    │
    ├── progress/          Progression, independent of rendering and game rules
    │   ├── Progress.ts        Unlock/complete rules (pure functions)
    │   └── ProgressStorage.ts localStorage save format, migration, backups and safe loading
    │
    ├── render/            Phaser drawing, no game rules
    │   ├── theme.ts           NEON ESCAPE palette and arrow proportions
    │   ├── layout.ts          Board geometry fitted into the board slot, grid bounds, pixel ↔ cell mapping
    │   ├── polyline.ts        Polyline length, slicing and point distance (animation, hit testing)
    │   ├── BoardRenderer.ts   Board frame, recessed play area, grid; entrance and win-wave effects
    │   ├── ArrowView.ts       Draws one arrow (rounded turns, notched head); press, intro, exit, blocked, hit
    │   ├── FxLayer.ts         Pooled sparks and rings on one Graphics object
    │   └── motion.ts          prefers-reduced-motion for the canvas
    │
    ├── scenes/
    │   └── GameScene.ts   Turns input into moves and move results into animations; loads levels
    │
    └── ui/                DOM views, no game rules
        ├── Screens.ts         Switches between the level select and game screens
        ├── GameLayout.ts      Sizes the board slot so the HUD and board form one centred group
        ├── LevelSelect.ts     Level tiles and progress summary
        ├── Hud.ts             In-game stats, back and restart buttons
        ├── CompleteDialog.ts  Level-complete / game-complete dialog
        ├── ConfirmDialog.ts   "Leave level?" confirmation
        └── dom.ts             Small DOM helpers (element lookup, overlay fade)
```

Tests live next to the code they cover: `*.test.ts` in `core/`, `levels/` and `progress/`.

### Architecture notes

- **Logic is separate from presentation.** `core/` has no idea Phaser exists. `GameScene` asks `GameState.tryMove(id)` and animates the returned `MoveResult` (`cleared`, `blocked` or `ignored`).
- **Arrows** are chains of adjacent cells ordered tail → head. When an arrow is released, only the head's line to the edge needs to be clear, because the body follows the head through cells the arrow already owns.
- **Solvability:** removing an arrow only ever frees cells, so repeatedly removing any clear arrow solves a level whenever a solution exists. `validateLevel()` runs this solver when a level loads and throws if the level is malformed or cannot be solved.
- **Interaction:** `GameScene` keeps a single *lock owner*, the arrow whose animation currently blocks input. The lock is released when a leaving arrow's tail crosses the grid edge, or when a blocked bump finishes. Restart and resize clear it. Callbacks from animations cut short by a restart can never release a newer lock. Level completion is guarded so it fires exactly once per play-through.
- **Layout:** the canvas covers the whole game screen, so arrows can fly past the board. The HUD and an empty `#board-slot` element sit on top of it. `GameLayout` sizes the slot to the largest board that fits beside the HUD (true aspect, max 620 px). `GameScene` reads the slot's rectangle and fits the board into it, so CSS layout and canvas drawing always agree. Taps on anything but a button fall through the UI to the canvas.
- **Rendering:** arrows are drawn with Phaser `Graphics`, not image files. The "glow" is made of opaque halo rings blended with the board colour, because a shader glow was far too slow on low-end GPUs. The canvas renders at device-pixel resolution so it stays sharp on phones.
- **Effects:** `FxLayer` draws sparks (when an arrow breaks out of the grid, or bounces off a blocker) and expanding rings. Both come from fixed pools, so no objects are created during play. The layer only redraws while an effect is alive. Leaving arrows draw a short fading energy trail. Restart, level change and resize clear every effect.
- **Motion:** gameplay animations stay in the 150–400 ms range. The arrows' entrance is spread over at most about 280 ms, whatever their number, and never blocks input. The level-complete wave and dialog take about 0.6 s. With `prefers-reduced-motion`, particles, trails, intros and the board wave are skipped, and CSS animations and transitions are turned off. Arrows still move, because their movement shows what happened.
- **Atmosphere** is pure CSS: a faint masked grid and six slowly drifting motes, animated with `transform`/`opacity` only (GPU-composited, no repaint).
- **UI** (screens, counters, buttons, dialogs) is plain HTML/CSS on top of the canvas. This keeps text sharp and makes the layout easy to adapt. Hidden screens stay in the layout but are `inert`, so the canvas keeps its size, and the Phaser loop sleeps while the level select is shown.
- **Navigation** goes through `App.navigate()`, which ignores new requests while a transition runs, so double taps can't open two levels. `GameScene.loadLevel()` rebuilds every arrow, the board size, counters and win state from scratch.

## Visual design

| Role | Colour | Used for |
| ---- | ------ | -------- |
| Primary | cyan `#27DDF5` | arrows, the next level to play, the main "Play" button, the moves counter |
| Secondary | purple `#A855F7` | navigation accents, unlock chips, the game-complete screen |
| Warning | orange `#FF9F43` | the arrow in the way, the "Leave level?" dialog |
| Success | green `#48F5A5` | leaving arrows, completed levels, the level-complete dialog |
| Error | red `#FF526B` | an arrow that can't move |

Surfaces share one set of radii (10 / 14 / 22 px and pills), a 1 px hairline border and a faint top highlight. Buttons come in four kinds: primary (cyan), success (green), secondary (neutral with purple icon) and warning (orange). Each has a pressed scale, a hover state on pointer devices, a visible keyboard focus ring and a disabled state.

## Level tools (developer only)

The tools are compiled with Vite into `.tools/` and run with plain Node, so they need no extra
TypeScript runner. Nothing here is used during play.

### Generating a level

```bash
npm run levels:generate -- --size 8 --min 50 --max 56 --seed 42
```

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `--size N` or `--rows N --cols N` | 7×7 | Grid size |
| `--min S --max S` | 40–60 | Accepted difficulty score range |
| `--seed N` | 1 | Same seed and options give the same level |
| `--count N` | 1 | Generate N distinct levels (seeds `seed`, `seed+1000`, …) |
| `--arrows MIN-MAX` | scales with grid | Arrow count range |
| `--length N` | 5 | Longest arrow, in cells |
| `--turns N` | 2 | Most turns per arrow (0 = straight only) |
| `--attempts N` | 300 | Attempts before giving up with a clear message |
| `--id N` | next free | Level id in the output |
| `--out PATH` | — | Also write the level file there (never overwrites) |

The output shows the map, every metric, and a ready-to-paste level file.

**How it works** (`src/levelgen/generateLevel.ts`):

1. **Build in reverse solving order.** Each new arrow must have a clear exit past everything
   already placed, so the level is solvable by construction. Its body is placed preferably
   across other arrows' exit lines, which creates the blocking chains.
2. **Keep it readable.** Arrows are 2 to `--length` cells long, never turn twice in a row (no U
   folded into a 2×2 square), and never meet another arrow tail-to-tail.
3. **Validate and score.** Every candidate goes through `validateLevel` and `analyzeDifficulty`.
   Candidates outside the score range, or too similar to an existing level (including rotations
   and mirror images), are rejected.
4. **Refine the closest misses.** If no candidate fits, the closest few get a bounded series of
   one-arrow edits, kept only when the level stays valid and readable and moves toward the range.
5. **Fail clearly.** After the attempt budget, it stops with the closest score it reached and
   suggestions for what to change.

### Adding a level

1. Generate candidates (or draw a map by hand), then review them by eye. Generated levels are
   drafts: check that arrows read clearly and the level feels distinct.
2. Save it as `src/levels/level11.ts`. The generator's `--out` flag writes this file for you:

   ```ts
   import { levelFromMap } from './levelMap';

   export default levelFromMap(11, [
     '.  a  a  a> .',
     '.  .  .  b^ .',
     '.  .  .  b  .',
     // one string per row …
   ]);
   ```

   - `.` is an empty cell.
   - A letter is part of the arrow with that letter. Letters are case-sensitive, so up to 52
     arrows per level.
   - A letter followed by `^`, `v`, `<` or `>` marks that arrow's head and direction.
   - Each arrow must be a single unbranched chain, and its last segment must point the way its
     head does.
3. Append it to `LEVELS` in `src/levels/index.ts`.
4. Run `npm run levels:validate` and `npm test`. The tests check ids, validity, solvability,
   readability, near-duplicates and that estimated difficulty rises level by level.

**Changing an existing level?** Pass `{ revision: N + 1 }` as the third argument of
`levelFromMap`. Players keep their completion and unlocks, but best-move records from the old
layout aren't compared with the new one.

## Not in this prototype

Capacitor/Android packaging, in-game level generation (the generator is an offline developer tool), sounds, hints, lives, power-ups and monetisation are intentionally left out.

**About the move count:** with the current rules, every successful move removes exactly one arrow and blocked attempts aren't counted, so the final move count always equals the number of arrows. The best move count is saved as requested, but it can't vary between runs. To make scores meaningful, a future step could count blocked attempts, for example as a "perfect clear" rating.
