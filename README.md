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
| `npm run typecheck` | Run the TypeScript compiler checks only (`tsc --noEmit`) |
| `npm run build`     | Type-check, then create a production build in `dist/` |
| `npm run preview`   | Serve the production build locally                    |
| `npm test`          | Run the unit tests once (Vitest)                      |
| `npm run test:watch` | Run the unit tests in watch mode                     |

## Playing as an Android phone in Chrome DevTools

1. Run `npm run dev` and open http://localhost:5173 in Chrome.
2. Open DevTools: `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on macOS).
3. Click the **Toggle device toolbar** icon (phone/tablet) or press `Ctrl+Shift+M` (`Cmd+Shift+M` on macOS).
4. In the device dropdown at the top of the page, choose an Android device such as **Pixel 7** or **Samsung Galaxy S20 Ultra**. Use **Edit…** to add more devices, or **Responsive** to drag to any size.
5. DevTools now emulates touch input, so clicks behave like taps. Portrait is the main layout. Use the rotate button to check landscape, where the HUD moves into a side column.

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
2. **Gameplay**: the back button returns to level select. If you've made moves on an unfinished level, you're asked to confirm first. Your saved progress is never affected. **Escape** works as back on desktop.
3. **Level complete**: shows moves, the level number and which level was just unlocked, with **Next level**, **Restart** and **Levels**. After level 10, a **game-complete** variant congratulates you and offers **Play from level 1**.

Only level 1 is unlocked at first. Completing a level unlocks the next one. You can replay any unlocked level, and replaying never locks anything again.

### Saved progress

Progress is stored in `localStorage` under the key `neon-escape.progress`:

```json
{ "version": 1, "highestUnlocked": 4, "completed": { "1": { "bestMoves": 5 }, "2": { "bestMoves": 7 } } }
```

- Progress is saved the moment the last arrow leaves the board, before any dialog, so leaving early can't lose a completion.
- Missing, corrupted or unknown-version data starts a new game. Individual bad entries are dropped and valid ones are kept.
- Unlocks are repaired to match completions, so if levels are added later, players who finished the old last level get the new one unlocked.
- If storage is unavailable (private mode, blocked or full), the game still works. Progress just isn't saved.

To reset your progress, run `localStorage.removeItem('neon-escape.progress')` in the DevTools console, or clear the site's data.

## Levels

| Level | Grid | Arrows | Free at start | Chain depth | Idea |
| ----- | ---- | ------ | ------------- | ----------- | ---- |
| 1 | 7×7 | 5  | 3 | 2  | Tutorial: two arrows, each blocked by one free arrow |
| 2 | 7×7 | 7  | 3 | 3  | First bent arrows and a three-step chain |
| 3 | 7×7 | 9  | 3 | 4  | One exit line crossed by two arrows that must both go first |
| 4 | 7×7 | 11 | 3 | 4  | Three separate four-step chains winding around the board |
| 5 | 7×7 | 13 | 2 | 5  | The original prototype board: crowded middle |
| 6 | 8×8 | 14 | 3 | 5  | First 8×8; an arrow with two blockers in a row |
| 7 | 8×8 | 12 | 2 | 6  | Fewer but longer arrows; one needs three others cleared |
| 8 | 8×8 | 16 | 3 | 7  | A seven-step chain snakes across the board |
| 9 | 9×9 | 21 | 4 | 9  | Dense 9×9 where long chains cross each other |
| 10 | 9×9 | 20 | 1 | 10 | Finale: a single free arrow and a ten-step chain |

*Chain depth* is the number of rounds needed if every free arrow were cleared at once each round. `analyzeLevel()` in `src/core/solver.ts` computes these numbers, and the tests check that the curve never gets shallower.

## Project structure

```
├── index.html             App shell: level select and game screens, dialogs, shared SVG icons
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.ts            Entry point: creates the parts and hands them to App
    ├── app/
    │   └── App.ts         Navigation and progression: screens, level loading, saving, transition lock
    ├── createGame.ts      Phaser bootstrap: high-DPI canvas sized to the board container
    ├── style.css          All styling: screens, HUD, level tiles, dialogs (mobile-first, landscape variants)
    │
    ├── core/              Pure game logic, no Phaser or DOM imports
    │   ├── types.ts           Direction, Cell, ArrowData, LevelData, MoveResult, GameSnapshot
    │   ├── Arrow.ts           Direction vectors and arrow helpers (head, step, authoring helper)
    │   ├── Grid.ts            Cell occupancy map
    │   ├── PathChecker.ts     Is the way from an arrow's head to the board edge clear?
    │   ├── GameState.ts       Current level state, moves, win detection, level switching, notifications
    │   ├── levelValidation.ts Checks arrow shapes, overlaps and solvability
    │   └── solver.ts          Finds a clearing order (proves solvability) and measures difficulty
    │
    ├── levels/            Level data only
    │   ├── index.ts           Registry: LEVELS in play order, LEVEL_COUNT, getLevel(id)
    │   ├── levelMap.ts        levelFromMap(): builds LevelData from a readable text map
    │   └── level01.ts … level10.ts
    │
    ├── progress/          Progression, independent of rendering and game rules
    │   ├── Progress.ts        Unlock/complete rules (pure functions)
    │   └── ProgressStorage.ts localStorage save format, validation and safe loading
    │
    ├── render/            Phaser drawing, no game rules
    │   ├── theme.ts           NEON ESCAPE palette and arrow proportions
    │   ├── layout.ts          Responsive board geometry, grid bounds and pixel ↔ cell mapping
    │   ├── polyline.ts        Polyline length, slicing and point distance (animation, hit testing)
    │   ├── BoardRenderer.ts   Rounded board container, grid lines and the win effect
    │   └── ArrowView.ts       Draws one arrow; press state, intro, exit, blocked and hit animations
    │
    ├── scenes/
    │   └── GameScene.ts   Turns input into moves and move results into animations; loads levels
    │
    └── ui/                DOM views, no game rules
        ├── Screens.ts         Switches between the level select and game screens
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
- **Rendering:** arrows are drawn with Phaser `Graphics`, not image files. The "glow" is made of opaque halo rings blended with the board colour, because a shader glow was far too slow on low-end GPUs. The canvas renders at device-pixel resolution so it stays sharp on phones.
- **UI** (screens, counters, buttons, dialogs) is plain HTML/CSS on top of the canvas. This keeps text sharp and makes the layout easy to adapt. Hidden screens stay in the layout but are `inert`, so the canvas keeps its size, and the Phaser loop sleeps while the level select is shown.
- **Navigation** goes through `App.navigate()`, which ignores new requests while a transition runs, so double taps can't open two levels. `GameScene.loadLevel()` rebuilds every arrow, the board size, counters and win state from scratch.

## Adding a level

1. Create `src/levels/level11.ts`:

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
   - A letter is part of the arrow with that letter. Letters are case-sensitive, so up to 52 arrows per level.
   - A letter followed by `^`, `v`, `<` or `>` marks that arrow's head and direction.
   - Each arrow must be a single unbranched chain, and its last segment must point the way its head does.
2. Append it to `LEVELS` in `src/levels/index.ts`.
3. Run `npm test`. The tests check that ids are sequential and that every level is valid, solvable and not trivial. They also check that the difficulty curve doesn't get shallower.

Levels can also be written directly as `LevelData` with the `arrow(id, direction, ...cells)` helper from `core/Arrow.ts`. The engine doesn't care how a level was built. No game, rendering or UI code needs to change for a new level, whatever its grid size.

## Not in this prototype

Capacitor/Android packaging, level generation, sounds, hints, lives, power-ups and monetisation are intentionally left out.

**About the move count:** with the current rules, every successful move removes exactly one arrow and blocked attempts aren't counted, so the final move count always equals the number of arrows. The best move count is saved as requested, but it can't vary between runs. To make scores meaningful, a future step could count blocked attempts, for example as a "perfect clear" rating.
