import type { AdConfig } from './config';
import type { ConsentState, RewardedAdBackend } from './RewardedAds';

/** After the ad closes, a late reward callback is still accepted for this long. */
const REWARD_GRACE_MS = 500;

/**
 * Rewarded ads on Android through @capacitor-community/admob (Google Mobile
 * Ads SDK + User Messaging Platform). The plugin is imported lazily, only in
 * the native app, so the browser game never loads it and the rest of the
 * game never depends on it.
 *
 * Show is driven by events, not by showRewardVideoAd()'s promise: that
 * promise resolves only when a reward is earned and never settles if the ad
 * is closed early, so Rewarded / Dismissed / FailedToShow decide instead.
 */
export function admobBackend(config: AdConfig): RewardedAdBackend {
  const plugin = () => import('@capacitor-community/admob');

  const consentState = (info: { canRequestAds: boolean; privacyOptionsRequirementStatus: string }): ConsentState => ({
    canRequestAds: info.canRequestAds,
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
  });

  return {
    supported: true,

    async gatherConsent() {
      const { AdMob, AdmobConsentStatus } = await plugin();
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm();
      return consentState(info);
    },

    async initialize() {
      const { AdMob } = await plugin();
      await AdMob.initialize({ initializeForTesting: config.isTesting });
    },

    async load() {
      const { AdMob } = await plugin();
      await AdMob.prepareRewardVideoAd({ adId: config.rewardedUnitId, isTesting: config.isTesting });
    },

    async show(onReward) {
      const { AdMob, RewardAdPluginEvents } = await plugin();
      const handles: { remove: () => Promise<void> }[] = [];
      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (error?: unknown) => {
            if (settled) return;
            settled = true;
            if (error) reject(error instanceof Error ? error : new Error(String(error)));
            else resolve();
          };
          void Promise.all([
            AdMob.addListener(RewardAdPluginEvents.Rewarded, () => onReward()),
            // A reward callback can arrive just after the close: keep listening briefly before finishing.
            AdMob.addListener(RewardAdPluginEvents.Dismissed, () => setTimeout(() => finish(), REWARD_GRACE_MS)),
            AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) => finish(new Error(error?.message ?? 'failed to show'))),
          ])
            .then((added) => {
              handles.push(...added);
              // Resolves on reward (ignored: the Rewarded event pays); rejects if nothing is loaded.
              AdMob.showRewardVideoAd().catch((error: unknown) => finish(error ?? new Error('failed to show')));
            })
            .catch((error: unknown) => finish(error));
        });
      } finally {
        await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
      }
    },

    async showPrivacyOptions() {
      const { AdMob } = await plugin();
      await AdMob.showPrivacyOptionsForm();
      return consentState(await AdMob.requestConsentInfo());
    },
  };
}
