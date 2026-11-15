import type { AdState } from '../ads/RewardedAds';
import { t } from '../i18n/translate';

/** What the Shop's "Earn credits" section shows about rewarded ads. */
export interface EarnView {
  readonly state: AdState;
  /** Ads that can still pay today. */
  readonly remaining: number;
  readonly limit: number;
  /** Credits per ad. */
  readonly credits: number;
}

/** The section's text and button for a given state. Pure, so every state is testable. */
export interface EarnPresentation {
  readonly status: string;
  /** Null: no button (no ads possible here). */
  readonly button: { readonly label: string; readonly enabled: boolean; readonly busy: boolean } | null;
}

export function presentEarn(view: EarnView): EarnPresentation {
  const counts = { remaining: view.remaining, count: view.limit };
  if (view.state === 'unsupported') return { status: t('rewards.earnUnsupported'), button: null };
  if (view.state === 'not-permitted') return { status: t('rewards.earnNotPermitted'), button: null };
  if (view.remaining <= 0) {
    return { status: t('rewards.earnLimitReached', { count: view.limit }), button: { label: t('rewards.earnComeBack'), enabled: false, busy: false } };
  }
  switch (view.state) {
    case 'starting':
    case 'loading':
      return { status: t('rewards.earnLoadingStatus', counts), button: { label: t('rewards.earnLoading'), enabled: false, busy: true } };
    case 'showing':
      return { status: t('rewards.earnLeft', counts), button: { label: t('rewards.earnShowing'), enabled: false, busy: true } };
    case 'unavailable':
      return { status: t('rewards.earnUnavailable', counts), button: { label: t('rewards.earnTryAgain'), enabled: true, busy: false } };
    case 'ready':
      return { status: t('rewards.earnLeft', counts), button: { label: t('rewards.earnWatch'), enabled: true, busy: false } };
  }
}
