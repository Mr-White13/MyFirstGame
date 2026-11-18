# NEON ESCAPE 1.0.0 — Google Play submission checklist

Status legend: ✅ done and verified · 🟡 ready, needs your review · ⛔ BLOCKED (needs you / an
external account) · ⬜ to do in Play Console.

Related files: [GOOGLE_PLAY_RELEASE.md](GOOGLE_PLAY_RELEASE.md) (technical guide) ·
[GOOGLE_PLAY_LISTING.md](GOOGLE_PLAY_LISTING.md) (store texts) ·
[PLAY_CONSOLE_DECLARATIONS.md](PLAY_CONSOLE_DECLARATIONS.md) (App content answers) ·
[PRIVACY_POLICY.md](PRIVACY_POLICY.md) · [release-assets/](release-assets/README.md).

## 1. Completed

| | Item | Evidence |
| --- | --- | --- |
| ✅ | Permanent application id `com.mrwhitegames.neonescape` | AAB manifest (aapt2) |
| ✅ | versionName 1.0.0 / versionCode 1, targetSdk 36, minSdk 24, not debuggable | AAB manifest (aapt2), `aapt dump badging` on the release APK |
| ✅ | Release AAB builds (`npm run android:bundle`), 7.2 MB, no native libraries | Gradle `bundleRelease` |
| ✅ | Signing pipeline: Gradle reads `android/keystore.properties` or env vars; script `npm run android:upload-key` creates the key outside the repo, never overwrites, never prints the password | End-to-end test with a throwaway key: AAB "jar verified", signer CN=Mr. White Games; throwaway key deleted |
| ✅ | Secrets excluded from Git (`keystore.properties`, `*.jks`, `*.keystore`, `*.p12`, `*.pem`) | `git check-ignore` |
| ✅ | Test ads in every non-production build; production-ads build refuses to run without real IDs; test-device IDs supported; ads SDK pinned (25.4.0, UMP 4.0.0) | Unit tests, Vite and Gradle guards run |
| ✅ | Rewarded ad end to end (Google test ad): tap → ad → "Reward granted" → closed with ✕ → exactly +30 credits, daily count 5 → 4 | Emulator, release build |
| ✅ | Offline: no ad, no credits, no crash | Emulator, airplane mode |
| ✅ | Level-unlock test mode and DevTools globals absent from the production bundle | Built bundle (`DEV:false, PROD:true`, no unlock flag) |
| ✅ | 100 levels valid and solvable, ids 1–100, no duplicate layouts | `npm run levels:validate`, one-off check |
| ✅ | Update keeps saves (release installed over an older build) | Emulator |
| ✅ | Back, background/resume, portrait, immersive + cutouts, 7 screen sizes (320 px phone → 1024 px tablet), English/Spanish/Romanian | Emulator (earlier in this release cycle) |
| ✅ | Performance sample (level 30): 0.47 % janky frames, ~144 MB PSS, no crash/ANR in logcat | `dumpsys gfxinfo` / `meminfo` on the emulator |
| 🟡 | Store listing en / es / ro, within character limits | `GOOGLE_PLAY_LISTING.md` |
| 🟡 | Privacy policy (Markdown + static HTML) | `PRIVACY_POLICY.md`, `release-assets/privacy-policy/index.html` |
| 🟡 | Data safety, ads, advertising ID, app access, content rating draft answers | `PLAY_CONSOLE_DECLARATIONS.md` |
| ✅ | 512 icon, 1024×500 feature graphic, 8 real phone screenshots (1080×1920) | `release-assets/` |
| 🟡 | app-ads.txt template | `release-assets/app-ads.txt.template` |

## 2. Remaining blockers (priority order)

| # | Status | What | How |
| --- | --- | --- | --- |
| 1 | ⛔ | **Upload key** → signed AAB | Run `npm run android:upload-key` (section 3), back up the key, then `npm run android:bundle` must print **SIGNED** |
| 2 | ⛔ | **Identity verification** of the Play Console account | Google (pending) |
| 3 | ⛔ | **Privacy policy hosted at a public HTTPS URL** | Fill the placeholders, host `release-assets/privacy-policy/index.html` (e.g. GitHub Pages, your site, Google Sites) |
| 4 | ⛔ | **Legal / policy decisions** | Contact email, developer identity, target audience (13+ recommended), Data safety confirmations — see `PLAY_CONSOLE_DECLARATIONS.md` §9 |
| 5 | ⛔ | **Ads decision for the public release** | Real AdMob IDs (AdMob account → `src/ads/adIds.json` → `npm run android:bundle:production-ads`) or ship test ads knowingly. Not needed for internal/closed testing |
| 6 | ⬜ | Physical-device test (section 7) | At least one real Android phone |

## 3. Create the upload key (you)

```bash
npm run android:upload-key
```

- Asks for a password twice (hidden). Use 12+ characters; save it in your password manager.
- Creates `C:\Users\<you>\keys\neon-escape-upload.jks` (outside the project) and the git-ignored
  `android/keystore.properties`. Refuses to overwrite either.
- **Back up** the `.jks` file and the password in two separate places (password manager with
  attachment + encrypted USB drive). Never email it or put it in Git/cloud folders shared with
  others.

Then:

```bash
npm run android:bundle
```

Expect `✔ Release AAB ready (… ads: test, SIGNED)`. Output:
`android/app/build/outputs/bundle/release/app-release.aab`.

(Android Studio alternative: Build → Generate Signed App Bundle or APK → Android App Bundle →
Create new…, store the keystore outside the project, then fill `android/keystore.properties`
from `android/keystore.properties.example`.)

## 4. Play Console upload (after identity verification)

1. **Create app**: App name `NEON ESCAPE: Arrow Puzzle` (or `NEON ESCAPE`), default language
   English (United States), **Game**, **Free**, accept the declarations.
2. **Set up your app** (dashboard tasks): privacy policy URL, app access, ads, content rating,
   target audience, data safety, government apps, financial features, health, advertising ID —
   answers in `PLAY_CONSOLE_DECLARATIONS.md`.
3. **Store listing**: texts from `GOOGLE_PLAY_LISTING.md`; graphics from `release-assets/`;
   category **Puzzle**; contact email. Add Spanish and Romanian under *Manage translations*.
4. **App signing**: on the first upload, accept **Play App Signing** (Google-generated app
   signing key). Your key is the *upload* key.
5. **Internal testing** (instant, up to 100 testers): Testing → Internal testing → Create new
   release → upload the signed AAB → release notes → Save → Review → Roll out. Add testers by
   email list; open the opt-in link on the phone.

## 5. Closed testing (required before production for new personal accounts)

Google requires accounts like yours to run a **closed test with at least 12 testers opted in
for at least 14 days in a row** before applying for production access.

1. Testing → Closed testing → Create track (e.g. "Closed beta") → upload the same signed AAB (or
   promote the internal release).
2. Testers: create a **Google Group** or an email list with 15–20 people (margin for drop-outs).
   Each must accept the opt-in link and install from Play. Keep them opted in for 14 days.
3. Countries: start with Romania (+ any others you plan).
4. Feedback plan:
   - Give testers a short form (Google Forms) with: device model / Android version, crashes or
     freezes, levels that felt unfair or confusing, text/translation mistakes, ads behaviour
     (consent form, Watch ad, rewards), battery/heat.
   - Ask them to play at least the first 10 levels (Daily League unlocks) and come back on two
     different days (daily rewards, league day change).
   - Watch Play Console → Quality → Android vitals (crashes, ANRs) and pre-launch report.
   - Fix release-blocking issues only; each new upload needs **versionCode +1**
     (`android/app/build.gradle`) and versionName 1.0.1 (`package.json`).
5. After 14 days: Dashboard → **Apply for production** and answer Google's questions about the
   test.

## 6. Production submission

1. Decide ads (blocker 5). With real IDs: fill `src/ads/adIds.json` → `production`, add your
   phones to `testDeviceIds`, create the GDPR message in AdMob (Privacy & messaging), publish
   `app-ads.txt` on your website, build `npm run android:bundle:production-ads`, raise versionCode.
2. Production → Create new release → upload → release notes (`GOOGLE_PLAY_LISTING.md`) →
   countries → optional staged rollout (e.g. 20 %) → Review → Send for review.
3. Review usually takes from hours to several days. Don't promise a date before approval.

## 7. Tests that need a physical phone

- Real GPU performance (frame rate in level 100, heat/battery over 15 minutes).
- Vibration strength (Soft/Strong) and the Test vibration button.
- Audio through speaker/headphones; behaviour on incoming call / notification.
- Consent form in a real EEA network context and the Privacy options entry point.
- Rewarded ad on a real device (test ads, or a registered test device with production IDs).
- Gesture navigation and predictive Back on your phone's Android version; display cutouts of
  your model.
- Install from the Play internal-testing link, then an update install (progress kept).

## 8. Known minor issues (not release blockers)

- Offline at launch, the Shop says ads are off "because of your privacy choices or region"
  (the consent check couldn't run). Safe behaviour (no ad, no reward); wording only. Ads become
  available on the next launch with a connection.
- At level 100 on 320 px-wide phones, the English "Continue · Level 100" label wraps to two
  lines (pre-existing; Spanish/Romanian were tightened).
