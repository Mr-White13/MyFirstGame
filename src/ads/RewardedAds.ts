import { AD_LOAD_TIMEOUT_MS, MAX_REWARDED_ADS_PER_DAY, REWARDED_AD_CREDITS } from './config';

/**
 * Optional rewarded ads that pay Energy Credits (Phase 2, Step 4A).
 *
 * Pure orchestration: the ad SDK is behind `RewardedAdBackend` (the AdMob
 * plugin on Android, nothing in browsers; fakes in tests) and the credits go
 * through `AdRewardLedger` (the existing wallet, see Rewards.grantAdReward).
 *
 * - Ads are only ever shown after an explicit tap (watch()); never automatically.
 * - Nothing is requested before the consent SDK says ads may be requested.
 * - One watch at a time: further taps while one is loading or showing are refused.
 * - Credits are granted only when the SDK reports the reward, once per shown
 *   ad: each watch gets a durable reward id up front, and the wallet refuses
 *   an id it has already applied, so duplicate callbacks can't pay twice. The
 *   grant happens the moment the reward is reported (not on close), so
 *   backgrounding or closing the app afterwards can't lose it.
 * - Closing the ad early, failing to load or show, no connection, the daily
 *   limit or missing consent: nothing is granted.
 */

/** What the ad SDK must do. Every call may reject (no connection, no fill, SDK error). */
export interface RewardedAdBackend {
  /** False in browsers: no ad SDK there, the game works without it. */
  readonly supported: boolean;
  /** Updates consent information (each launch) and shows the consent form when required. */
  gatherConsent(): Promise<ConsentState>;
  /** Starts the ad SDK. Only called once consent allows ad requests. */
  initialize(): Promise<void>;
  /** Loads one rewarded ad. */
  load(): Promise<void>;
  /**
   * Shows the loaded ad. `onReward` is called when (and only if) the SDK
   * reports the reward. Resolves when the ad is closed, rejects if it can't be shown.
   */
  show(onReward: () => void): Promise<void>;
  /** The consent SDK's privacy options form (to change choices later). */
  showPrivacyOptions(): Promise<ConsentState>;
}

export interface ConsentState {
  /** The consent SDK allows requesting ads (consent given, or not required here). */
  readonly canRequestAds: boolean;
  /** A privacy options entry point must be offered (for example in the EEA and UK). */
  readonly privacyOptionsRequired: boolean;
}

/** The wallet side: how many rewards are left today, and paying one. */
export interface AdRewardLedger {
  remaining(today: string): number;
  /**
   * The id the next reward today would use (`ad:<day>:<n>`). Fixed when an
   * ad starts, so every callback for that ad maps to the same transaction.
   */
  nextRewardId(today: string): string | null;
  /** Pays one reward under `rewardId` (once). `saved` false: applied but not yet written (storage failing). */
  grant(today: string, rewardId: string): AdGrant;
}

export type AdGrant = { readonly ok: true; readonly credits: number; readonly saved: boolean } | { readonly ok: false; readonly reason: 'limit' | 'duplicate' | 'invalid' };

export type AdState =
  /** No ad SDK (browsers). */
  | 'unsupported'
  /** Consent and SDK start-up in progress (launch). */
  | 'starting'
  /** The consent SDK does not allow ad requests (declined, or consent unavailable). */
  | 'not-permitted'
  | 'loading'
  | 'ready'
  /** Couldn't load (no connection, no ad to show): a tap tries again. */
  | 'unavailable'
  | 'showing';

export type WatchResult =
  | { readonly kind: 'rewarded'; readonly credits: number; readonly saved: boolean }
  /** Closed before the reward. */
  | { readonly kind: 'dismissed' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'limit' }
  | { readonly kind: 'busy' }
  | { readonly kind: 'not-permitted' }
  | { readonly kind: 'unsupported' };

export interface RewardedAdsDeps {
  readonly backend: RewardedAdBackend;
  readonly ledger: AdRewardLedger;
  /** Today's device-local date (YYYY-MM-DD). */
  readonly today: () => string;
  /** The state or the remaining count changed: refresh what shows it. */
  readonly onChange?: () => void;
  /** An ad is about to cover the game (true) or is gone (false): pause and resume. */
  readonly onShowing?: (showing: boolean) => void;
  /** Load timeout (tests use a short one). */
  readonly loadTimeoutMs?: number;
  readonly log?: (message: string) => void;
}

export class RewardedAds {
  private stateValue: AdState;
  private consent: ConsentState = { canRequestAds: false, privacyOptionsRequired: false };
  private started = false;
  private busy = false;
  private loading?: Promise<void>;

  constructor(private readonly deps: RewardedAdsDeps) {
    this.stateValue = deps.backend.supported ? 'starting' : 'unsupported';
  }

  get state(): AdState {
    return this.stateValue;
  }

  /** False in browsers (no ad SDK). */
  get supported(): boolean {
    return this.deps.backend.supported;
  }

  get credits(): number {
    return REWARDED_AD_CREDITS;
  }

  get dailyLimit(): number {
    return MAX_REWARDED_ADS_PER_DAY;
  }

  /** Rewards still available today (0..MAX_REWARDED_ADS_PER_DAY). */
  get remainingToday(): number {
    return this.deps.ledger.remaining(this.deps.today());
  }

  get privacyOptionsRequired(): boolean {
    return this.consent.privacyOptionsRequired;
  }

  /** True when an ad could be offered right now (a tap may still need to load one). */
  get canOffer(): boolean {
    return (this.stateValue === 'ready' || this.stateValue === 'unavailable' || this.stateValue === 'loading') && this.remainingToday > 0;
  }

  /**
   * At launch (Android): consent first, then the SDK, then preload one ad.
   * Never throws; any failure leaves the game working without ads.
   */
  async start(): Promise<void> {
    if (!this.deps.backend.supported || this.started) return;
    this.started = true;
    try {
      this.consent = await this.deps.backend.gatherConsent();
    } catch (error) {
      this.log('consent failed', error);
      this.consent = { canRequestAds: false, privacyOptionsRequired: false };
    }
    if (!this.consent.canRequestAds) return this.set('not-permitted');
    try {
      await this.deps.backend.initialize();
    } catch (error) {
      this.log('initialize failed', error);
      return this.set('unavailable');
    }
    await this.preload();
  }

  /** True when an ad for Continue (Game Over) could be shown now: like canOffer, without the credit limit. */
  get canOfferContinue(): boolean {
    return this.stateValue === 'ready' || this.stateValue === 'unavailable' || this.stateValue === 'loading';
  }

  /**
   * The player asked to watch an ad for credits. Refuses at once (no ad
   * shown) when ads aren't possible or today's limit is reached; otherwise
   * loads if needed, shows, and pays on the reward.
   */
  watch(): Promise<WatchResult> {
    return this.run('credits');
  }

  /**
   * The player asked to watch an ad to continue after Game Over. Same flow,
   * but the reward is a life (applied by the caller after a 'rewarded'
   * result), so no credits are paid and the daily credit limit doesn't apply.
   */
  watchForContinue(): Promise<WatchResult> {
    return this.run('continue');
  }

  private async run(purpose: 'credits' | 'continue'): Promise<WatchResult> {
    if (!this.deps.backend.supported) return { kind: 'unsupported' };
    if (this.busy) return { kind: 'busy' };
    if (this.stateValue === 'not-permitted' || (this.started && !this.consent.canRequestAds)) return { kind: 'not-permitted' };
    if (this.stateValue === 'starting' || !this.started) return { kind: 'busy' };
    const today = this.deps.today();
    const rewardId = purpose === 'credits' ? this.deps.ledger.nextRewardId(today) : null;
    if (purpose === 'credits' && (!rewardId || this.deps.ledger.remaining(today) <= 0)) return { kind: 'limit' };

    this.busy = true;
    try {
      if (this.stateValue !== 'ready') {
        await this.preload();
        if ((this.stateValue as AdState) !== 'ready') return { kind: 'unavailable' }; // preload() changed it
      }
      let reward: WatchResult | null = null;
      this.set('showing');
      this.deps.onShowing?.(true);
      try {
        await this.deps.backend.show(() => {
          if (reward) return; // a repeated callback for the same ad: already paid
          if (purpose === 'continue') {
            reward = { kind: 'rewarded', credits: 0, saved: true };
            return;
          }
          const grant = this.deps.ledger.grant(today, rewardId!);
          reward = grant.ok ? { kind: 'rewarded', credits: grant.credits, saved: grant.saved } : grant.reason === 'limit' ? { kind: 'limit' } : { kind: 'dismissed' };
          this.deps.onChange?.();
        });
      } catch (error) {
        this.log('show failed', error);
        if (!reward) reward = { kind: 'unavailable' };
      } finally {
        this.deps.onShowing?.(false);
        this.set('loading'); // the shown ad is used up
      }
      void this.preload(); // the next one, ready for a later tap
      return reward ?? { kind: 'dismissed' };
    } finally {
      this.busy = false;
    }
  }

  /** Settings → Privacy options (only offered when required). Updates whether ads may be requested. */
  async showPrivacyOptions(): Promise<void> {
    if (!this.deps.backend.supported) return;
    try {
      this.consent = await this.deps.backend.showPrivacyOptions();
    } catch (error) {
      this.log('privacy options failed', error);
      return;
    }
    if (!this.consent.canRequestAds) return this.set('not-permitted');
    if (this.stateValue === 'not-permitted') {
      try {
        await this.deps.backend.initialize();
      } catch (error) {
        this.log('initialize failed', error);
        return this.set('unavailable');
      }
      await this.preload();
    }
  }

  /** Loads one ad (at most one load at a time: a second caller waits for the same load); never throws. */
  private preload(): Promise<void> {
    if (!this.loading) this.loading = this.load().finally(() => (this.loading = undefined));
    return this.loading;
  }

  private async load(): Promise<void> {
    if (!this.consent.canRequestAds) return this.set('not-permitted');
    this.set('loading');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.deps.backend.load(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('load timeout')), this.deps.loadTimeoutMs ?? AD_LOAD_TIMEOUT_MS);
        }),
      ]);
      this.set('ready');
    } catch (error) {
      this.log('load failed', error);
      this.set('unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  private set(state: AdState): void {
    if (state === this.stateValue) return;
    this.stateValue = state;
    this.deps.onChange?.();
  }

  private log(message: string, error: unknown): void {
    this.deps.log?.(`[ads] ${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Browsers: no ad SDK. The Shop and boosters simply don't offer ads. */
export const NO_ADS_BACKEND: RewardedAdBackend = {
  supported: false,
  gatherConsent: async () => ({ canRequestAds: false, privacyOptionsRequired: false }),
  initialize: async () => undefined,
  load: async () => Promise.reject(new Error('no ad SDK')),
  show: async () => Promise.reject(new Error('no ad SDK')),
  showPrivacyOptions: async () => ({ canRequestAds: false, privacyOptionsRequired: false }),
};
