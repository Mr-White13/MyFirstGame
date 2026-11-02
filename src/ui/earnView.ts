import type { AdState } from '../ads/RewardedAds';

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
  const left = `${view.remaining} of ${view.limit} ads left today.`;
  if (view.state === 'unsupported') return { status: 'Ads that earn credits are available in the Android app.', button: null };
  if (view.state === 'not-permitted') {
    return { status: 'Ads are off because of your privacy choices or region. You can change your choices in Settings.', button: null };
  }
  if (view.remaining <= 0) return { status: `Daily limit reached (${view.limit} of ${view.limit}). Come back tomorrow.`, button: { label: 'Come back tomorrow', enabled: false, busy: false } };
  switch (view.state) {
    case 'starting':
    case 'loading':
      return { status: `Loading an ad… ${left}`, button: { label: 'Loading…', enabled: false, busy: true } };
    case 'showing':
      return { status: left, button: { label: 'Showing ad…', enabled: false, busy: true } };
    case 'unavailable':
      return { status: `No ad available right now (are you online?). ${left}`, button: { label: 'Try again', enabled: true, busy: false } };
    case 'ready':
      return { status: left, button: { label: 'Watch ad', enabled: true, busy: false } };
  }
}
