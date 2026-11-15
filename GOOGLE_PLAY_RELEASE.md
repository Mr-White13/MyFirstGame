# NEON ESCAPE — Google Play release guide (1.0.0)

Studio: Mr. White Games · Stack: Phaser 3, TypeScript, Vite, Capacitor 8, Android.

This file is the checklist for the first public release and every update after it.
**Verified** means checked in this repository or on a build; **To do** needs a person, an
account or a decision.

---

## 1. Current release readiness

**Status: NEEDS WORK.** The game, the final application id and the release build pipeline are
ready; the upload key, the ads decision and the account setup are not.

### Verified

| Area | Result |
| --- | --- |
| Android SDK levels | `targetSdk 36` (Android 16, meets Google Play's current requirement), `compileSdk 36`, `minSdk 24` (`android/variables.gradle`). |
| Toolchain | Capacitor 8.6, Android Gradle Plugin 8.13, Gradle 9.1, Java 21 (Android Studio JBR). Builds without dependency changes. |
| Application id | **`com.mrwhitegames.neonescape`** (final; `capacitor.config.json`, `android/app/build.gradle`, Java package `com.mrwhitegames.neonescape`, `strings.xml`). Never change it after the first upload. |
| Version | `versionName 1.0.0` (read from `package.json`), `versionCode 1` (`android/app/build.gradle`). Settings shows **1.0.0**. |
| Release AAB | `npm run android:bundle` builds `android/app/build/outputs/bundle/release/app-release.aab` (7.2 MB, **unsigned** until the upload key exists). |
| Release build | Not debuggable (`debuggable false`, `aapt dump badging` shows no debuggable flag); WebView remote debugging is off in release (Capacitor default). No native libraries, so the 16 KB page-size requirement doesn't apply. |
| Development-only code | Off in production builds: the "unlock all levels" test mode (`src/progress/testUnlock.ts`, a test checks it), the DevTools `neon` global, and source maps (none emitted). |
| Levels | 100 levels, ids 1–100, all valid and solvable (`npm run levels:validate`), no two identical layouts, unlocked through normal progression. |
| Saved data on update | Installing the release build over an older build kept progress, credits, achievements and profile (tested on the emulator). Saves live in the WebView's `localStorage` for origin `https://localhost`. **Keep the app id, the signing key and Capacitor's default `androidScheme`/`hostname` unchanged**, or players lose their saves. |
| Android behaviour | Release build on an Android 17 (API 37) emulator: Back follows the game's navigation (AndroidX `OnBackPressedCallback`, compatible with predictive Back); background → foreground resumes the level; portrait only; immersive full screen with safe-area insets (edge-to-edge is enforced for targetSdk 35+ and handled). |
| Manifest | Declared: `INTERNET`. Added by libraries (Google Mobile Ads, WorkManager, Capacitor Haptics): `ACCESS_NETWORK_STATE`, `VIBRATE`, `com.google.android.gms.permission.AD_ID`, `ACCESS_ADSERVICES_AD_ID / ATTRIBUTION / TOPICS`, `WAKE_LOCK`, `FOREGROUND_SERVICE` (WorkManager, no foreground service type). Exported: only `MainActivity` (launcher) plus library components protected by system permissions. |
| Rewarded ads | Shown only after a tap (Shop, booster offer, Continue after Game Over); never automatically. Reward paid once per reward id (`ad:<day>:<n>`), never on early close, load failure, no connection, missing consent or daily limit (5/day). Covered by `src/ads/ads.test.ts`. |
| Consent | Google UMP runs at launch; no ad is requested unless `canRequestAds`; "Privacy options (ads)" appears in Settings when UMP requires it. |
| Ads configuration | Google **test** IDs in every build. Production IDs are not set, and a production-ads build **fails** until they are (`vite.config.ts` and `build.gradle` both check). |
| Icons and splash | Launcher icons for all densities + adaptive icon (`#101522` background). Launch window is blank on the studio colour; the Mr. White Games web splash plays unchanged. App name: **NEON ESCAPE**. |
| Languages | English, Spanish, Romanian (device language, or Settings → Language). |

### Assumptions (not verifiable from the code)

- The Play Console account will pass identity verification.
- Real devices behave like the emulator (only emulator tested; test at least one real phone).

---

## 2. Remaining blockers

| # | Blocker | Who |
| --- | --- | --- |
| 1 | **Upload key** does not exist yet: the AAB is unsigned (section 4). | You |
| 2 | **Ads for 1.0.0**: ship with real AdMob IDs (needs an AdMob account), or consciously ship 1.0.0 with test ads (players see "Test Ad", no revenue). Never fill in invented IDs. | Decision |
| 3 | **Privacy policy URL** (required: the app contains ads and uses the advertising ID). | You (publicly hosted page) |
| 4 | **Store listing assets**: 512×512 icon, 1024×500 feature graphic, 2–8 phone screenshots. | You |
| 5 | **Play Console**: identity verification, then (for personal accounts created after Nov 2023) a **closed test with at least 12 testers for 14 continuous days** before production access. | You |

---

## 3. The application id (done)

The application id is **`com.mrwhitegames.neonescape`**, set in:

1. `capacitor.config.json` → `"appId"`.
2. `android/app/build.gradle` → `namespace` and `applicationId`.
3. `android/app/src/main/java/com/mrwhitegames/neonescape/` → `MainActivity.java` and
   `NeonHapticsPlugin.java` (`package com.mrwhitegames.neonescape;`).
4. `android/app/src/main/res/values/strings.xml` → `package_name` and `custom_url_scheme`.

It identifies the app on Google Play **forever**: after the first upload it can't be changed or
reused. Never edit these values again.

**Test installs:** builds made before this change used `dev.neonescape.prototype`. On a phone that
is a separate app with its own saves; the new app starts empty. Uninstall the old one when you no
longer need its test progress (uninstalling deletes it).

## 4. Create and back up the upload key

Google Play App Signing is used: Google keeps the **app signing key**; you sign uploads with
your own **upload key**. If the upload key is lost, Google can reset it (Play Console →
Setup → App signing), but keep it safe anyway.

### Create it (once)

Android Studio: **Build → Generate Signed App Bundle or APK → Android App Bundle → Create new…**
Or in a terminal (keytool comes with Android Studio's JDK):

```bash
"C:/Program Files/Android/Android Studio/jbr/bin/keytool" -genkeypair -v -keystore "C:/Users/YOU/keys/neon-escape-upload.jks" -alias upload -keyalg RSA -keysize 4096 -validity 10000
```

- Keep the keystore **outside the project folder** (for example `C:/Users/YOU/keys/`).
- Use a strong password; keytool asks for it and for the certificate name (use "Mr. White Games").

### Tell the build where it is

Copy `android/keystore.properties.example` to `android/keystore.properties` and fill it in:

```properties
storeFile=C:/Users/YOU/keys/neon-escape-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

`keystore.properties`, `*.jks` and `*.keystore` are git-ignored. Never commit them, paste them
into chats, or upload them anywhere. On a build server use the environment variables
`NEON_UPLOAD_STORE_FILE`, `NEON_UPLOAD_STORE_PASSWORD`, `NEON_UPLOAD_KEY_ALIAS`,
`NEON_UPLOAD_KEY_PASSWORD` instead of the file.

### Back it up

Store the `.jks` file **and** its passwords in two separate safe places (for example a password
manager with file attachments, plus an encrypted USB drive). Losing it means asking Google for
an upload key reset, which takes time.

---

## 5. Generate the signed AAB

```bash
npm run android:bundle
```

It runs the web build, `cap sync android` and `gradlew bundleRelease`, then verifies the result
with `jarsigner` and prints:

- `✔ Release AAB ready (… MB, ads: test, SIGNED)` → ready to upload, or
- `… UNSIGNED: not uploadable` → `android/keystore.properties` is missing or wrong.

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

With production AdMob IDs configured (section 7), build the store version with:

```bash
npm run android:bundle:production-ads
```

This build stops with an error while `src/ads/adIds.json` has no `production` IDs.

---

## 6. Install and test a release build

An AAB can't be installed directly. Options:

1. **Play Console internal testing** (closest to real users): upload the AAB to an internal
   testing track, add your Google account as a tester, install from the Play Store link.
2. **Locally with bundletool** (download `bundletool-all.jar` from github.com/google/bundletool):
   ```bash
   java -jar bundletool-all.jar build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=neon.apks --ks=C:/Users/YOU/keys/neon-escape-upload.jks --ks-key-alias=upload --connected-device
   ```
   ```bash
   java -jar bundletool-all.jar install-apks --apks=neon.apks
   ```

An install signed with a different key than the one on the phone fails; uninstall the old
build first (this deletes its saves).

Test on a real phone: first launch and consent form, all screens, a full level, Game Over and
Continue ad, Shop ad (+30), daily reward, Back from every screen, background/foreground,
airplane mode (ads show as unavailable, nothing is paid), and an update install over the
previous version (progress kept).

---

## 7. Manual Play Console and AdMob steps

### Play Console (in this order)

1. Finish identity verification.
2. **Create app**: name *NEON ESCAPE*, default language, *Game*, *Free*.
3. **App content** (Policy → App content):
   - Privacy policy URL.
   - Ads: **Yes, my app contains ads**.
   - App access: all functionality available without special access.
   - Content rating questionnaire (puzzle game, no violence, no user-generated content,
     no in-app purchases, no location sharing, no user interaction).
   - Target audience: choose the age groups honestly. If you include children under 13, the
     Families policy applies and the ads setup must change (child-directed treatment,
     certified ad SDK settings) — **not configured in this build**. Choosing 13+ avoids that.
   - **Data safety**: see below.
   - **Advertising ID**: Yes, used for advertising (the AdMob SDK adds `AD_ID`).
   - Government apps / financial features / health: No.
4. **Store listing**: short and full description, 512×512 icon, 1024×500 feature graphic,
   phone screenshots (2–8; optional 7" and 10" tablet screenshots).
5. **Testing → Closed testing**: 12+ testers for 14 days (personal accounts), then apply for
   production access.
6. **Production** release: upload the signed AAB, release notes, roll out.

### Data safety — what the code actually does

The game itself sends nothing: profile, progress, statistics, settings and credits stay in the
app's local storage on the device (no account, no server, no analytics SDK).

The **Google Mobile Ads SDK** (rewarded ads, Android only) collects and shares data with
Google. Google documents this for the Data safety form at
https://developers.google.com/admob/android/privacy/play-data-disclosure — use **that page's
current list** when filling in the form rather than copying from here. At the time of writing it
covers device or other IDs (advertising ID), approximate location (from IP address), app
interactions and diagnostics, used for advertising, analytics and fraud prevention, encrypted in
transit.

Also check whether Android's backup (`android:allowBackup="true"`, which lets players restore
their saves on a new phone through their Google account) needs mentioning in your policy; it is
the user's own Google backup, not data sent to you.

### Privacy policy — facts to cover

Write it yourself (or with a legal template) from these facts:

- No account; game data stays on the device; the game sends none of it anywhere.
- The Android app shows optional rewarded ads via Google AdMob, only when the player taps.
- Google's SDK collects data as described in Google's policies (link Google's privacy policy
  and the "How Google uses information from sites or apps that use our services" page).
- Consent is requested via Google's consent form where required (EEA, UK, Switzerland); players
  can change it in Settings → Privacy options (ads).
- The web version has no ads.
- Contact email for privacy requests.

### AdMob (only when real ads are wanted)

1. Create the AdMob account, add the Android app (once it's on Play, link it to the listing).
2. Create **one rewarded ad unit** (reward 30 credits; the game grants the amount itself).
3. Put the IDs in `src/ads/adIds.json`:
   ```json
   "production": { "appId": "ca-app-pub-XXXX~YYYY", "rewardedUnitId": "ca-app-pub-XXXX/ZZZZ" }
   ```
4. AdMob → Privacy & messaging: create the **GDPR** message (and the US states message if you
   want it). UMP only shows what is configured there.
5. Register your own phones as **test devices** in AdMob before running a production-ads build
   on them; never click your own live ads.
6. Publish `app-ads.txt` on the developer website listed in Play Console.
7. Build with `npm run android:bundle:production-ads`.

Debug APKs and `npm run android:bundle` keep using Google's test ads.

---

## 8. Releasing an update (1.0.1, 1.1.0, …)

1. `package.json` → `"version"`: `1.0.1` for fixes, `1.1.0` for new content. This is the
   `versionName` and what Settings shows (`npm version 1.0.1 --no-git-tag-version` updates
   `package-lock.json` too).
2. `android/app/build.gradle` → `appVersionCode`: **+1** for every upload (1 → 2 → 3…), even
   for a re-upload of the same version name. Google Play rejects a code it has seen before.
3. Run the checks: `npm run typecheck`, `npm test`, `npm run levels:validate`, `npm run build`.
4. Keep saved data compatible: storage formats change only through their versioned migrations
   (see README, "Saved data"), never by renaming keys or changing the app id / signing key /
   WebView origin.
5. Build: `npm run android:bundle` (or `:production-ads`), check it says **SIGNED**.
6. Upload to a testing track first, test the update over the previous version, then promote to
   production.
