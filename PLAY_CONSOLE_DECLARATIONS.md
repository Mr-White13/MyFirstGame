# NEON ESCAPE 1.0.0 — Play Console declarations (draft answers)

Worksheet for **Play Console → Policy → App content**. These are **draft answers based on the
code and its SDKs**; you submit them, and you are responsible for them. Items marked
**⚠ CONFIRM** need your decision. Nothing here has been submitted.

## Evidence the answers are based on

| Fact | Source |
| --- | --- |
| No account, no backend, no analytics SDK; all game data in WebView `localStorage` on the device | Source code (`src/storage`, `src/profile`, `src/progress`, `src/rewards`, `src/league`); the only network user is the ad SDK |
| SDKs in the release build: Capacitor 8 (core, App, Haptics), Google Mobile Ads SDK **25.4.0**, User Messaging Platform **4.0.0**, plus their AndroidX / Play services dependencies (WorkManager, ads-identifier, app set, measurement-sdk-api stubs) | `gradlew :app:dependencies` (release runtime classpath); versions pinned in `android/variables.gradle` |
| No Firebase / Google Analytics / Crashlytics, no `google-services.json` | Repository |
| Permissions in the release manifest: `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `com.google.android.gms.permission.AD_ID`, `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION`, `ACCESS_ADSERVICES_TOPICS`, `WAKE_LOCK`, `FOREGROUND_SERVICE` (WorkManager, no service type) | Merged release manifest |
| Ad SDK data (IP address → approximate location, product interactions, diagnostics, device/account IDs incl. advertising ID and app set ID; for advertising, analytics, fraud prevention; TLS in transit) | Google: https://developers.google.com/admob/android/privacy/play-data-disclosure (read 2026-11-15, page reflects SDK 25.5.0) |
| Consent: UMP form at launch where required; ads only requested when `canRequestAds` | `src/ads/admobBackend.ts`, `src/ads/RewardedAds.ts` |
| SDK started at launch after consent and one ad is preloaded (so SDK data flows even if the player never taps "watch") | `RewardedAds.start()` |

---

## 1. Privacy policy

URL: **⚠ CONFIRM** — publish `release-assets/privacy-policy/index.html` (after filling the
placeholders) at a public HTTPS address and enter it here. Not hosted yet.

## 2. Ads

**Does your app contain ads?** → **Yes** (rewarded ads via Google AdMob, Android app).

Also applies if 1.0.0 ships with test ads only: the SDK and ad features are in the app.

## 3. App access

**All functionality is available without special access** → select this. No login, no
account, no subscription, no region lock, no invitation code.

## 4. Content rating (IARC questionnaire)

Category: **Game** (puzzle). Draft answers:

| Question area | Answer | Note |
| --- | --- | --- |
| Violence (any, cartoon, realistic, blood) | No | Abstract arrows on a grid |
| Fear / horror | No | |
| Sexuality / nudity | No | |
| Language (profanity, crude humour) | No | Generated nicknames are adjective + animal |
| Controlled substances (drugs, alcohol, tobacco) | No | |
| Gambling / simulated gambling | No | No loot boxes, no chance-based paid rewards; credits are earned and spent on fixed-price cosmetics |
| Users can interact or exchange content | No | No chat, no multiplayer; the Daily League is local only |
| Shares user's current location | No | Optional flag is chosen manually, not located |
| Digital purchases (in-app purchases) | No | No real-money purchases |
| Ads | Yes (if asked) | |
| Unrestricted internet access / web browsing | No | |

Expected result: lowest age ratings (e.g. PEGI 3 / Everyone), decided by IARC, not by us.

## 5. Target audience and content

**⚠ CONFIRM (legal/policy decision).** Recommended: **13+ (13–15, 16–17, 18+)**, *not*
"appealing to children".

- The ad setup does **not** use child-directed treatment or Families-certified ad settings.
  Including any age group under 13 brings the **Families policy** and requires changing the ad
  configuration (`tagForChildDirectedTreatment`, content rating limits) — not done in 1.0.0.
- The art style (neon puzzle, no characters aimed at young children) supports 13+, but Google
  reviews this and may disagree.

## 6. Advertising ID

**Does your app use advertising ID?** → **Yes**.
Purposes: **Advertising or marketing**, **Analytics**, **Fraud prevention, security, and
compliance** (as stated by Google for the Mobile Ads SDK).
The `AD_ID` permission is added by the Mobile Ads SDK (present in the merged manifest).

## 7. Data safety

### Overview questions

| Question | Draft answer | Note |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** | Through the Google Mobile Ads SDK; Play requires declaring SDK data |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Google: TLS for all SDK data; the game sends nothing else |
| Do you provide a way for users to request that their data is deleted? | **⚠ CONFIRM** | Mr. White Games holds no user data (game data is only on the device and deleted by uninstalling). Answer per Play's current wording; many apps in this situation answer "No" and explain in the policy that no data is held. |

### Data types (all collected **and** shared by the Mobile Ads SDK)

Mapping of Google's SDK disclosure to Play's categories (**⚠ CONFIRM** the mapping when you
fill in the form — Google's page doesn't name Play categories):

| Play category › type | Google's disclosure | Collected | Shared | Processed ephemerally | Required / optional | Purposes |
| --- | --- | --- | --- | --- | --- | --- |
| Location › **Approximate location** | IP address, may estimate general location | Yes | Yes | No | Required ⚠ | Advertising or marketing; Analytics; Fraud prevention, security, and compliance |
| App activity › **App interactions** | App launch, taps, video views | Yes | Yes | No | Required ⚠ | same |
| App info and performance › **Diagnostics** | Launch time, hang rate, energy usage | Yes | Yes | No | Required ⚠ | same |
| Device or other IDs › **Device or other IDs** | Advertising ID, app set ID, signed-in account identifiers if applicable | Yes | Yes | No | Required ⚠ | same |

"Required ⚠": the SDK starts at launch (after consent) without a separate in-app switch, so
"users can't choose" is the conservative answer. Consent refusal limits personalisation, but
the form's "optional" means the user can opt out of the collection itself in the app.

**Not collected** (answer No): personal info (name, email, address, phone…), financial info,
health, messages, photos/videos, audio, files, calendar, contacts, web browsing, precise
location, app crash logs (no crash SDK — ⚠ unless you count Google's diagnostics; Google lists
"diagnostic information", mapped above), installed apps, search history.

The game's **own** saved data (progress, nickname, flag, settings) is **not collected** under
Play's definition: it never leaves the device.

## 8. Other App content items

| Item | Draft answer |
| --- | --- |
| Government app | No |
| Financial features | No |
| Health | No |
| News app | No |
| COVID-19 contact tracing/status | No |
| Data safety → security practices (independent security review) | No (not done) |
| Families / Teacher approved | Not applicable (13+ target, ⚠ see section 5) |

## 9. Items requiring your legal or policy confirmation

1. Privacy policy text, contact email, developer identity, publication URL.
2. Target audience age groups (section 5) — drives Families policy.
3. Data deletion question (section 7).
4. Data type mapping and "required vs optional" (section 7).
5. Whether 1.0.0 ships with production ads, test ads, or ads disabled (affects revenue, not the
   declarations: declare ads in all three cases while the SDK is included).
6. Content rating answers are factual for the current build; re-answer if features change.
