import AD_IDS from './adIds.json';

/**
 * Rewarded ads configuration: test ads in every build unless a build asks for
 * production ads on purpose.
 *
 * The IDs live in `adIds.json`, read by both this file (the game) and
 * android/app/build.gradle (the AdMob App ID in the Android manifest), so the
 * two can never disagree. `test` holds Google's public sample IDs, which
 * always serve test ads and are safe to commit. `production` stays `null`
 * until the AdMob account exists; fill it in then (ad unit IDs are not secret).
 *
 * The mode comes from `VITE_AD_MODE`: unset or `test` for every normal build
 * (dev server, `npm run build`, debug APKs, test AABs); `production` only in
 * `npm run android:bundle:production-ads` (.env.production-ads). A production
 * build with no production IDs fails at build time (vite.config.ts and
 * build.gradle both check), so test ads can't silently ship as "production"
 * and live ads can't be requested by accident.
 */
export interface AdConfig {
  /** AdMob application ID (`ca-app-pub-…~…`). Also written into the Android manifest by build.gradle. */
  readonly appId: string;
  /** Rewarded ad unit ID (`ca-app-pub-…/…`). */
  readonly rewardedUnitId: string;
  /** True for test ads: requests are marked as test requests. */
  readonly isTesting: boolean;
  /**
   * Your own phones (AdMob "test device" IDs, from adIds.json `testDeviceIds`).
   * In a production-ads build they get Google test ads instead of live ones,
   * so testing never produces invalid traffic. Empty: nobody is registered.
   */
  readonly testDeviceIds: readonly string[];
}

export type AdMode = 'test' | 'production';

/** Google's official sample IDs for Android: app ID and the rewarded ad unit. */
export const TEST_AD_CONFIG: AdConfig = { ...AD_IDS.test, isTesting: true, testDeviceIds: AD_IDS.testDeviceIds };

/** Not configured yet (adIds.json `production` is null). Live ads must never be requested during development. */
export const PRODUCTION_AD_CONFIG: AdConfig | null = AD_IDS.production ? { ...(AD_IDS.production as Pick<AdConfig, 'appId' | 'rewardedUnitId'>), isTesting: false, testDeviceIds: AD_IDS.testDeviceIds } : null;

/**
 * The configuration for a build mode. Anything but `production` is test ads.
 * `production` without production IDs throws (the build checks this first).
 */
export function selectAdConfig(mode: string | undefined, production: AdConfig | null = PRODUCTION_AD_CONFIG): AdConfig {
  if (mode !== 'production') return TEST_AD_CONFIG;
  if (!production) throw new Error('VITE_AD_MODE=production but src/ads/adIds.json has no production IDs');
  return production;
}

/** The configuration in use: test ads unless this build was made with VITE_AD_MODE=production. */
export const ACTIVE_AD_CONFIG: AdConfig = selectAdConfig(import.meta.env.VITE_AD_MODE);

/** Energy Credits paid for one rewarded ad watched to the end: exactly one Hint (BOOSTERS.hint.cost). */
export const REWARDED_AD_CREDITS = 50;
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
