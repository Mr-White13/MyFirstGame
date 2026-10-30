# NEON ESCAPE

A 2D arrow-clearing puzzle game for mobile, built with **Phaser 3**, **TypeScript** and **Vite**.

Tap an arrow to send it flying off the board in the direction it points. It can only leave if nothing is in its way. Clear every arrow to finish the level.

This is the first playable prototype: one hand-made 7×7 level with 13 arrows.

## Requirements

- Node.js 18+ (developed with Node 22)
- npm

## Getting started

```bash
npm install
npm run dev
```

Vite prints a local URL (default http://localhost:5173). Open it in Chrome.

Because the dev server runs with `host: true`, it also prints a **Network** URL. Open that on a phone connected to the same Wi-Fi to play on a real device.

### Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload                  |
| `npm run typecheck` | Run the TypeScript compiler checks only (`tsc --noEmit`) |
| `npm run build`     | Type-check, then create a production build in `dist/` |
| `npm run preview`   | Serve the production build locally                    |

## Playing as an Android phone in Chrome DevTools

1. Run `npm run dev` and open http://localhost:5173 in Chrome.
2. Open DevTools: `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on macOS).
3. Click the **Toggle device toolbar** icon (phone/tablet) or press `Ctrl+Shift+M` (`Cmd+Shift+M` on macOS).
4. In the device dropdown at the top of the page, choose an Android device such as **Pixel 7** or **Samsung Galaxy S20 Ultra**. Use **Edit…** to add more devices, or **Responsive** to drag to any size.
5. Keep the orientation in portrait. DevTools now emulates touch input, so clicks behave like taps.
6. Reload the page (`F5`) after switching devices so the game picks up the device's pixel ratio.

## How to play

- Tap or click any part of an arrow.
- **Clear path:** the arrow slides along its own body and leaves the board. This counts as one move.
- **Blocked:** the arrow bumps forward and flashes red, and the arrow in its way flashes orange. Blocked attempts do not count as moves.
- Remove all arrows to complete the level. **Restart** resets the level at any time.

## Project structure

```
├── index.html             App shell: HUD, board container, restart button, win dialog
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.ts            Entry point: wires game state, HUD and the Phaser game together
    ├── createGame.ts      Phaser bootstrap: high-DPI canvas sized to the board container
    ├── style.css          Layout and HUD styling (mobile-first, portrait)
    │
    ├── core/              Pure game logic, no Phaser or DOM imports
    │   ├── types.ts           Direction, Cell, ArrowData, LevelData, MoveResult, GameSnapshot
    │   ├── Arrow.ts           Direction vectors and arrow helpers (head, step, authoring helper)
    │   ├── Grid.ts            Cell occupancy map
    │   ├── PathChecker.ts     Is the way from an arrow's head to the board edge clear?
    │   ├── GameState.ts       Level state, moves, win detection, change notifications
    │   ├── levelValidation.ts Checks arrow shapes, overlaps and solvability
    │   └── solver.ts          Finds a clearing order (proves a level is solvable)
    │
    ├── levels/
    │   └── level1.ts      The hand-made first level (with an ASCII map and a solution)
    │
    ├── render/            Phaser drawing, no game rules
    │   ├── theme.ts           NEON ESCAPE palette and arrow proportions
    │   ├── layout.ts          Responsive board geometry and pixel ↔ cell mapping
    │   ├── polyline.ts        Polyline length and slicing (used for the exit animation)
    │   ├── BoardRenderer.ts   Rounded board container and grid lines
    │   └── ArrowView.ts       Draws one arrow and runs its intro, exit and blocked animations
    │
    ├── scenes/
    │   └── GameScene.ts   Turns input into moves and move results into animations
    │
    └── ui/
        └── Hud.ts         DOM HUD (level, moves, arrows left) and the level-complete dialog
```

### Architecture notes

- **Logic is separate from presentation.** `core/` has no idea Phaser exists. `GameScene` asks `GameState.tryMove(id)` and animates the returned `MoveResult` (`cleared`, `blocked` or `ignored`).
- **Arrows** are chains of adjacent cells ordered tail → head. When an arrow is released, only the head's line to the edge needs to be clear, because the body follows the head through cells the arrow already owns.
- **Solvability:** removing an arrow only ever frees cells, so repeatedly removing any clear arrow solves a level whenever a solution exists. `validateLevel()` runs this solver when a level loads and throws if the level is malformed or cannot be solved.
- **Rendering:** arrows are drawn with Phaser `Graphics`, not image files. The "glow" is made of opaque halo rings blended with the board colour, because a shader glow was far too slow on low-end GPUs. The canvas renders at device-pixel resolution so it stays sharp on phones.
- **UI** (title, counters, buttons, win dialog) is plain HTML/CSS on top of the canvas. This keeps text sharp and makes the layout easy to adapt.

## Adding a level

Create a file in `src/levels/` using the `arrow(id, direction, ...cells)` helper. List cells as `[row, col]` from tail to head; the final segment must point in `direction`. `GameState` validates the level when it loads, so mistakes fail fast with a clear error message.

## Not in this prototype

Capacitor/Android packaging, multiple levels, level generation, sounds, hints, lives, power-ups and monetisation are intentionally left out.
