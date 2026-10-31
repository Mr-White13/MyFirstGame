# NEON ESCAPE

A 2D arrow-clearing puzzle game for mobile, built with **Phaser 3**, **TypeScript** and **Vite**.

Tap an arrow to send it flying off the board in the direction it points. It can only leave if nothing is in its way. Clear every arrow to finish the level.

It opens on a **Home** screen with your local **player profile** (nickname, avatar, country) and lifetime **statistics**. Every level is **timed**, with personal bests. A **Settings** screen offers four visual themes, reduced motion and effects options, synthesised sound effects and ambient music, vibration and gameplay preferences. The game has **10 hand-made levels** that grow from a 5-arrow tutorial to dense 9×9 boards. It includes a level select screen, unlockable progression and progress saved in the browser.

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
| `npm run levels:analyze` | Search score and lives model for every level (`-- --level N` for details, `-- --json` for data) |
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
- **Clear path:** the arrow flashes, slides along its own body and leaves the board.
- **Blocked:** the arrow slides up to the arrow in its way, which flashes orange and gets knocked. It costs **one life**. The tapped arrow springs back and **stays red**.
- Remove every arrow to complete the level. **Restart** resets the level at any time, even in the middle of a chain reaction.

### Lives

Every level starts with **three hearts**. Only the first blocked tap on an arrow costs a life:

- **Free:** successful moves, taps that are ignored (during an animation or after the level has ended), and taps you cancel by sliding away.
- **Repeat taps:** tapping an arrow that is already red and still blocked only nudges it gently. It costs nothing, so a double tap can't cost two lives.
- **Last life:** your last remaining heart beats slowly as a warning.

When the third life is lost, the level ends: the board frame turns red and **Game Over** shows the level, how many arrows you cleared and your mistakes. **Try again** restarts the level with full lives. **Levels** goes back to level selection. A failure never changes saved progress or locks anything.

### Red arrows and chain reactions

A red arrow has been "activated": you tried to release it, but something was in the way. It still occupies its cells and still blocks other arrows. The difference is that it is now **waiting to leave**. As soon as its path becomes clear, it leaves on its own.

Example:

1. Arrow A points right, and arrow B stands in its way.
2. You tap A. It bumps into B, you lose a life, and A turns red.
3. You tap B, which has a clear path, and it leaves.
4. A's path is now clear, so A leaves automatically, with a purple ring. No tap is needed and no life is lost.

One removal can set off several releases: if red C was waiting for red A, C goes next, and so on. The rules are resolved instantly and deterministically. After each removal, the **first** red arrow in level order that can escape is released, then the board is checked again, until no red arrow can move. The animations then play one after another, and taps are ignored until they finish. Ordinary cyan arrows are never released automatically.

### Stars

Finishing a level awards one spark-shaped star per life left: **3 lives = 3 stars, 2 = 2, 1 = 1**. Losing all three fails the level. The completion dialog reveals the stars one by one and lists the run's statistics. The level select shows each level's best rating and your total.

### Statistics

| Counter | Meaning |
| ------- | ------- |
| Lives | 3 minus mistakes, never below 0 |
| Mistakes | First taps on blocked arrows (each cost a life) |
| Cleared by you | Arrows you removed by tapping them |
| Chain reactions | Red arrows that left automatically |
| Left | Arrows still on the board |
| Moves | Kept for compatibility: equals "cleared by you". Automatic releases never count as moves. |
| Time | Active play time of the attempt (see "Timer") |

### Timer

Every level is timed, and the time shows under the level title in the HUD (`00:24`, `12:48`, `01:02:15`).

- **When it counts:** timing starts at 00:00 once the level is on screen and interactive. Loading and the screen transition don't count. Arrow animations and chain reactions do, because they are part of playing.
- **When it pauses:** while the tab is hidden or the app is in the background, and while the "Leave level?" confirmation is open. It resumes afterwards, and repeated pause and resume events can't double-count.
- **When it stops:** when the level is completed or the last life is lost. It can't keep running after you leave a level.
- **Restart and new levels:** restarting resets it to 00:00, and every new level starts a fresh timer.
- **How it measures:** the time is accumulated from a monotonic clock (`performance.now()`), not by counting interval ticks. The HUD refreshes four times a second, but only rewrites the text when the displayed second changes.

The completion dialog shows the time precisely (`24.6 s`, `1:35.2`) next to your **personal best**, with a **New best time!** chip when you beat it.

## Screens and progression

The game opens on **Home**:
- **Header:** Settings, and your avatar and nickname, which open the Profile.
- **Play card:** the next level to play, a big **Play / Continue / Play again** button, your level progress and your total stars.
- **Menu:** **Levels**, **Profile**, **Settings** and **Events** ("coming soon").
- **Daily activity:** a preview of the login streak, daily challenge and special events. These aren't implemented yet.

Other screens:

1. **Level select:** all 10 levels with grid size or best stars, your completion count and star total, and a Continue button. Completed levels show a check, the next level glows, and locked levels show a lock and can't be opened.
2. **Gameplay:** a compact HUD above the board: back, the level title with the timer (can be hidden in Settings), restart, then your hearts, a progress meter and arrows left. Restart is disabled until you've made a move or a mistake; with **Confirm restart** on (the default) it asks first. If leaving would lose an unfinished attempt, you're asked to confirm first.
3. **Settings:** see "Settings" below.
4. **Profile:** your avatar, nickname, country and rank, then a progress summary, statistics and personal records (see below).
5. **Level complete:** stars and lives left, time and personal best, arrows cleared (with chain clears) and mistakes, plus "New best time!", "Best rating!" and "Level *n* unlocked" chips. Buttons: **Next level**, **Restart** and **Levels**. After level 10 a **game-complete** variant offers **Play from level 1**.
6. **Game Over:** see "Lives" above.

**Back** works the way you'd expect:
- Levels, Profile and Settings go back to wherever you opened them from.
- Leaving a level returns to the screen you started it from (Home or Levels).
- A level you've left never reappears in the back history.
- **Escape** closes the top dialog or acts as Back on desktop.
- Navigation is locked during transitions, so double taps can't open two screens.

Only level 1 is unlocked at first. Completing a level unlocks the next one. You can replay any unlocked level, and replaying never locks anything again.

## Player profile

Everything is local: no account, no backend, nothing leaves the device.

- **Nickname:** "Player" by default, editable on the Profile screen. Up to 16 characters (an emoji counts as one). Whitespace is trimmed and collapsed. Control and invisible formatting characters are removed, and an empty name is refused with a message. Names are always rendered as plain text, so markup can't be injected.
- **Avatars:** 10 original code-drawn neon avatars: Neon Bot, Cyber Fox, Star Walker, Energy Orb, Grid Runner, Holo Cat, Cyber Wyrm, AI Core, Glitch and Escape Artist. They are inline SVG in `src/profile/avatars.ts`, with no image files or third-party art. The selected avatar appears on Home and Profile.
- **Country:** optional. "Prefer not to say" is the default, and the game never asks for or infers your location. A searchable list of ISO 3166-1 alpha-2 codes; only the code is stored. Names come from the browser (`Intl.DisplayNames`). Flags use emoji where the platform supports them; on Windows they show as two letters.
- **Rank:** a cosmetic title derived from total stars: Rookie, Runner (5★), Tracer (12★), Navigator (20★), Grid Master (27★).

### Statistics and records

| Shown as | Meaning |
| -------- | ------- |
| Levels (of 10) | Unique levels completed |
| Stars (of 30) | Sum of best ratings; unranked levels count 0 |
| Perfect levels | Levels whose best rating is 3 stars |
| Play time | Active play across all attempts: completed, failed and abandoned. Same rules as the level timer. |
| Levels cleared | Successful runs, **including replays** (unlike "Levels", which counts each level once) |
| Failed attempts | Runs that ended by losing all lives |
| Flawless runs | Successful runs with no mistakes |
| Arrows cleared | Arrows removed in all attempts, tapped plus chain |
| Chain reactions | Arrows removed by chain reactions in all attempts |
| Personal records | Best time and best stars for each level |

- **Statistics start from zero.** They are counted from the day this version first ran ("Runs counted since …"). Older saves never recorded them, so no history is invented.
- **Best stars and best time are separate records.** Each one only ever improves, and they may come from different runs. For example: 3 stars in 50 s, then 2 stars in 35 s, keeps 3 stars and 35 s.
- **Only completed runs set a best time.** Failed and restarted attempts count toward play time and arrows, never toward records.
- **Play time survives closing the app.** It is checkpointed when the app goes to the background, so closing the app mid-level doesn't lose it.

### Saved data

Four separate keys in `localStorage`, each versioned and loaded with the same safety rules (`src/storage/SafeStore.ts`):

| Key | Contents | Version |
| --- | -------- | ------- |
| `neon-escape.progress` | Unlocks and per-level records: best moves, stars, mistakes, time and layout revision | 4 |
| `neon-escape.profile` | Nickname, avatar, country | 1 |
| `neon-escape.stats` | Lifetime counters and `trackedSince` | 1 |
| `neon-escape.settings` | Theme, motion, effects, audio, vibration and gameplay options (see "Settings") | 1 |

```json
{ "version": 4, "highestUnlocked": 4, "completed": {
  "1": { "bestMoves": 5, "revision": 1, "bestStars": null, "bestMistakes": null, "bestTimeMs": null },
  "2": { "bestMoves": 6, "revision": 2, "bestStars": 2, "bestMistakes": 1, "bestTimeMs": 35210 } } }
```

- **Saving:** progress and statistics are saved the moment a level is won or lost, before any dialog, so leaving early can't lose a result.
- **Nothing is silently destroyed:** unreadable data is copied to `<key>.backup` before it can be replaced, and a save written by a *newer* game version is backed up and never overwritten.
- **Bad data:** missing or corrupted data starts fresh for that key only. Individual bad fields are dropped or reset, and valid ones are kept.
- **Older progress saves are migrated:** versions 1–3 keep every unlock, completion and star rating, and the next save writes version 4.
  - **Unranked:** completions from before lives existed stay `bestStars: null` until replayed. They are never credited with stars they didn't earn.
  - **Not timed:** completions from before the timer existed have `bestTimeMs: null` and show "not timed" until replayed.
- **Level revisions:** when a level is redesigned (its `revision` goes up), you keep the completion and the unlock, but old bests (moves, stars, mistakes, time) aren't compared with the new layout.
- **Unlocks are repaired** to match completions, so levels added later unlock for players who finished the old last level.
- **No storage:** if storage is unavailable (private mode, blocked or full), the game still works, just unsaved.

To reset everything, clear the site's data, or run this in the DevTools console:
`Object.keys(localStorage).filter(k => k.startsWith('neon-escape')).forEach(k => localStorage.removeItem(k))`

## Settings

Open **Settings** from the gear in the Home header or the Settings tile. Every control applies at once and is saved immediately, so a refresh keeps it. Back (or Escape) returns to Home.

| Group | Setting | Options (default first) |
| ----- | ------- | ----------------------- |
| Appearance | Theme | **Dark Neon**, Light, Colorful, System |
| | Reduced motion | **Auto**, On, Off |
| | Visual effects | **Normal**, Low, Off |
| Audio | Sound (master) | **On** / Off |
| | Music, Music volume | **On**, **35 %** |
| | Sound effects, Effects volume | **On**, **70 %** |
| Feedback | Vibration | **On** / Off |
| Gameplay | Show gameplay timer | **On** / Off |
| | Confirm restart | **On** / Off |
| Information | Version, credits, privacy, **Reset settings** | |

### Themes

| Theme | Look |
| ----- | ---- |
| **Dark Neon** | The original NEON ESCAPE look: dark navy, cyan and purple neon, dark board. |
| **Light** | Light page and white board, darker grid lines and cell dots, deep teal arrows, reduced glow. Accents are darkened so text and icons on white meet WCAG AA, and solid buttons switch to white text. |
| **Colorful** | A deep indigo board where each arrow takes the next colour of a coordinated neon palette (cyan, violet, orange, green, pink, blue), so neighbours are always distinct. Red is never used for a resting arrow. |
| **System** | Follows the device: Light when it prefers a light scheme, otherwise Dark Neon. Switching the OS theme while the game runs switches the game too, even mid-level. |

How it works:

- **One place for colours.** CSS colours are tokens on `:root`, redefined per theme under `[data-theme='light']` and `[data-theme='colorful']`. Translucent tints use channel tokens such as `rgb(var(--cyan-rgb) / 0.1)`, so no colour is hard-coded in rules. The Phaser board has matching **semantic** palettes in `src/render/theme.ts` (`frame`, `well`, `grid`, `arrows`, `error`, `warning`, `success`, `chain`, `glow`, …).
- **The board follows the theme.** `Appearance` sets `data-theme` on `<html>`, switches the Phaser palette and calls `GameScene.refreshTheme()`, which redraws the board and arrows in place. Nothing is rebuilt: arrows, animations, input, lives and the timer carry on.
- **No startup flash.** A tiny inline script in `index.html` reads the saved settings and sets `data-theme`, `data-motion` and `data-effects` before the first paint.
- **Gameplay is identical in every theme.** Themes only change colours.
- **Warning, success and error** keep their meaning in every theme: orange/amber = the arrow in the way, green = leaving and cleared, red = activated arrows and failure. Hearts use a separate pink.

### Reduced motion and visual effects

**Reduced motion** is *Auto* (follow the device's `prefers-reduced-motion`), *On* or *Off*. An explicit On or Off always wins over the device; Auto follows device changes live.

With reduced motion, screen and dialog transitions, decorative particles and rings, energy trails, staggered arrow intros, the board wave, background motes and pulsing glows are all off. Arrows still slide out and bump into blockers, and the hit arrow still flashes, because that motion explains what happened.

**Visual effects** scales only decoration:

| Level | Canvas | Background |
| ----- | ------ | ---------- |
| Normal | All sparks, rings and energy trails | Grid and six drifting motes |
| Low | About 40 % of the sparks, shorter trails | Grid and two motes |
| Off | No sparks, rings, trails or board wave | No ambient grid or motes, no glow pulse on the next level tile |

Collision feedback (the bump, the orange flash, the red arrow) is never turned off by either setting. Fewer particles also means less work on low-end phones.

### Audio

All audio goes through one `AudioManager` (`src/audio/`) with a **music bus** and an **effects bus** under a **master gain**, followed by a gentle limiter so bursts never clip.

- **Master sound** silences everything without changing the Music and Sound effects switches, so turning it back on restores exactly what was there.
- **Volumes** are independent, in 5 % steps, on a perceptual (squared) curve. Changes glide over ~40 ms, so sliders and switches never click. Releasing the effects slider plays a sample at the new volume.
- **Autoplay rules:** no audio context exists until the first tap or key press. Sounds before that are skipped; music starts after it.
- **Background:** hiding the tab or app fades the music and suspends the audio context; it resumes when visible.
- **Failures** (no Web Audio, no output device, a refused resume, an OS interruption) never throw into the game; the next tap tries again, and Settings shows a note if audio is unavailable.
- **No pile-ups:** each sound has a minimum gap (for example 70 ms for chain releases), at most six effects overlap, and music is never started twice. Navigating between screens doesn't restart it.
- Phaser's own sound system is turned off (`audio.noAudio`): everything is synthesised, so there are no files to load, and one audio context is cheaper than two.

**Sound effects** (`src/audio/sounds.ts`) are short, soft electronic tones: sine and triangle oscillators with smooth envelopes and low-pass filters. Button tap, arrow release (an upward zip), blocked collision (a low soft bump), losing a heart (two falling notes), chain reaction (pings climbing a pentatonic scale, so long chains sound musical), level complete (rising arpeggio), star reveal (one note per star, timed with the dialog), Game Over (a slow, calm descending line) and level unlock.

**Background music** (`src/audio/AmbientMusic.ts`) is a generative ambient track: a slow, warm pad over Am9 – Fmaj7 – Cmaj7 – Em7 (8 s per chord), a soft sub bass, and sparse plucks through an echo. It is scheduled ahead on the audio clock, so it loops without a seam, fades in over 2.5 s and out over 0.8 s, and runs only while it can be heard.

**Licensing:** every sound and the music are original and generated in code at run time. There are no audio files and no third-party audio, so there is nothing to license. A composed, recorded track could later replace the generator by playing a looped buffer into the same music bus.

### Vibration (haptics)

`src/haptics/Haptics.ts` uses the Web Vibration API (`navigator.vibrate`) behind a small `HapticsBackend` interface, so a native Capacitor Haptics backend can replace it later without changing game code.

| Event | Pattern |
| ----- | ------- |
| Arrow released | 8 ms tick |
| Blocked collision that costs a life | 30-50-30 ms double pulse |
| Chain reaction | one 12 ms pulse per chain, not per arrow |
| Level complete | 18-60-18-60-40 ms |

- Every pattern is under 250 ms, and each has a minimum gap, so nothing buzzes continuously.
- Free nudges, button taps and decorative animations never vibrate.
- Vibration is skipped before the first user interaction (Chrome ignores it then anyway), and when the switch is off. Turning it off or backgrounding the app cancels a pulse in progress.
- **Browser support:** works in Chrome on Android. **Desktop Chrome** has the API but no vibration motor, so nothing happens. Safari and iOS have no Vibration API: there the switch is disabled with an explanation.
- **No intensity setting:** the web API controls only duration, not strength, so a "haptic intensity" slider would do nothing. It is intentionally not offered.

### Gameplay preferences

- **Show gameplay timer:** hides only the HUD clock. Attempts are still timed exactly as before, and completion times, personal bests and statistics are unaffected. The completion dialog always shows the time.
- **Confirm restart:** the HUD restart button asks "Restart level?" when the attempt has moves or mistakes and the level is still going. An untouched level restarts immediately (the button is disabled anyway), and so do the Restart / Try again buttons in the end-of-level dialogs. The clock pauses while the question is open. With the setting off, restart is immediate. The "Leave level?" question is unchanged.

### Accessibility

- **Activated arrows** are drawn as a **dashed** tube as well as red, so they are recognisable without colour vision. Hearts change shape (filled vs outline), and the last heart pulses.
- **Muted or without vibration**, nothing is lost: every sound and pulse has a visible counterpart (flashes, hearts, dialogs).
- **Contrast:** a unit test checks that every arrow, error and success colour has at least 3:1 contrast with its board in every theme. Light-theme text and accents were darkened for readable contrast on white.
- **Keyboard:** all Settings controls are native inputs. Tab moves between them, Space toggles switches, arrow keys change the segmented choices and sliders, and every control has a visible focus ring. Escape closes dialogs or goes back.
- **Labels:** switches use `role="switch"` with their visible label, segmented controls are labelled radio groups with hints, sliders announce their percentage.
- **Touch targets** are at least 44 px high (sliders have a 44 px hit area around a thinner track). "On" is shown by the knob's position and a check mark, and the selected theme by a check badge, not by colour alone.

### Settings storage

Key `neon-escape.settings`, version 1, separate from progress, profile and statistics:

```json
{ "version": 1, "theme": "dark", "motion": "auto", "effects": "normal",
  "muted": false, "music": true, "sfx": true, "musicVolume": 0.35, "sfxVolume": 0.7,
  "haptics": true, "showTimer": true, "confirmRestart": true }
```

- Loaded with the same `SafeStore` rules as the other saves: each field is validated (unknown themes, wrong types and out-of-range volumes fall back to the default for that field only), corrupted data is backed up to `neon-escape.settings.backup` and replaced by defaults, a save from a newer game version is never overwritten, and without storage the settings still work for the session.
- **Migration:** `SETTINGS_MIGRATIONS` in `src/settings/Settings.ts` upgrades older versions one step at a time. Version 1 is the first format, so the table is empty for now; fields added later within a version simply take their defaults.

### Reset settings

**Reset settings** (Information group) asks for confirmation, then puts every setting back to its default and applies it at once (theme, audio, timer…). Levels, stars, best times, statistics, profile and avatar are stored under other keys and are never touched.

### Manual testing in Chrome

1. `npm run dev`, open http://localhost:5173, and turn on device emulation (`Ctrl+Shift+M`, e.g. Pixel 7).
2. **Themes:** Home → Settings → pick Light, Colorful, Dark Neon. Home, Levels, Profile, the HUD, the board and dialogs all change. Refresh: the theme is applied immediately, with no dark flash.
3. **System theme:** choose System, then in DevTools open the Command Menu (`Ctrl+Shift+P`) → "Emulate CSS prefers-color-scheme: light" / "dark". The game follows live, also during a level.
4. **Reduced motion:** with Auto, use "Emulate CSS prefers-reduced-motion: reduce": screen transitions and particles stop. Set Off: animations come back despite the emulation. Set On: they stop again.
5. **Effects:** Off removes the background motes and the sparks when arrows leave; Low keeps a few.
6. **Audio:** tap anything once (this unlocks audio), then play a level: tap sounds, releases, the collision bump and heart loss, chain pings, the win arpeggio and stars. Toggle Sound, Music and Sound effects and drag the sliders: changes are immediate. Switch to another tab: the music fades; come back: it resumes.
7. **Vibration:** on a real Android phone with Chrome (via the Network URL), blocked taps and wins vibrate; turning Vibration off stops it. On desktop nothing vibrates (expected).
8. **Timer:** turn off Show gameplay timer: the HUD clock disappears, but the completion dialog still shows your time and personal best.
9. **Confirm restart:** make a move, then tap restart: "Restart level?" appears. Turn the setting off: restart is immediate.
10. **Activated arrows:** tap a blocked arrow: it turns red *and* dashed, in every theme.
11. **Reset settings:** change a few settings, finish a level, then Reset settings → Reset. Settings return to defaults; Levels and Profile still show your stars, times and statistics.
12. **Storage:** in DevTools → Application → Local Storage, `neon-escape.settings` updates on every change. Set it to `{oops` and refresh: defaults load and the bad value is kept in `neon-escape.settings.backup`.

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
- **The search score (0–100)** is a weighted heuristic over both, with categories from Very easy
  to Very hard. It is an approximation for ordering levels and has not been validated with players.
- **The lives model** plays each level with two scripted strategies under the real lives,
  red-arrow and chain rules: a random tapper, and a "near-sighted" one that only checks the next
  cell. It reports expected mistakes, how often each finishes within 3 lives, chain clears,
  "deceptive" arrows (next cell clear but blocked further along) and a 0–100 risk score. These
  describe simple strategies, not real players. See section 7 of the analysis document.

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
    │   ├── App.ts         Navigation, progression and records: screens, level loading, attempts, saving
    │   ├── AttemptTracker.ts  One attempt's timer and bookkeeping; applyAttempt() updates progress + stats
    │   ├── Feedback.ts    Game events → sound effects and haptics
    │   ├── confirmPolicy.ts When leaving or restarting needs a confirmation
    │   └── Navigation.ts  Back-navigation history (Home is the root; gameplay is never a back target)
    ├── createGame.ts      Phaser bootstrap: high-DPI canvas covering the game screen
    ├── style.css          All styling: screens, HUD, level tiles, dialogs (mobile-first, landscape variants)
    │
    ├── core/              Pure game logic, no Phaser or DOM imports
    │   ├── types.ts           Direction, Cell, ArrowData, LevelData, MoveResult, GameSnapshot
    │   ├── Arrow.ts           Direction vectors and arrow helpers (head, step, authoring helper)
    │   ├── Grid.ts            Cell occupancy map
    │   ├── PathChecker.ts     Is the way from an arrow's head to the board edge clear?
    │   ├── GameState.ts       Rules for the current level: moves, lives, red arrows, chain reactions, win/fail
    │   ├── levelValidation.ts Checks arrow shapes, overlaps and solvability
    │   ├── solver.ts          Finds a clearing order (proves solvability)
    │   ├── difficulty.ts      Difficulty metrics and the 0–100 score
    │   ├── LevelTimer.ts      Active-play timer on a monotonic clock, with named pause reasons
    │   ├── time.ts            Time formatting (HUD clock, precise results, totals)
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
    ├── settings/          Player preferences, separate from progress
    │   ├── Settings.ts        Settings model, validation, versioned storage and migration, SettingsStore
    │   └── Appearance.ts      Theme / reduced-motion / effects resolution; applies them to CSS and the board
    │
    ├── audio/             Synthesised audio, no files
    │   ├── AudioManager.ts    One context: master, music and effects buses; unlock, mute, background, failures
    │   ├── sounds.ts          Original procedural sound effects
    │   ├── AmbientMusic.ts    Original generative ambient music
    │   └── mix.ts             Channel gains, volume curve, throttling (pure)
    │
    ├── haptics/
    │   └── Haptics.ts         Vibration patterns, web backend (native-ready interface)
    │
    ├── profile/           Local player identity and lifetime statistics
    │   ├── Profile.ts         Nickname rules, avatar/country choice, rank, profile storage
    │   ├── avatars.ts         10 original inline-SVG avatars
    │   ├── countries.ts       ISO 3166-1 alpha-2 list, names via Intl, flag emoji, search
    │   └── Stats.ts           Lifetime counters per attempt, stats storage
    │
    ├── storage/
    │   └── SafeStore.ts       One versioned localStorage record: backups, newer-save protection
    │
    ├── progress/          Progression, independent of rendering and game rules
    │   ├── Progress.ts        Unlock/complete rules (pure functions)
    │   └── ProgressStorage.ts localStorage save format, migration, backups and safe loading
    │
    ├── render/            Phaser drawing, no game rules
    │   ├── theme.ts           Semantic board palettes per theme, arrow proportions, contrast helpers
    │   ├── layout.ts          Board geometry fitted into the board slot, grid bounds, pixel ↔ cell mapping
    │   ├── polyline.ts        Polyline length, slicing and point distance (animation, hit testing)
    │   ├── BoardRenderer.ts   Board frame, recessed play area, grid; entrance and win-wave effects
    │   ├── ArrowView.ts       Draws one arrow (rounded turns, notched head); press, intro, exit, blocked, hit
    │   ├── FxLayer.ts         Pooled sparks and rings on one Graphics object
    │   └── motion.ts          Resolved reduced-motion and effects preferences
    │
    ├── scenes/
    │   ├── GameScene.ts   Turns input into moves and move results into animations; loads levels
    │   └── MoveSequencer.ts Plays one action's animations in order; input lock with cancel tokens
    │
    └── ui/                DOM views, no game rules
        ├── Screens.ts         Switches between Home, Levels, Game, Profile and Settings
        ├── SettingsScreen.ts  Settings controls (switches, segmented controls, sliders)
        ├── HomeScreen.ts      Start screen: identity, next level, progress, menu
        ├── ProfileScreen.ts   Identity, summary, statistics, personal records, nickname editing
        ├── Pickers.ts         Avatar grid and searchable country list
        ├── Toast.ts           Short "coming soon" messages
        ├── GameLayout.ts      Sizes the board slot so the HUD and board form one centred group
        ├── LevelSelect.ts     Level tiles and progress summary
        ├── Hud.ts             In-game timer, hearts, arrows left, back and restart buttons
        ├── CompleteDialog.ts  Level-complete / game-complete dialog: stars, time, personal best, statistics
        ├── GameOverDialog.ts  Out-of-lives dialog
        ├── ConfirmDialog.ts   Confirmations: leave level, restart level, reset settings
        └── dom.ts             Small DOM helpers (element lookup, overlay fade)
```

Tests live next to the code they cover (`*.test.ts`). Browser APIs (Web Audio, vibration, media queries, the DOM) are replaced by small fakes, so everything runs in plain Node.

### Architecture notes

- **Logic is separate from presentation.** `core/` has no idea Phaser exists. `GameScene` asks `GameState.tryMove(id)` and animates the returned `MoveResult` (`cleared`, `blocked` or `ignored`).
- **Arrows** are chains of adjacent cells ordered tail → head. When an arrow is released, only the head's line to the edge needs to be clear, because the body follows the head through cells the arrow already owns.
- **Solvability:** removing an arrow only ever frees cells, so repeatedly removing any clear arrow solves a level whenever a solution exists. `validateLevel()` runs this solver when a level loads and throws if the level is malformed or cannot be solved.
- **Attempts:** `AttemptTracker` (Phaser-free) owns the timer for the attempt in progress and ends each attempt exactly once, as won, failed or abandoned. `applyAttempt()` turns that into records. Every outcome updates statistics, but only a win touches per-level progress, so a failed or restarted run can never set a personal best.
- **Timer:** `LevelTimer` banks time from a monotonic clock at every state change. Pauses are named reasons (`hidden`, `confirm`) that each need their own resume. The timer runs only when none are active, which makes repeated events harmless. It is unit-tested with a fake clock.
- **Rules first, animation second:** `GameState.tryMove` resolves a whole tap synchronously, including lives, red arrows and the full chain reaction. It returns a result listing every removal in order. Visuals can never change the outcome.
- **Interaction:** `GameScene` turns that result into animation steps, and `MoveSequencer` (Phaser-free and unit-tested) plays them one after another while holding the input lock. Taps during a sequence are dropped before they reach `GameState`, so they can't cost a life. Each exit step hands over when the arrow's tail crosses the grid edge. Win and Game Over start only after the last step. Restart, level change and resize cancel the sequence: its token is invalidated so late callbacks are ignored, and the board is re-synced from `GameState`.
- **Layout:** the canvas covers the whole game screen, so arrows can fly past the board. The HUD and an empty `#board-slot` element sit on top of it. `GameLayout` sizes the slot to the largest board that fits beside the HUD (true aspect, max 620 px). `GameScene` reads the slot's rectangle and fits the board into it, so CSS layout and canvas drawing always agree. Taps on anything but a button fall through the UI to the canvas.
- **Rendering:** arrows are drawn with Phaser `Graphics`, not image files. The "glow" is made of opaque halo rings blended with the board colour, because a shader glow was far too slow on low-end GPUs. The canvas renders at device-pixel resolution so it stays sharp on phones.
- **Effects:** `FxLayer` draws sparks (when an arrow breaks out of the grid, or bounces off a blocker) and expanding rings. Both come from fixed pools, so no objects are created during play. The layer only redraws while an effect is alive. Leaving arrows draw a short fading energy trail. Restart, level change and resize clear every effect.
- **Motion:** gameplay animations stay in the 150–400 ms range. The arrows' entrance is spread over at most about 280 ms, whatever their number, and never blocks input. The level-complete wave and dialog take about 0.6 s. With reduced motion (the Settings choice, or the device's `prefers-reduced-motion` on Auto), particles, trails, intros and the board wave are skipped, and CSS animations and transitions are turned off. Arrows still move, because their movement shows what happened. `render/motion.ts` holds the resolved preference for both the canvas and the DOM.
- **Atmosphere** is pure CSS: a faint masked grid and six slowly drifting motes, animated with `transform`/`opacity` only (GPU-composited, no repaint).
- **UI** (screens, counters, buttons, dialogs) is plain HTML/CSS on top of the canvas. This keeps text sharp and makes the layout easy to adapt. Hidden screens stay in the layout but are `inert`, so the canvas keeps its size, and the Phaser loop sleeps while the level select is shown.
- **Navigation** goes through `App.navigate()`, which ignores new requests while a transition runs, so double taps can't open two levels. `GameScene.loadLevel()` rebuilds every arrow, the board size, counters and win state from scratch.

## Visual design

The table shows Dark Neon; Light and Colorful keep the same roles with adjusted values (see "Themes").

| Role | Colour | Used for |
| ---- | ------ | -------- |
| Primary | cyan `#27DDF5` | arrows, the next level to play, the main "Play" button, the moves counter |
| Secondary | purple `#A855F7` | navigation accents, unlock chips, the game-complete screen, chain-reaction releases |
| Warning | orange `#FF9F43` | the arrow in the way, the "Leave level?" dialog |
| Success | green `#48F5A5` | leaving arrows, completed levels, the level-complete dialog |
| Lives | pink `#FF5C8A` | hearts (a softer red than "error", so health doesn't read as "wrong") |
| Error | red `#FF526B` | activated (red) arrows, the Game Over dialog, the board frame on failure |

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

Capacitor/Android packaging, in-game level generation (the generator is an offline developer tool), hints, lives, power-ups and monetisation are intentionally left out.

**About scoring:** the star rating (lives left) is the measure of skill. The move counter is kept for compatibility. It counts arrows you cleared by tapping, so it equals the arrow count minus chain-reaction releases, and it isn't used for ratings.
