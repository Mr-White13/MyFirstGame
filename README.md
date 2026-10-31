# NEON ESCAPE

A 2D arrow-clearing puzzle game for mobile, built with **Phaser 3**, **TypeScript** and **Vite**.

Tap an arrow to send it flying off the board in the direction it points. It can only leave if nothing is in its way. Clear every arrow to finish the level.

It opens on a **Home** screen with your local **player profile** (nickname, avatar, country) and lifetime **statistics**. Every level is **timed**, with personal bests. A **Settings** screen offers four visual themes, reduced motion and effects options, synthesised sound effects and ambient music, vibration and gameplay preferences. A **daily check-in** with a 7-day reward cycle, login streaks, **Energy Credits** and **12 achievements** reward coming back. After Level 10, the **Daily League** offers three daily challenges with collectible **Energy Arrows** and a six-tier league (Bronze to Neon Elite) based on transparent, offline daily targets. The game has **30 levels**: 10 hand-made ones that grow from a 5-arrow tutorial to dense 9×9 boards, then 20 larger generated and reviewed levels up to 16×16, with thin adaptive arrows and pinch-zoom. It includes a level select screen, unlockable progression and progress saved in the browser.

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
| `npm run levels` | Same as `levels:validate` |
| `npm run levels:plan` | Regenerate the planned levels from `tools/level-plan.json` (see "Level tools") |
| `npm run android:apk` | Build a debug APK of the Android app (see "Android app") |
| `npm run android:sync` / `android:open` / `android:run` | Copy the web build into the Android project / open it in Android Studio / run it on a phone or emulator |

## Playing as an Android phone in Chrome DevTools

1. Run `npm run dev` and open http://localhost:5173 in Chrome.
2. Open DevTools: `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on macOS).
3. Click the **Toggle device toolbar** icon (phone/tablet) or press `Ctrl+Shift+M` (`Cmd+Shift+M` on macOS).
4. In the device dropdown at the top of the page, choose an Android device such as **Pixel 7** or **Samsung Galaxy S20 Ultra**. Use **Edit…** to add more devices, or **Responsive** to drag to any size.
5. DevTools now emulates touch input, so clicks behave like taps. Portrait is the main layout. Use the rotate button to check landscape, where the HUD moves into a side column.

Good sizes to check are 360×800, 390×844 and 412×915 (use **Responsive** and type the size).

## Android app (Capacitor)

NEON ESCAPE also runs as an installed Android app. [Capacitor](https://capacitorjs.com) 8 wraps the production web build (`dist/`) in a native WebView. The game code is the same: you keep developing in the browser with `npm run dev`, and build a new APK whenever you want.

### What's set up

| | |
| --- | --- |
| App name | NEON ESCAPE |
| App id | `dev.neonescape.prototype` (temporary, see "Changing the app id") |
| Web content | `dist/`, copied into the app by `cap sync`. Everything is bundled: no internet needed to play. |
| Orientation | Portrait only (`android:screenOrientation="portrait"` in `AndroidManifest.xml`) |
| Full screen | Immersive: status and navigation bars are hidden and appear briefly when you swipe from an edge (`MainActivity.java`). The page is edge-to-edge and the existing CSS safe-area padding keeps the UI clear of the notch and gesture area (`SystemBars.insetsHandling: "native"` in `capacitor.config.json`). |
| Launch screen | A plain `#101522` window with no logo or icon (`AppTheme.NoActionBarLaunch` in `res/values/styles.xml`, `launch_blank.xml`). The only branded splash is the web **Mr. White Games** splash, which starts on the same colour, so there is no double splash and no white flash. |
| Back button / gesture | Follows the game: closes the open dialog or picker, cancels nickname editing, answers an end-of-level dialog as "Levels"/"League", leaves a level (asking "Leave level?" if an attempt would be lost), or goes to the previous screen. On Home it sends the app to the background (like the Home button) instead of closing it. Escape on desktop works as before. |
| Background | Pausing the app pauses the level timer (play time is saved), fades the music and suspends audio, and stops vibration. Resuming continues the timer, resumes audio, and checks for a new day (daily reward, league settlement). Uses the native pause/resume events as well as the page's own visibility events. |
| Vibration | Native, through the app's own `NeonHaptics` plugin (`android/.../NeonHapticsPlugin.java`, used by `src/native/nativeApp.ts`). It plays waveforms with set strengths as **game/media vibration**. The stock `@capacitor/haptics` remains as a fallback. See "Vibration on Android" below. |
| Audio | The same synthesised Web Audio. As in Chrome, it starts after your first tap. |
| Saved data | `localStorage` inside the app's private WebView storage: progress, profile, statistics, settings, daily rewards, achievements and league all work as in the browser. The app's data is separate from Chrome's (your browser progress doesn't move to the phone), and it is deleted if the app is uninstalled. Updating the app over the old one keeps it. |
| No | ads, accounts, network calls or backend. The only permissions are `INTERNET` (Capacitor's default, unused by the game) and `VIBRATE`. |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run android:sync` | Builds the web app and copies it into `android/` (run after every web change) |
| `npm run android:apk` | `android:sync`, then builds a **debug APK** with Gradle and prints its path |
| `npm run android:open` | Opens the `android/` project in Android Studio |
| `npm run android:run` | `android:sync`, then installs and starts the app on a connected phone or a running emulator |

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

### What you need (one-time)

- **Android Studio** (it includes the Android SDK and a Java runtime). Open it once and finish the setup wizard so the SDK is installed. The build finds both in their default locations; otherwise set `JAVA_HOME` and `ANDROID_HOME`.
- Missing SDK parts (platform 36, build tools) are downloaded automatically on the first build. The first build also downloads Gradle and takes a few minutes; later builds take about 30 seconds.
- The project uses **Gradle 9.1** because current Android Studio runs on Java 25 and older Gradle versions can't (Capacitor's template shipped Gradle 8.14.3). The Android Gradle Plugin stays at Capacitor's tested 8.13.0.

### Build the debug APK

From the project folder:

```bash
npm run android:apk
```

Or in Android Studio: `npm run android:open`, wait for "Gradle sync" to finish (bottom status bar), then **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. When it's done, click **locate** in the notification to open the folder with `app-debug.apk`.

### Install it on your phone

1. Copy `app-debug.apk` to the phone: USB cable (copy it to *Download*), Google Drive, email to yourself, or Nearby Share / Quick Share.
2. On the phone, open the file (Files app → Downloads). Android asks to allow installing apps from that source (Files, Drive, Chrome…): allow it for that app, then tap **Install**.
3. Google Play Protect may warn about an app from an unknown developer. That's expected for your own debug build: choose **Install anyway**.
4. Open **NEON ESCAPE** from the app drawer.

**With a USB cable and developer mode** (faster for repeated testing): enable *Developer options* (tap *Build number* in *About phone* 7 times), turn on *USB debugging*, connect the phone, accept the prompt, then run `npm run android:run`.

### What to test on the phone

1. It starts full screen in portrait, with no white flash, and nothing hidden under the notch or the gesture bar.
2. On a cold start the Mr. White Games splash plays once (about 3.7 s; tap to skip once the logo is shown), then the recap card (if you have records and it's on in Settings), then Home. Press Home and come back: no splash.
3. Tap Play: the first tap starts the music (if enabled); arrows, sounds and vibration work. Toggle Settings → Vibration and Sound to check they respond.
4. Back: from a level it asks "Leave level?" (after a move), from Levels/Profile/Settings it goes back, it closes dialogs, and on Home it sends the app to the background.
5. Press Home during a level, wait, and come back: the timer didn't run while away and the music resumes.
6. Force-close the app (recent apps → swipe away) and reopen: progress, stars, settings, credits and the daily calendar are still there.
7. Turn on airplane mode: everything still works.
8. Rotate the phone: the game stays in portrait.

**Tested so far:** on the Android emulator (Android 17 / API 37, WebView Chrome 145): immersive full screen, Back in dialogs, levels and on Home, pause/resume of the timer and audio, vibration requests (checked in Android's vibration history), a 16×16 level, and saved data surviving a force-close. Physical-phone testing is up to you; see "Vibration on Android" for what to check. Once, on the emulator, Android delivered an extra Back event right after the app resumed, which opened "Leave level?" (nothing is lost; tap Keep playing). It didn't reproduce; if it happens on a phone, report it.

### Vibration on Android

**What was wrong (first APK):** the game sent 8–30 ms vibrations through the stock Capacitor Haptics plugin, which sets no usage. Android's vibration history on the emulator showed them as `usage: TOUCH, 8ms`. Two problems:
- Pulses that short are often too weak to feel.
- *Touch* vibrations follow the phone's **touch feedback / "Vibration feedback"** switch, which many phones have off. Then every vibration is silently dropped.

**What changed:**
- The app has its own small native plugin that vibrates as **media/game** usage (Android 13+: `USAGE_MEDIA`; older: `USAGE_GAME`), so it follows the **media vibration** intensity instead of touch feedback.
- Effects are stronger, with set strengths (amplitude 0–255):

| Event | Effect |
| --- | --- |
| Arrow released | 32 ms at 140 (light tick) |
| Chain reaction | 36 ms at 170, once per chain |
| Blocked collision | 48 ms at 220 |
| Heart lost | 45 · pause 60 · 45 ms at 230 |
| Level complete | 40 · 70 · 40 · 70 · 90 ms, rising to 255 |
| Reward / achievement | 35 · 50 · 60 ms |
| League promotion | 50 · 60 · 50 · 60 · 120 ms |
| Settings test | 400 ms at 255 |

On the emulator the new requests appear as `usage: MEDIA`, for example `Step=32ms(amplitude=0.55)`, status `finished`.

**Test it on your phone:**
1. Rebuild and install over the old app: `npm run android:apk`, then copy `android/app/build/outputs/apk/debug/app-debug.apk` to the phone and install (progress is kept).
2. Settings → Feedback → **Test vibration**. You should feel a clear 0.4 s buzz. The message says the request was *sent*; it can't know whether you felt it.
3. Play a level: releases tick lightly, collisions and lost hearts are stronger, and a completed level gives a short pattern.
4. **If you feel nothing:** Android Settings → **Sound & vibration → Vibration & haptics**. Make sure vibration is on and **media vibration** (some phones: "Media" or "Multimedia") isn't at zero. Also check Battery saver, Do not disturb and silent mode, some of which mute vibrations.
5. **Collect evidence if it still doesn't work.** With USB debugging on, run each command below. Send me the output of both, plus the phone model and Android version.

```bash
adb logcat -c
```

Then press Test vibration, and run:

```bash
adb logcat -d | findstr "\[haptics\]"
```

```bash
adb shell dumpsys vibrator_manager
```

The first shows what the app asked for and whether Android accepted it: `native=true NeonHaptics=true`, device info, then `resolved` or `rejected`. The second, under "Recent vibrations", shows whether Android actually played it (`finished`) or ignored it (for example `ignored_for_settings`).

On macOS/Linux use `grep` instead of `findstr`. For more detail during normal play, turn on diagnostics (Settings: tap Version five times); every vibration is then logged.

### After changing the code

The app contains a copy of the web build, so rebuild after each change:

```bash
npm run android:apk
```

Then install the new APK over the old one. Your saved progress on the phone is kept, as long as the app id and signing key stay the same; debug builds from the same computer share a debug key.

### Debug APK vs release AAB

| | Debug APK (`app-debug.apk`) | Release AAB (`app-release.aab`) |
| --- | --- | --- |
| For | Testing on your own devices | Publishing on Google Play |
| Signed with | An automatic debug key on this computer | Your private upload key (keep it safe and never commit it: `*.jks` / `*.keystore` are git-ignored) |
| Install | Directly on a phone | Google Play builds device-specific APKs from it; it can't be installed directly |
| Optimised | No (debuggable, larger) | Yes (can be minified) |

A release build needs a signing key (Android Studio: **Build → Generate Signed App Bundle / APK**), a final app id, an app icon, a version code and a Play Console account. None of this is set up yet.

### Changing the app id

The id must be unique on Google Play and can never change after publishing. Pick a reverse-domain id you control (for example `com.yourname.neonescape`) before the first release, then:
1. Set `appId` in `capacitor.config.json`.
2. Set `namespace` and `applicationId` in `android/app/build.gradle`.
3. Move `MainActivity.java` to the matching folder under `android/app/src/main/java/` and update its `package` line.
4. Update `package_name` and `custom_url_scheme` in `android/app/src/main/res/values/strings.xml`.
5. Run `npm run android:sync`.

A new id is a different app on the phone: it installs next to the old one with empty saved data.

### Files

- `capacitor.config.json`: app id, name, web folder, background colour, safe-area handling.
- `android/`: the native project (committed). Build output, the copied web build (`app/src/main/assets/public`) and `local.properties` are ignored by `android/.gitignore`.
- `android/app/src/main/java/.../MainActivity.java`: immersive full screen.
- `src/native/nativeApp.ts`: Back button, pause/resume and native vibration. It does nothing in the browser.
- `scripts/android-apk.mjs`: the APK build behind `npm run android:apk`.

**Not yet:** app icon and splash screen (Capacitor defaults), release signing, store listing. Capacitor's CLI sends anonymous usage data; turn it off with `npx cap telemetry off`.

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

One removal can set off several releases: if red C was waiting for red A, C goes next, and so on. The rules are resolved instantly and deterministically. After each removal, the **first** red arrow in level order that can escape is released, then the board is checked again, until no red arrow can move. The animations then play one after another, and taps are ignored until they finish. Ordinary arrows are never released by this rule; the only other automatic removal is the streak bonus (below).

### Streak bonus

Fast, clean play now and then earns a small bonus. Five pips in the HUD show the streak:

1. Every arrow you clear with a tap lights a pip. The pips count your **successful taps in the last 4 seconds** (a rolling window): they slowly dim and go out once 4 s have passed since your last tap.
2. When your **last 5 successful taps all fit within 4 s**, the bonus fires on the 5th: after that tap (and any red chain it causes), **exactly 2** normal arrows that can escape right now leave on their own, the first two in level order. They fly off together, a short stagger apart, like tapped arrows; the pips flash and "+2" floats up. Red arrows that this frees then leave by the usual chain rule.
3. If fewer than 2 arrows can escape at that moment, the bonus is **skipped** and nothing is used up: your streak holds, so a later quick tap can still earn it.
4. After a bonus the pips dim while it **recharges**: at least **8 more successful clears of your own** are needed before another bonus can fire (a new streak builds up meanwhile). So a bonus comes at most about once every 8 taps, never in a row.
5. A **blocked tap** (also a repeat tap on an arrow that is already red) resets the streak. A restart, a new level or running out of lives resets the streak and the recharge.

Only your own successful taps count: chain releases and bonus clears never add to the streak or the recharge. A bonus never takes a blocked or red arrow (only arrows you could have tapped yourself) and never empties the board: the last arrow is always yours. It is deterministic: the same taps at the same times give the same result.

Bonus clears cost no lives and are not your moves. They count once towards "arrows cleared" in the statistics and the daily recap, collect Energy Arrows in Daily League challenges (each Energy Arrow pays exactly once: points are keyed by challenge and arrow), and a level a bonus helps finish is completed exactly as usual. Chain-reaction achievements count only red-arrow releases. The rules are configurable in `src/core/types.ts` (`STREAK_TAPS = 5`, `STREAK_WINDOW_MS = 4000`, `BONUS_CLEARS = 2`, `BONUS_COOLDOWN = 8`), live in `GameState` and are covered by `src/core/cascade.test.ts`. The offline difficulty analysis plays as a quick player (every streak counts).

### Stars

Finishing a level awards one spark-shaped star per life left: **3 lives = 3 stars, 2 = 2, 1 = 1**. Losing all three fails the level. The completion dialog reveals the stars one by one and lists the run's statistics. The level select shows each level's best rating and your total.

### Statistics

| Counter | Meaning |
| ------- | ------- |
| Lives | 3 minus mistakes, never below 0 |
| Mistakes | First taps on blocked arrows (each cost a life) |
| Cleared by you | Arrows you removed by tapping them |
| Chain reactions | Red arrows that left automatically |
| Streak bonus | Normal arrows cleared by a streak bonus (counted in "Arrows cleared", not in chain reactions) |
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

On a cold launch the **Mr. White Games** splash plays first, optionally followed by one **recap** card (see "Studio splash and player recap"). The game then shows **Home**:
- **Header:** Settings, your **Energy Credits** balance (opens Daily rewards), and your avatar and nickname, which open the Profile.
- **Play card:** the next level to play, a big **Play / Continue / Play again** button, your level progress and your total stars.
- **Daily card:** your login streak and today's reward: a green **Claim +N** when it's ready, otherwise "Claimed today · Tomorrow +N" and a **Rewards** button. See "Daily rewards, streaks and achievements".
- **League card:** your league crest and today's Energy Points (or "Unlocks after Level 10" with your progress). Opens the League screen.
- **Menu:** **Levels**, **Profile**, **Awards** (achievements, with *n*/12) and **Settings**. The old "Events" and "Daily activity (coming soon)" placeholders were replaced by these.

Other screens:

1. **Level select:** all 10 levels with grid size or best stars, your completion count and star total, and a Continue button. Completed levels show a check, the next level glows, and locked levels show a lock and can't be opened.
2. **Gameplay:** a compact HUD pinned to the top (back, the level title with the timer, the **theme** palette button and restart; then hearts, a progress meter, the five **streak** pips and arrows left), and below it a borderless board (a faint dot per cell) that uses all the remaining height: Levels 4–30 are tall portrait boards. Safe areas are respected at the top and bottom. Restart is disabled until you've made a move or a mistake; with **Confirm restart** on (the default) it asks first. If leaving would lose an unfinished attempt, you're asked to confirm first.
3. **Settings:** see "Settings" below. **Achievements** and the **Daily rewards** calendar: see "Daily rewards, streaks and achievements".
4. **Profile:** your avatar, nickname, country and rank, then a progress summary, statistics and personal records (see below).
5. **Level complete:** stars and lives left, time and personal best, arrows cleared (with chain clears) and mistakes, plus "New best time!", "Best rating!" and "Level *n* unlocked" chips. Buttons: **Next level**, **Restart** and **Levels**. After level 10 a **game-complete** variant offers **Play from level 1**.
6. **Game Over:** see "Lives" above.

**Back** works the way you'd expect:
- Levels, Profile and Settings go back to wherever you opened them from.
- Leaving a level returns to the screen you started it from (Home or Levels).
- A level you've left never reappears in the back history.
- **Escape** closes the top dialog or acts as Back on desktop.
- Navigation is locked during transitions, so double taps can't open two screens.

**Testing build: all levels open.** `UNLOCK_ALL_LEVELS_FOR_TESTING` in `src/progress/testUnlock.ts` is currently `true`, so every one of the 30 levels can be opened from Level select (a note says so, and levels you haven't really unlocked have a dashed outline). Such a level is a **test play**: its result is shown, with a "not saved" notice, but nothing is recorded: no completion, stars, best time, unlock, statistics or daily stats. Your real unlocks and records never change because of the flag. For a release, set it to `false`; nothing else needs to change.

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

Eight separate keys in `localStorage`, each versioned and loaded with the same safety rules (`src/storage/SafeStore.ts`):

| Key | Contents | Version |
| --- | -------- | ------- |
| `neon-escape.progress` | Unlocks and per-level records: best moves, stars, mistakes, time and layout revision | 4 |
| `neon-escape.profile` | Nickname, avatar, country | 1 |
| `neon-escape.stats` | Lifetime counters and `trackedSince` | 1 |
| `neon-escape.settings` | Theme, motion, effects, audio, vibration and gameplay options (see "Settings") | 1 |
| `neon-escape.rewards` | Daily check-in, Energy Credits wallet, achievements (see "How rewards are saved") | 1 |
| `neon-escape.league` | Daily League: tier, today's Energy Points, history, milestones (see "How league data is saved") | 1 |
| `neon-escape.daily-stats` | Per-day play time, runs, levels cleared, flawless clears and arrows (newest 35 days) and the first tracked day, for the recap | 1 |
| `neon-escape.recap` | The recap's rotation position | 1 |

`sessionStorage` holds one flag, `neon-escape.splash-shown`, so the studio splash plays once per cold launch.

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
| | Player recap | **On** / Off |
| Information | Version, credits, privacy, **Reset settings** | |

### Themes

| Theme | Look |
| ----- | ---- |
| **Dark Neon** | The original NEON ESCAPE look: dark navy, cyan and purple neon, dark board. |
| **Light** | Light page, darker cell dots, deep teal arrows, reduced glow. Accents are darkened so text and icons on white meet WCAG AA, and solid buttons switch to white text. |
| **Colorful** | A deep indigo board where each arrow takes the next colour of a coordinated neon palette (cyan, violet, orange, green, pink, blue), so neighbours are always distinct. Red is never used for a resting arrow. |
| **System** | Follows the device: Light when it prefers a light scheme, otherwise Dark Neon. Switching the OS theme while the game runs switches the game too, even mid-level. |

How it works:

- **One place for colours.** CSS colours are tokens on `:root`, redefined per theme under `[data-theme='light']` and `[data-theme='colorful']`. Translucent tints use channel tokens such as `rgb(var(--cyan-rgb) / 0.1)`, so no colour is hard-coded in rules. The Phaser board has matching **semantic** palettes in `src/render/theme.ts` (`background`, `well`, `dots`, `arrows`, `error`, `warning`, `success`, `chain`, `glow`, …). The board is borderless, so `well` (what arrows are drawn on) is the page colour.
- **In-game picker.** The palette button in the gameplay HUD opens a compact card with the same four themes. A choice applies at once and is saved to the same setting; the level, zoom and pan are untouched. The timer is paused while the card is open, and a tap outside it (which never reaches the board), Back or Escape closes it without a change.
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

`src/haptics/Haptics.ts` defines one table of effects (durations plus strengths, see "Vibration on Android") and plays them through a backend: the native NeonHaptics plugin in the Android app, or the Web Vibration API (`navigator.vibrate`, durations only) in browsers.

- Every effect is at most 350 ms (pulses at least ~30 ms, so they can be felt), and each has a minimum gap, so nothing buzzes continuously.
- Free nudges, button taps and decorative animations never vibrate.
- Vibration is skipped before the first user interaction (Chrome ignores it then anyway), and when the switch is off. Turning it off or backgrounding the app cancels a pulse in progress.
- **Browser support:** works in Chrome on Android. **Desktop Chrome** has the API but no vibration motor, so nothing happens. Safari and iOS have no Vibration API: there the switch is disabled with an explanation.
- **No intensity setting:** strength is fixed per effect (see "Vibration on Android"), and in browsers the Vibration API controls only duration. A user-facing intensity slider would behave differently on every device, so it is intentionally not offered.
- **Test vibration** (Settings → Feedback) plays one strong 0.4 s vibration, even if Vibration is switched off, and reports whether the request was sent.

### Gameplay preferences

- **Player recap:** after the studio splash on a cold launch, show one fact from your own records before Home (see "Studio splash and player recap"). On by default; older settings saves get it on.
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

## Daily rewards, streaks and achievements

### Daily check-in and login streak

- **Check-in is automatic.** Opening the game on a day (starting it, refreshing, coming back from the background, or midnight passing while it is in front of you) counts that day. Checking in several times on one day changes nothing.
- **Streak:** consecutive calendar days with a check-in. The next day adds 1; missing a day starts again at 1. The **longest streak** never goes down. **Days played** counts distinct days.
- **Claiming is always a tap.** Check-in never pays anything; leaving the game open overnight doesn't either. When a new day is noticed, Home updates to show the reward is ready, and you claim it in **Daily rewards**.
- **No pressure:** there are no countdowns or timers. A claimed day just says what tomorrow brings.

### Reward cycle

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | - | - | - | - | - | - | - |
| Energy Credits | 10 | 15 | 20 | 25 | 30 | 40 | 75 |

The day of the cycle follows the streak: streak 1 = Day 1, streak 7 = Day 7, streak 8 starts again at Day 1. Missing a day restarts the cycle at Day 1, but credits already earned are always kept. A day you played without claiming shows as **Missed** in the calendar. These amounts are initial balancing values (`DAILY_REWARDS` in `src/daily/Daily.ts`).

Open the calendar from the **daily card** on Home or the **credits chip** in the Home header. It shows the streak, the balance, and the 7 days: claimed (check mark), missed (dashed, struck through), today (highlighted) and upcoming. Claiming plays a short pop and "+N" with a count-up of the balance, a sound and a short vibration. With reduced motion only the numbers change; with sound or vibration off, those are skipped.

### Energy Credits and Energy Points

**Energy Credits** are the reward currency added in this step:
- Earned from daily rewards and achievements. They never reset.
- Offline only: they can't be bought, transferred or exchanged, and have no real-money value.
- There is no shop yet. The wallet already supports validated spending (`spend()`), so cosmetics or optional hints can be added later without changing the save format.

**Energy Points** are a different thing, coming in Step 10: points collected from special arrows during play that count toward daily league progress and reset with each competition. They will have their own record. Nothing in the wallet counts them, and the two are never mixed.

### Achievements

Twelve achievements, shown on the **Achievements** screen (Home → Awards, or Profile → Achievements) with icon, description, progress, reward and locked/unlocked state, plus "*n* / 12 achievements unlocked".

| Achievement | Requirement | Credits |
| ----------- | ----------- | ------- |
| First Escape | Complete your first level | 15 |
| Perfect Run | Finish a level with 3 stars | 20 |
| Chain Reaction | Free a red arrow so it leaves on its own | 20 |
| Double Chain | Release 2 red arrows in a single chain reaction | 40 |
| Puzzle Explorer | Complete 5 different levels | 30 |
| Puzzle Veteran | Complete all 10 levels | 60 |
| Speed Runner | Complete a level with 10+ arrows in under 30 seconds | 40 |
| Flawless Five | Earn 3 stars on 5 different levels | 50 |
| First Check-in | Claim a daily reward | 10 |
| Three-Day Streak | Play on 3 days in a row | 20 |
| Weekly Explorer | Play on 7 days in a row | 50 |
| Dedicated Player | Play on 14 different days | 60 |

**Adjusted to the real rules.** A chain reaction can release at most **two** arrows: only two red arrows can exist while a life is left, because the third mistake ends the level. "Clear 3 / 5 arrows in one chain" would be impossible, so they became Chain Reaction (one automatic release) and Double Chain (two in one move). A test searches the levels to prove a 2-arrow chain is reachable (from level 2 on) and a 3-arrow chain is not. Speed Runner only counts levels with 10+ arrows (levels 4–10), so the tutorial can't make it trivial.

- Progress is computed from data the game already saves (progress, statistics, daily record), plus the longest chain ever, which is recorded after every attempt (`longestChain` is now part of the game snapshot; the rules are unchanged).
- Each achievement unlocks **once**, and its credits are paid once. Replays never pay again.
- **Existing players** get what they've already earned the first time this version starts (for example First Escape if level 1 was completed before). Each is still paid only once.
- Unlocking shows a small notice at the bottom of the screen (several at once are combined into one) with a short sound and vibration. It never blocks play.

### How rewards are saved

All of this is **one** record, `neon-escape.rewards` (version 1), separate from the other saves:

```json
{ "version": 1,
  "daily": { "lastCheckIn": "2026-10-31", "streak": 3, "longestStreak": 5, "daysPlayed": 12,
             "lastClaim": "2026-10-31", "claims": 9, "claimedDays": ["2026-10-29", "2026-10-30", "2026-10-31"],
             "history": ["…", "2026-10-31"] },
  "wallet": { "credits": 245, "earned": 245, "applied": ["achievement:first-escape", "daily:2026-10-31"] },
  "achievements": { "first-escape": "2026-10-20" },
  "bestChain": 2 }
```

- **Atomic claims.** A claim, its credits and any achievement it completes are written in a single `localStorage.setItem`. There is never a moment where the claim is saved and the credits aren't, or the other way round. If the write fails, neither is saved.
- **No duplicate rewards.** Every credit has a transaction id (`daily:<date>`, `achievement:<id>`), and the wallet refuses an id it has already applied. On top of that, the daily record only lets claims move forward in time. So a double tap, a refresh, or a hand-edited daily record can't pay the same day twice, and an unlock record that gets lost doesn't pay an achievement twice. Daily ids are trimmed to the last 30; achievement ids are kept forever.
- **Validation** is the same as for the other saves (`SafeStore`). Every part is checked separately: bad dates, negative counters and unknown achievements are dropped or repaired, and a balance above what was ever earned is clamped. Corrupted data is backed up to `neon-escape.rewards.backup`, a save from a newer version is never overwritten, and without storage the rewards work for the session.
- **Migration:** this is the first version of the record. Existing progress, profile, statistics and settings keys are not touched (a test checks they are byte-for-byte unchanged).
- **Not tamper-proof.** `localStorage` is readable and writable by anyone with DevTools. These protections stop accidents and bugs, not deliberate editing. That is acceptable for an offline game with no real-money value, but it is the reason leagues will need a server.

### Dates and times

- A day is the **device-local calendar date** (`YYYY-MM-DD`), not a 24-hour interval and not the UTC date. Differences are counted in calendar days, so daylight-saving days (23 or 25 hours) and month and year ends behave correctly (all tested in a DST time zone).
- **This is an offline system using the device clock, which the player can change.** Moving the clock **back** is handled: no streak change and no reward for a date earlier than one already checked in or claimed; the calendar explains that rewards resume later. Moving the clock **forward** can't be detected offline.
- **Time zones:** only the local date matters. Flying west so that it is "yesterday" again counts as the clock moving back (nothing happens). Crossing the date line eastwards can skip a date and reset the streak.
- **New day while open:** one timer is set for the next local midnight (no polling), and the date is re-checked whenever the game becomes visible again, because timers don't run while a phone sleeps.

### Foundation for daily content (Step 10)

`src/daily/dayKey.ts` is the shared base for anything date-based: `dayKey()` (a stable daily id), `daysBetween()` / `addDays()`, `DayClock` (new-day detection), `doneOn()` / `recordDay()` (was it done today?), and a small `DailyObjective` interface for future daily goals. Daily challenges, Energy Points and leagues can reuse these without new date logic. No daily puzzles exist yet.

### Manual testing in Chrome

1. `npm run dev`, open http://localhost:5173 with device emulation (`Ctrl+Shift+M`).
2. **First day:** Home shows "1-day streak · Day 1 reward ready" and a green **Claim +10**. Tap it: the calendar opens with Day 1 highlighted. Claim: Day 1 pops and gets a check, "+10" floats up, the balance counts up, and "Achievement unlocked: First Check-in · +10" appears. Double-tapping Claim pays once.
3. **Refresh:** the claim and balance stay; Home says "Claimed today · Tomorrow +15".
4. **Next day:** in DevTools → Application → Local Storage, edit `neon-escape.rewards`: set `daily.lastCheckIn`, `daily.lastClaim` and the last `claimedDays` entry one day earlier (e.g. `2026-10-30`), then refresh. The streak becomes 2 and Day 2 (+15) is ready.
5. **Missed day:** move those dates two or more days back instead and refresh. The streak restarts at 1, the cycle at Day 1, and the balance is unchanged.
6. **Clock moved back:** set `lastCheckIn` to tomorrow's date and refresh. Nothing can be claimed and the calendar explains why.
7. **Achievements:** Home → Awards. Complete level 1 with 3 stars: First Escape and Perfect Run unlock once (replays don't repeat them). Tap two blocked arrows, then clear what blocks them, to see Chain Reaction or Double Chain (level 2 works well).
8. **Profile:** the "Daily & rewards" card shows credits, streaks and days played, and links to Achievements.
9. **Corruption:** set `neon-escape.rewards` to `{oops` and refresh. Rewards start fresh, the bad value is kept in `neon-escape.rewards.backup`, and levels, stars, times and settings are untouched.
10. **Preferences:** with Reduced motion on, claims show no pop or float; with Sound off, no sounds; with Vibration off, no pulses. In the Light theme the calendar and cards follow the theme.

## Daily League

After you complete **Level 10**, the **Daily League** opens: three challenges every day with collectible **Energy Arrows**, and a league tier that moves with your daily score. Before that, Home and the League screen show "Unlocks after Level 10" with your progress. No competition exists and no points can be earned while it is locked, and normal progression is unchanged.

### Energy Arrows

An Energy Arrow is an ordinary arrow with one extra property: in a Daily League challenge, removing it earns **1 Energy Point**.

- **Same rules:** it moves, blocks, turns red, chains and costs lives exactly like any other arrow. The rules never read the flag (`ArrowData.energy`), and a test plays the same taps on a challenge and its source level and gets identical results.
- **Look:** the arrow keeps its normal colour, gets a **gold core line** and a **gold diamond marker** on its body (behind the head, so the direction stays readable), and sends out a gold ring when it leaves. When it is tapped while blocked, it turns red and dashed like any activated arrow but keeps its gold diamond. Gold is never red, and it follows the themes (darker gold in Light).
- **When the point counts:** the moment the rules remove the arrow, whether you tapped it or a chain reaction released it, not when an animation ends. `GameState.onRemove` reports each removal; the league records it and saves immediately. The gold ring and the "zap" sound are only the visual and audio echo of that.

### Daily League challenges

- **Three a day**, labelled *Daily 1/3, 2/3, 3/3* (they are not numbered levels).
- **Layouts:** reused unchanged from the curated levels with 10+ arrows (levels 4–10). The date (`YYYY-MM-DD`) seeds a fixed generator that picks three different layouts (ordered by level, so challenge 1 is the easiest of the three) and four different arrows in each to be Energy Arrows. The same date always gives the same challenges; different dates almost always differ.
- **Ids** are stable: `2026-10-31:2:L6` = 31 Oct, challenge 2, layout of level 6. Each Energy Arrow is collected under `<challenge id>/<arrow id>`.
- **All four are always collectible**, because solving a level removes every arrow (tested for each challenge).
- **Gameplay** is the normal level screen: three lives, red arrows, chains, timer, restart, Game Over and retry. The HUD adds a gold strip: Energy Arrows collected in this challenge (0/4), your league, and today's points (0/12).
- **Completing** a challenge shows stars, time, Energy Arrows collected, newly earned points and today's total, with **Next challenge** (or **League**), **Restart** and **League**.
- **Separate records:** challenges never change level unlocks, stars, best times or the lifetime statistics on the Profile. Challenge numbers are tracked in the league record instead (challenges completed, Energy Points).
- **Layout pool:** levels with 10+ arrows on boards up to 11 columns × 15 rows (Levels 4–21 since the Step 14 full-coverage redesign, 18 layouts), so daily challenges stay quick and playable on a phone without zooming. The level generator is not used at runtime.
- **Game updates never change a day in progress.** Each competition day saves the pool version it started with (`CHALLENGE_POOLS` in `src/league/challenges.ts`). A day that began before this update (saved without a version) keeps the original pool (Levels 4–10) until midnight: the same three layouts and the same Energy Arrows. So arrows you already collected still count and can't be collected twice, and the daily maximum stays 12. The new pool applies from the next day. Likewise for redesigns: pool versions 1–3 draw only from frozen copies of the layouts they were defined on (`src/levels/archive/`: the revision-2 Levels 4–10, and Levels 4–20 as shipped in Step 12), never from the current levels. A day that began before an update keeps exactly its three layouts and Energy Arrow ids (a golden test, `src/league/pools.golden.json`, checks this). Pool 4 now draws from `src/levels/archive/step13/` (Levels 4–21 as shipped in Step 13, recovered verbatim from that build); the Step 14 layouts are pool 5.

### Energy Points and Energy Credits

| | Energy Points | Energy Credits |
| --- | --- | --- |
| Earned from | Energy Arrows in Daily League challenges | Daily rewards, achievements, league milestones |
| Resets | Every competition day | Never |
| Used for | League promotion and relegation | Kept for future cosmetics and hints (no shop yet) |
| Stored in | `neon-escape.league` | `neon-escape.rewards` (wallet) |

They are never converted into each other.

### Points per day

- Up to **12** a day (3 challenges × 4 Energy Arrows).
- Each Energy Arrow pays **once per challenge per day**. Replays, restarts and Game Over keep what you've collected and never pay the same arrow again.
- Points belong to the day of the challenge. If midnight passes during a challenge, it stops earning (a short notice says so) and today's challenges are new.

### League tiers and targets

The targets are **personal and offline**. They compare your own score with fixed numbers, **not with other players**. There are no other players, rankings or leaderboards yet.

| League | Promote if the day's score is at least | Relegate if a played day's score is below |
| --- | --- | --- |
| Bronze | 5 | never |
| Silver | 7 | 2 |
| Gold | 9 | 3 |
| Platinum | 10 | 4 |
| Diamond | 11 | 5 |
| Neon Elite | top league | 6 |

All numbers live in `src/league/leagues.ts` for later balancing. Everyone starts in Bronze. Each league has an original vector crest (one chevron per tier above Bronze, a bolt for Neon Elite). The league is independent of the cosmetic star rank (Rookie … Grid Master), which is unchanged.

- **Promotion** (score ≥ target) moves up one league; otherwise **relegation** (score < threshold) moves down one; anything in between keeps the league.
- At most **one league change per day**. Bronze can't drop and Neon Elite can't rise.

### Taking part and inactivity

- You **take part** in a day by earning at least 1 Energy Point. That day is scored with the table above.
- A day **without points**, whether the game was opened or not, is an **inactive day**.
- **Protected day:** the first inactive day in a row (after a day with points, or after the league opened) changes nothing.
- Each **further consecutive inactive day** moves you down one league, never below Bronze. Earning a point resets the count, so the next missed day is protected again.

**Example:** in Gold, you skip Monday (protected, still Gold) and Tuesday (moved to Silver). On Wednesday you score 3: Silver kept, and the protection is back.

### Daily settlement

- A competition belongs to one **local calendar date** (the same `dayKey` as daily rewards). A new one starts when the date changes.
- The previous day is **settled the next time the game runs**: at start, on return from the background, or when midnight passes while it's open (`DayClock`). The app never has to be open at midnight.
- **Several days away** are settled at once: the last played day is scored, then the missed days are applied with the protection rule. A run of missed days is one history entry ("3 days · No points").
- **Idempotent:** settling again on the same day (refresh, reopen) changes nothing. Points never carry over: each new day starts at 0.
- **Clock moved back** to before the last day seen: nothing is settled and no points can be earned until that date has passed (the League screen explains this). **Clock moved forward** can't be detected offline and counts as missed days. Month and year ends and daylight-saving days are ordinary single days (tested).

### Results

After settlement, what changed is shown **once**:
- **Promotion:** a dialog with the new crest, a short rise animation, a fanfare and a vibration (all following the motion, sound and vibration settings).
- **Moving down:** a neutral dialog ("Now in Silver … earn points to climb back").
- **League kept:** a short toast only.
- Several settled days are **summarised in one message**. It never interrupts a level. Dismissing it records that it was seen, so it never shows again.

### League screen

Open it from the **league card on Home** (badge, today's points and the next target, or the locked progress). It shows:
- your crest, league and today's points;
- a **progress bar** from 0 to 12 with the promotion and relegation marks, and what you still need;
- challenges completed (0/3) and Energy Arrows collected (0/12);
- the **three challenge cards** with Play / Continue / Replay, gold pips for collected arrows, and a check when done;
- the rules and the full targets table (your league highlighted);
- the **last 10 days**: date, points, outcome and any league change.

The **Profile** has a Daily League card: current and highest league, lifetime Energy Points, challenges completed, promotions and relegations.

### League credits

Modest Energy Credits for milestones (configurable in `LEAGUE_REWARDS`):

| Milestone | Credits | Paid |
| --- | --- | --- |
| First promotion | 25 | once ever |
| First time reaching Silver / Gold / Platinum / Diamond / Neon Elite | 20 / 30 / 40 / 50 / 75 | once per league, ever: dropping and climbing back pays nothing |
| All three challenges in one day | 15 | once per date |

### How league data is saved

`neon-escape.league` (version 1) is separate from every other save:

```json
{ "version": 1, "tier": 1, "highestTier": 2, "inactiveStreak": 0, "lastDay": "2026-10-31",
  "current": { "date": "2026-10-31", "startTier": 1, "completed": [1],
               "collected": ["2026-10-31:1:L4/a", "2026-10-31:1:L4/b"], "sweepRewarded": false },
  "history": [{ "date": "2026-10-30", "days": 1, "points": 7, "challenges": 2,
                "startTier": 0, "endTier": 1, "outcome": "promoted" }],
  "lifetime": { "points": 41, "promotions": 2, "relegations": 1, "challengesCompleted": 9 },
  "milestones": ["league:first-promotion", "league:highest:silver"],
  "outbox": [], "notice": null }
```

- **Every point is saved immediately**, in the same write as the collection key that prevents paying it twice. Settlement writes the settled history, the new day and the result in one write.
- **Credits cross two records safely.** The league can't write the wallet in the same `setItem`, so it uses an **outbox**:
  1. The league saves the owed transaction (with a stable id such as `league:first-promotion`).
  2. The wallet applies it, refusing ids it has already applied.
  3. Only then is it removed from the outbox.

  If the app stops between the steps, the next start finishes the delivery, and the credit is never lost or paid twice (tested with a simulated crash).
- **Validation** is the same as for every save (`SafeStore`): bad tiers, dates, counts, keys and transactions are dropped or repaired, the daily score is capped at 12, corrupted data is backed up to `neon-escape.league.backup`, a save from a newer version is never overwritten, and without storage the league works for the session.
- **Nothing else is touched:** level progress, stars, best times, profile, statistics, settings, daily check-ins, achievements and existing credits (tested).
- **Not tamper-proof:** as with all local saves, anyone can edit `localStorage`, and the device clock can be changed. Fair competition between real players will need a server.

### Testing the league manually in Chrome

Back up your save first, and restore it afterwards, so testing never mixes with your real progress. In the DevTools console:

```js
// Back up every NEON ESCAPE key (survives reloads in this tab).
sessionStorage.setItem('neon-backup', JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('neon-escape')).map(k => [k, localStorage.getItem(k)]))));
```

1. **Unlock for testing:** mark levels 1–10 as completed, then reload. Home shows a Bronze league card.
   ```js
   const completed = {}; for (let i = 1; i <= 10; i++) completed[i] = { bestMoves: 10, revision: 1, bestStars: 2, bestMistakes: 1, bestTimeMs: 60000 };
   localStorage.setItem('neon-escape.progress', JSON.stringify({ version: 4, highestUnlocked: 10, completed })); location.reload();
   ```
2. **Play:** Home → league card → Challenge 1. Gold-marked arrows are Energy Arrows. Clear one: the HUD shows 1/4 and Today 1/12. Restart: the count stays. Lose all lives: the points stay. Finish: the dialog shows the Energy Arrows and new points. Replay: "+0 new points".
3. **Chain collection:** tap a blocked Energy Arrow (it turns red and dashed, keeping its gold diamond), clear what blocks it, and it leaves by itself and still counts.
4. **Next day / promotion:** move today's competition back one day, then reload. With 5+ points in Bronze you get "Promoted to Silver!", +45 credits (first promotion + Silver), and a history entry. Reload again: no repeat.
   ```js
   const r = JSON.parse(localStorage.getItem('neon-escape.league')); const y = '2026-10-30'; // the day before today
   r.lastDay = y; r.current = { ...r.current, date: y, collected: ['a','b','c','d','e','f'].map(id => `${y}:1:L4/${id}`) };
   localStorage.setItem('neon-escape.league', JSON.stringify(r)); location.reload();
   ```
5. **Missed days:** set `lastDay` and `current.date` three or more days back with `collected: []`, then reload. The first day is protected and each later one moves you down, with a single summary.
6. **Clock moved back:** set `lastDay` and `current.date` to tomorrow, then reload. The League screen explains that points resume later.
7. **Restore your real data:**
   ```js
   const b = JSON.parse(sessionStorage.getItem('neon-backup')); Object.keys(localStorage).filter(k => k.startsWith('neon-escape')).forEach(k => localStorage.removeItem(k)); Object.entries(b).forEach(([k, v]) => localStorage.setItem(k, v)); location.reload();
   ```

## Studio splash and player recap

**Mr. White Games splash.** The studio mark is an original design: an **M** and its mirror image, a **W**, across a dotted line (the reflection reads as "Mr. White"; the dots echo the board). It is one SVG symbol, `#mw-mark` in `index.html`, reused by the splash and the Settings → Information "Studio" row.

- The splash markup is in `index.html`, so it is on screen from the first paint, on the studio dark (`#101522`) in every theme. `src/branding/StudioSplash.ts` times it with `DEFAULT_SPLASH_TIMING` (configurable): a **1.3 s reveal** (the M and W draw in, the name fades in), a **1.7 s hold** with one soft glow so "Mr. White Games" can be read, and a **0.7 s fade-out**: about **3.7 s** in all. Once the logo has fully appeared, a small "Tap to skip" hint shows and a tap ends the intro with a 0.25 s fade; taps during the reveal are ignored. With reduced motion the finished logo appears at once, stays 2.4 s (skippable at once) and is removed without drawing, glow, scale or fade.
- **Once per cold launch.** A `sessionStorage` flag is set when it plays and checked by the inline script before the first paint. Android resume never reloads the page; a reload in the same session or WebView skips it too; a new app process starts with empty session storage.
- **No double splash** on Android: the native launch window is a plain colour (see "Android app").

**Player recap.** After the splash, if **Player recap** is on (Settings → Gameplay, default on), one card shows a single fact from your own saved records, with **Continue** and **Skip** (both go to Home; Back counts as Skip). Each cold launch shows the next fact in a fixed rotation (`src/recap/insights.ts`), skipping any that your records don't support yet. A new player with no records goes straight to Home. League results wait until the intro is over.

- Facts: last 7 days (levels cleared, play time, days played), yesterday, level progress and next level, stars and perfect levels, best time on your highest completed level, daily streak, flawless clears, arrows escaped, chain-reaction releases, total play time.
- Only real saved data: lifetime numbers say "since <date>" (when statistics tracking started). Best times from an older layout of a redesigned level are not used. There is no data about other players and no comparison with them.
- **Daily tracking** (`src/recap/DailyLog.ts`, key `neon-escape.daily-stats`): the same attempts and play time that update the lifetime statistics are also split by the local calendar day they end on (Daily League challenges are excluded, as for statistics). Tracking starts on the first launch with this version and remembers that day, so a weekly summary appears only once all seven days were tracked. The newest 35 days are kept, ready for future weekly summaries.

## Large boards: thin arrows, zoom and touch

The game supports boards from 7×7 up to 20×20. Nothing in the rules, validation, rendering or level format assumes a size, and boards up to 20×20 are covered by tests. The permanent levels go up to 16×16; larger boards are possible but become hard to read on a phone.

### Adaptive arrow thickness

Arrows are drawn in proportion to the cell, and the proportions change with the board (`src/render/arrowStyle.ts`):

| Board | Look |
| --- | --- |
| Up to 9×9 | The original thick neon tubes: two halo rings, bright core line, large notched heads |
| 10×10 to 15×15 | Gradually thinner bodies, fainter glow, more compact heads |
| 16×16 and up | Clean thin paths, one faint ring, small but clear arrowheads |

- **Maximum thickness on screen:** on large cells (Levels 1–3 on a phone, any level on a tablet) the body is capped at 9 CSS px. Halo and core shrink with it; the head shrinks only half as much, so it stays clearly an arrow. Corner arcs get more segments on large cells (about one per 4 px), and WebGL multisampled anti-aliasing is requested explicitly. Tip position, corners and hit testing are unchanged.
- **Minimum sizes on screen:** bodies are never thinner than 2.5 CSS px and heads never narrower than 4 CSS px (capped at 30% of a cell, so neighbours never touch). The core line is dropped when it would be thinner than a pixel.
- **Device pixel density** is taken into account: the canvas renders at device resolution and the minimums are in CSS pixels.
- **What stays the same:** colours, rounded turns, themes, the gold Energy Arrow diamond (never smaller than the body) and the red dashed look of activated arrows.
- The style is recomputed when the board size or the screen changes. Rules and collisions don't depend on it.

### Touch: thin arrows stay easy to tap

What you can tap is separate from what is drawn (`src/render/hitTest.ts`):

1. A tap inside a cell an arrow occupies always selects that arrow.
2. Otherwise the nearest arrow body counts if it is within a fingertip-sized radius: at least 22 CSS px on screen (about a 44 px target), at most 1.2 cells.
3. If two arrows are about equally close (within 0.15 cell or 4 px), **nothing is selected**. A missed tap is better than moving the wrong arrow and losing a life. Tap again, or zoom in.

Press-and-release is unchanged: an arrow lights up while your finger is on it, the move happens on release, and sliding away cancels it.

### Zoom and pan

Boards whose cells are smaller than about 44 CSS px on your screen can be zoomed (`src/render/viewport.ts`, `src/render/gestures.ts`). Smaller boards are unaffected.

| Action | Phone | Desktop |
| --- | --- | --- |
| Zoom | Pinch with two fingers | Mouse wheel |
| Move around | Drag one finger (while zoomed) | Drag (while zoomed) |
| Back to the whole board | The **Reset zoom** button in the board's corner | Same |

- **Limits:** from the fitted view up to the zoom where cells are about 44 CSS px, at most 4×. The board can't be dragged out of view.
- **Two-finger gestures never move arrows.** A second finger cancels the press, and nothing is pressed again until all fingers are lifted. A drag that becomes a pan (10 px) also cancels the press.
- **While zoomed** the board is drawn only inside its area, so it doesn't run under the HUD.
- **When the view resets:** Restart keeps your zoom (same board). A new level, leaving the level, rotating the phone or resizing the window fits the board again.
- A one-time tip ("pinch (or scroll) to zoom, drag to move") appears on the first zoomable board.
- Taps are mapped from the screen through the zoom, so they hit the same arrow at any zoom (tested).

### Performance

Phaser rebuilds the triangles of every `Graphics` object on every frame, whether it changed or not. That, not the moving arrow, was the cost: each arrow drew a filled circle (100 segments) at every point of its path, in three or four glow layers, and the grid dots were 100-segment circles too. Step 14 changed this:

- **Resting arrows are cached** (`src/render/StaticArrowLayer.ts`): all arrows at rest are drawn into one render texture and their `Graphics` are hidden, so the board costs one textured quad per frame. Arrows that move, flash, are pressed or tweened stay live vectors on top. The cache is rebuilt only when that set changes, a resting arrow changes look (theme, red state) or the board moves, and after zooming it is re-rendered at the new resolution (up to 2×, at most 2048 px) once the zoom settles.
- **Cheaper geometry:** a body is one joined stroke with small triangle-fan caps (no circle per vertex); heads and Energy diamonds are triangles (no polygon triangulation); grid dots and sparks are 8-sided fans; rings are reused 32-point strokes.
- **No allocations per frame:** a moving arrow's path is measured once (`MeasuredPolyline`), and each frame's shaft, trail and dash pieces are cut into reused point buffers.
- **Less glow in motion:** a moving arrow drops its faint outer halo ring (invisible at speed); resting arrows keep the full look.
- Animations are tween- and delta-time-based (Phaser tweens; sparks use the frame delta, clamped), so a slow frame never changes their speed or length. The canvas still renders at the device pixel ratio (up to 3×) for sharp arrows.

Measured in desktop Chrome with a phone-sized canvas (375 × 812 CSS px at 2×), CPU time per frame (update + render, from `game.step`):

| Level | Arrows | Before, idle | After, idle | After, 5 long arrows leaving |
| --- | --- | --- | --- | --- |
| 3 | 7 | 5.9 ms | 0.05 ms | 0.3 ms |
| 18 | 33 | 37.0 ms | 0.11 ms | 0.4 ms |
| 30 | 40 | 37.8 ms | 0.13 ms | 0.35 ms |

Before, Levels 18 and 30 could not reach 60 fps even on a desktop CPU; after, all three hold 60 fps in that browser with a large margin. These are desktop numbers: **phone performance has not been verified** on a real device.

- **Diagnostics overlay for real devices:** in Settings, tap **Version** five times. The line at the bottom shows fps, then the average and worst frame interval over the last half second, the share of frames slower than 20 ms, and the CPU time per frame, then arrows, grid size, zoom and the vibration backend. Tap five times again to hide it. To compare, open Levels 3, 18 and 30 and watch it at rest and while releasing long arrows.
- **Known limits:** the difficulty and lives analysis run offline only (never in the game). At zoom above 2× the cached arrows are slightly soft until an arrow is touched.

## Levels

Thirty levels. **Levels 1–3** are the small square tutorials (unchanged since Step 12). **Levels 4–30** are tall portrait boards, redesigned in Step 14 for **full coverage**: the board starts almost completely filled with arrow paths.

- **Coverage:** 100 % of cells on 26 of the 27 levels and 99.5 % on Level 29 (one stranded cell), up from 74–79 % in Step 13. The tests require at least 97 % on every level, no empty 2×2 area anywhere, and full coverage on at least 90 % of the levels.
- **How:** the fill-first generator (`src/levelgen/fillLevel.ts`) covers the whole board with long, winding, non-touching paths first (always extending into the most constrained free cell, at most 4 cells straight before a turn), picks a head for each path (mostly pointing into the board), then repairs: while some arrows block each other in a cycle, or two arrows read as one, it flips a head or splits an arrow. Short leftovers are merged into neighbours where the level stays solvable. The older place-one-arrow-at-a-time generator stalls at about 75 %, because every new arrow needs an empty exit line.
- **Is 100 % always possible?** Yes, under these rules: an arrow on the edge pointing out is free, so a fully covered board can still be solved from the outside in. The only cost is a few 2-cell arrows where a path had to be split (at most 12 % of arrows per level, never a single-cell arrow).
- **Long arrows:** about 5 cells on average; most bend, many several times.
- **A gradual curve with spikes at 10, 20 and 30:** the score never drops between spikes; each spike is at least 3 points above the level before, has a deeper dependency chain and only 2–3 free arrows; the next level drops back.
- **Distinct and readable:** valid, solvable, no overlaps, no arrow that runs alongside itself or reads as two joined arrows, and no near-duplicates (including mirror images and rotations).

Revisions: Levels 4–10 are now revision 5 and Levels 11–30 revision 3, so your completions, unlocks, stars and times are kept, and old bests aren't compared with the new layouts (see "Saved data"). More detail is in [docs/level-analysis.md](docs/level-analysis.md) (section 9).

| Level | Grid (rows × cols) | Arrows | Coverage | Mean length | Free at start | Depth | Score | Note |
| ----- | ---- | ------ | ---- | ---- | ------------- | ----- | ----- | ---- |
| 1 | 7×7 | 5 | 27% | 2.6 | 3 | 2 | 14 | Tutorial |
| 2 | 7×7 | 6 | 35% | 2.8 | 3 | 3 | 20 | Straight arrows, a three-arrow chain |
| 3 | 7×7 | 7 | 45% | 3.1 | 3 | 4 | 29 | First bent arrows and decoys |
| 4 | 9×7 | 12 | 100% | 5.3 | 3 | 4 | 40 | First full board |
| 5 | 10×7 | 14 | 100% | 5.0 | 2 | 5 | 43 | |
| 6 | 10×8 | 14 | 100% | 5.7 | 3 | 5 | 46 | |
| 7 | 11×8 | 17 | 100% | 5.2 | 4 | 6 | 50 | |
| 8 | 11×8 | 18 | 100% | 4.9 | 3 | 7 | 52 | |
| 9 | 12×9 | 19 | 100% | 5.7 | 2 | 8 | 54 | |
| 10 | 12×9 | 19 | 100% | 5.7 | 3 | 13 | 62 | **Spike** |
| 11 | 12×9 | 23 | 100% | 4.7 | 4 | 9 | 56 | Back on the curve |
| 12 | 13×9 | 21 | 100% | 5.6 | 3 | 9 | 57 | |
| 13 | 13×10 | 24 | 100% | 5.4 | 5 | 9 | 57 | |
| 14 | 13×10 | 24 | 100% | 5.4 | 5 | 11 | 59 | |
| 15 | 14×10 | 27 | 100% | 5.2 | 5 | 10 | 60 | |
| 16 | 14×10 | 27 | 100% | 5.2 | 6 | 11 | 61 | |
| 17 | 14×11 | 33 | 100% | 4.7 | 6 | 10 | 62 | |
| 18 | 15×11 | 33 | 100% | 5.0 | 6 | 11 | 63 | |
| 19 | 15×11 | 29 | 100% | 5.7 | 3 | 13 | 64 | |
| 20 | 15×11 | 29 | 100% | 5.7 | 2 | 15 | 68 | **Spike** |
| 21 | 15×11 | 33 | 100% | 5.0 | 6 | 11 | 64 | Back on the curve |
| 22 | 15×12 | 27 | 100% | 6.7 | 5 | 11 | 64 | |
| 23 | 16×12 | 36 | 100% | 5.3 | 4 | 11 | 65 | |
| 24 | 16×12 | 33 | 100% | 5.8 | 4 | 10 | 65 | |
| 25 | 16×12 | 36 | 100% | 5.3 | 5 | 13 | 66 | |
| 26 | 16×12 | 34 | 100% | 5.6 | 7 | 14 | 67 | |
| 27 | 17×12 | 39 | 100% | 5.2 | 8 | 16 | 68 | |
| 28 | 17×12 | 37 | 100% | 5.5 | 8 | 15 | 68 | |
| 29 | 17×12 | 39 | 99.5% | 5.2 | 5 | 14 | 68 | |
| 30 | 17×12 | 40 | 100% | 5.1 | 2 | 18 | 73 | **Spike:** the final challenge |

**Limitation:** the 0–100 score saturates in the high 60s, so late levels differ more in depth and board size than in score. On a full board an arrow can only start free if its head is on the edge pointing out, so openings are clear to read; the difficulty comes from the dependency depth.

**Progression:** players keep every unlock, star and best time. Records made on the old layouts stay visible, and the first clear of a new layout starts fresh records for it.

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
├── capacitor.config.json  Android app id, name and web folder (Capacitor)
├── android/               Native Android project (Capacitor); MainActivity.java = immersive full screen
├── scripts/android-apk.mjs Debug APK build used by `npm run android:apk`
├── tools/level-plan.json  How Levels 11–30 were generated (`npm run levels:plan`)
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
    │   ├── Intro.ts       Startup sequence: studio splash, then the optional recap, then Home
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
    │   ├── archive/           Frozen older layouts for old Daily League pool versions (never edit)
    │   └── level01.ts … level30.ts
    │
    ├── levelgen/          Offline level generator (developer tool, not in the game bundle)
    │   ├── generateLevel.ts   Seeded generation, refinement, layout similarity
    │   └── fillLevel.ts       Fill-first generator: full-coverage boards made solvable (Levels 4–30)
    │
    ├── daily/             Calendar-day logic, shared by daily features
    │   ├── dayKey.ts          Local day ids, day arithmetic, DayClock (new-day detection), daily objectives
    │   └── Daily.ts           Check-in, streaks, 7-day reward cycle, claims, calendar view
    │
    ├── league/            Daily League (rules only, no Phaser or DOM)
    │   ├── leagues.ts         Tiers, thresholds, inactivity and credit configuration, crest SVG
    │   ├── challenges.ts      Deterministic daily challenges and Energy Arrow placement
    │   ├── League.ts          Collection, completion, settlement, inactivity, validation (pure)
    │   └── LeagueService.ts   Saved record, settlement calls, credit outbox
    │
    ├── branding/
    │   └── StudioSplash.ts    Mr. White Games splash timing, once per cold launch (markup and mark in index.html)
    │
    ├── recap/             Startup recap (rules only, no DOM)
    │   ├── DailyLog.ts        Per-day play statistics, storage, 7-day summaries
    │   └── insights.ts        Facts from the player's own records, rotation, rotation storage
    │
    ├── rewards/           Energy Credits and achievements
    │   ├── Rewards.ts         One saved record (daily + wallet + achievements); atomic claims
    │   ├── Wallet.ts          Energy Credits: validated, de-duplicated transactions
    │   ├── Achievements.ts    The 12 achievements and their progress
    │   └── chainFeasibility.ts Proves chain achievements are reachable (used by tests)
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
    ├── native/
    │   └── nativeApp.ts       Android app only: Back button, pause/resume, native vibration via NeonHaptics (no-op in browsers)
    │
    ├── storage/
    │   └── SafeStore.ts       One versioned localStorage record: backups, newer-save protection
    │
    ├── progress/          Progression, independent of rendering and game rules
    │   ├── Progress.ts        Unlock/complete rules (pure functions)
    │   ├── ProgressStorage.ts localStorage save format, migration, backups and safe loading
    │   └── testUnlock.ts      TESTING flag: every level playable, test plays never recorded
    │
    ├── render/            Phaser drawing, no game rules
    │   ├── theme.ts           Semantic board palettes per theme, contrast helpers
    │   ├── arrowStyle.ts      Adaptive arrow proportions by board size and screen density
    │   ├── hitTest.ts         Which arrow a tap means (fingertip tolerance, no guessing on ties)
    │   ├── viewport.ts        Zoom/pan transform for large boards
    │   ├── gestures.ts        Press, release, pan and pinch from raw pointers
    │   ├── layout.ts          Board geometry fitted into the board slot, grid bounds, pixel ↔ cell mapping
    │   ├── boardFit.ts        Board slot size for any grid shape (tall portrait boards), no Phaser
    │   ├── polyline.ts        Polyline length, slicing and point distance (animation, hit testing)
    │   ├── BoardRenderer.ts   Borderless board: one dot per cell; entrance, win and failure waves
    │   ├── ArrowView.ts       Draws one arrow (rounded turns, notched head); press, intro, exit, blocked, hit
    │   ├── FxLayer.ts         Pooled sparks and rings on one Graphics object
    │   ├── StaticArrowLayer.ts Resting arrows cached in one render texture (performance)
    │   └── motion.ts          Resolved reduced-motion and effects preferences
    │
    ├── scenes/
    │   ├── GameScene.ts   Turns input into moves and move results into animations; loads levels
    │   └── MoveSequencer.ts Plays one action's animations in order; input lock with cancel tokens
    │
    └── ui/                DOM views, no game rules
        ├── Screens.ts         Switches between Home, Levels, Game, Profile, Settings, Achievements and League
        ├── DailyDialog.ts     Daily rewards calendar and claim animation
        ├── LeagueScreen.ts    League standing, progress, challenges, rules, history
        ├── LeagueResultDialog.ts Promotion / relegation result, shown once
        ├── AchievementsScreen.ts Achievement cards, progress and summary
        ├── SettingsScreen.ts  Settings controls (switches, segmented controls, sliders)
        ├── HomeScreen.ts      Start screen: identity, next level, progress, menu
        ├── ProfileScreen.ts   Identity, summary, statistics, daily & rewards, personal records, nickname editing
        ├── Pickers.ts         Avatar grid and searchable country list
        ├── Toast.ts           Short notices (achievement unlocked, settings reset)
        ├── GameLayout.ts      Sizes the board slot so the HUD and board form one centred group
        ├── LevelSelect.ts     Level tiles and progress summary
        ├── Hud.ts             In-game timer, hearts, arrows left, back and restart buttons
        ├── ThemePicker.ts     HUD palette button and compact theme card (pauses the timer)
        ├── RecapDialog.ts     Startup recap card with Continue and Skip
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
| Error | red `#FF526B` | activated (red) arrows, the Game Over dialog, the board's dots on failure |

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
| `--bend P` | 0.35 | Chance of turning at each step (0..1): higher gives more winding arrows |
| `--budget N` | 1200 | Most difficulty analyses per level: bounds the run time, deterministically |
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

### Generator improvements (Step 11)

- **Large grids:** arrows past the 52nd get letter+digit labels (`a0`, `b0`, …, up to 572 arrows), and the text map widens its columns.
- **Denser boards:** half the candidate arrows are now built from the head backwards, from a cell whose exit line is already clear, so crowded boards still find room. Candidates per arrow scale with the board size.
- **Shapes:** long straight arrows, L-shapes, wide U-shapes and winding paths with several bends. A real readability rule replaces the old "never two turns in a row": an arrow may never run alongside an earlier part of itself (`isSelfTouching`), so tight U's and spirals that read as blobs are rejected. Wide ones are allowed.
- **Openings:** `maxInitialFree` caps how many arrows are free at the start, so large boards don't open with a dozen easy moves.
- **Bounded:** `workBudget` limits the expensive difficulty analyses (deterministic, unlike a time limit). A 16×16 level takes 1–4 s.
- **Reproducible:** same options and seed give the same level (tested on large grids too).

### Generating a series: `levels:plan`

`tools/level-plan.json` lists each planned level: `rows` and `cols` (or `size` for a square board), arrow range, longest and shortest arrow (`length`, `minLength`), preference for long arrows (`lengthWeight`), turns, bend chance, score range, depth range, opening cap (`maxFree`), layout targets (`minDensity`, `maxEmptySquare`), the `revision` to write, and seeds. `--only 10,20` regenerates just those ids. `npm run levels:plan` generates the listed levels in order, each avoiding near-duplicates of every level before it. For each, the first seed that produces an acceptable level wins, and it writes `src/levels/levelNN.ts`. Levels already in the game are skipped unless you pass `--force`. Levels 4–30 were made this way in Step 14 with `"fill": true` (about 40 s) and then reviewed; the plan file documents exactly how. In fill mode the plan uses `src/levelgen/fillLevel.ts` (see "Levels") and also accepts `minCoverage`, `minMeanLength`, `maxShortShare`, `maxStraight` and `attempts`. The plan that produced the earlier Levels 11–30 is kept in `tools/archive/level-plan-step11.json`. Because each level avoids near-duplicates of the levels present when it is generated, rerunning a plan from scratch can pick different seeds.

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

Release signing and store publishing, a custom app icon and splash screen, in-game level generation (the generator is an offline developer tool), hints, power-ups, a shop, online leagues or leaderboards, accounts, ads and monetisation are intentionally left out. Energy Credits cannot be bought.

**About scoring:** the star rating (lives left) is the measure of skill. The move counter is kept for compatibility. It counts arrows you cleared by tapping, so it equals the arrow count minus chain-reaction releases, and it isn't used for ratings.
