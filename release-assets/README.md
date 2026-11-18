# NEON ESCAPE — release assets (Google Play, 1.0.0)

Everything here is ready to upload unless marked ⚠. Nothing has been uploaded.

| File | Play Console field | Spec (Google Play) | This file |
| --- | --- | --- | --- |
| `graphics/icon-512.png` | App icon | 512 × 512 PNG, ≤ 1 MB; Play applies the rounded mask | 512 × 512, 24-bit RGB (opaque), 113 KB. Launcher-icon artwork, full-bleed |
| `graphics/feature-graphic-1024x500.png` | Feature graphic | 1024 × 500 JPEG or 24-bit PNG, no transparency | 1024 × 500, 24-bit RGB, 233 KB |
| `screenshots/phone/01…08-*.png` | Phone screenshots (2–8) | JPEG or 24-bit PNG, 320–3840 px per side, long side ≤ 2× short side | 8 × 1080 × 1920 (9:16), 24-bit RGB, 250–430 KB each |
| `privacy-policy/index.html` | Privacy policy (link) | Public HTTPS URL | ⚠ Static page ready; fill `[CONTACT EMAIL]` / `[DATE OF PUBLICATION]`, then host it |
| `app-ads.txt.template` | (developer website) | `app-ads.txt` at the website root | ⚠ Template; needs your AdMob publisher ID and a website |
| `source/level30-board.png` | — | — | Source crop used by the feature graphic |

## Screenshots (all real)

Captured on the Android emulator (Android 17, API 37) from the **release build** (versionName
1.0.0) at 1080 × 1920, English, Dark Neon theme unless noted. The game state is real test
progress on the emulator; nothing was edited or composited.

| # | File | Shows |
| --- | --- | --- |
| 1 | `01-home-journey.png` | Home: the journey map with level 30 next, Continue button, dock |
| 2 | `02-level-30.png` | Level 30 (hard) at the start: 32 arrows, hearts, streak pips, boosters |
| 3 | `03-level-complete.png` | Level 1 replayed for real: 3 stars, flawless, new best time |
| 4 | `04-colorful-theme.png` | Level 30 in the Colorful theme |
| 5 | `05-daily-challenge.png` | Daily League challenge 1/3 with gold Energy Arrow markers |
| 6 | `06-daily-league.png` | Daily League: current league, rules, progress, challenges |
| 7 | `07-achievements.png` | Achievements list (13/65 at capture time) |
| 8 | `08-shop.png` | Shop: Energy Credits, rewarded-ad offer, avatar frames |

The Profile screen was left out on purpose: the emulator's test data mixes saves from older
test builds, so its statistics don't match the level count shown.

⚠ Optional, not prepared: 7" / 10" tablet screenshots (only needed to be featured on tablets),
Chromebook screenshots, a promo video (YouTube URL), translated screenshots for es/ro.

## Regenerating

- Icon and feature graphic: `python scripts/store-graphics.py` (needs Pillow and Edge/Chrome).
- Screenshots: Android emulator, `adb shell wm size 1080x1920` + `adb shell wm density 420`,
  then `adb exec-out screencap -p > file.png`, and reset with `wm size reset` / `wm density reset`.
