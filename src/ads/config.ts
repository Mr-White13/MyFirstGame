/**
 * Rewarded ads configuration (Phase 2, Step 4A: TEST ADS ONLY).
 *
 * The values below are Google's public sample IDs, which always serve test
 * ads and are safe to use (and to commit): they never generate revenue or
 * invalid traffic. The production configuration is deliberately empty: when
 * the AdMob account exists, add its IDs there (ad unit IDs are not secret,
 * but keep any server keys out of the repository) and switch ACTIVE_AD_CONFIG.
 * The Android App ID is also set in android/app/src/main/res/values/strings.xml
 * (`admob_app_id`), which must match.
 */
export interface AdConfig {
  /** AdMob application ID (`ca-app-pub-…~…`). Must match `admob_app_id` in the Android strings. */
  readonly appId: string;
  /** Rewarded ad unit ID (`ca-app-pub-…/…`). */
  readonly rewardedUnitId: string;
  /** True for test ads: requests are marked as test requests. */
  readonly isTesting: boolean;
}

/** Google's official sample IDs for Android: app ID and the rewarded ad unit. */
export const TEST_AD_CONFIG: AdConfig = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  isTesting: true,
};

/** Not configured yet. Live ads must never be requested during development. */
export const PRODUCTION_AD_CONFIG: AdConfig | null = null;

/** The configuration in use: test ads only, in every build, for this step. */
export const ACTIVE_AD_CONFIG: AdConfig = TEST_AD_CONFIG;

/** Energy Credits paid for one rewarded ad watched to the end. */
export const REWARDED_AD_CREDITS = 30;
/**
 * Rewarded ads that pay credits per device-local calendar day, across every
 * place they're offered (Shop, booster offer). Continue ads after Game Over
 * pay a life, not credits, and don't count; Continue is limited to once per attempt.
 */
export const MAX_REWARDED_ADS_PER_DAY = 5;
/**
 * No unsolicited ad prompts (the booster offer) during a player's first 30
 * minutes of actual play (the statistics' play time: menus and idle time
 * don't count). Ads the player asks for (Shop, Continue) work from the start.
 */
export const AD_FREE_PLAY_MS = 30 * 60_000;
/** Give up loading an ad after this long (no connection, slow network): the ad is "unavailable". */
export const AD_LOAD_TIMEOUT_MS = 15_000;
