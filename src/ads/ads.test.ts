import { describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../levels';
import { createProgress } from '../progress/Progress';
import { createStats } from '../profile/Stats';
import { adRewardTransactionId, readRewards, REWARDS_KEY, Rewards } from '../rewards/Rewards';
import { MemoryStore } from '../testing/memoryStore';
import { presentEarn } from '../ui/earnView';
import { MAX_REWARDED_ADS_PER_DAY, REWARDED_AD_CREDITS, TEST_AD_CONFIG, ACTIVE_AD_CONFIG, PRODUCTION_AD_CONFIG } from './config';
import { NO_ADS_BACKEND, RewardedAds, type ConsentState, type RewardedAdBackend } from './RewardedAds';

const DAY = '2026-11-02';
const NEXT_DAY = '2026-11-03';

/**
 * A fake ad SDK for tests only (never used by the game): each call does what
 * the test scripts. `rewardCalls` = how many times the SDK reports the reward
 * for the next shown ad (0 = closed early; 2 = a duplicate callback).
 */
function fakeBackend(script: Partial<{ consent: ConsentState | Error; initFails: boolean; loadFails: boolean; loadHangs: boolean; showFails: boolean; rewardCalls: number }> = {}) {
  const calls: string[] = [];
  const backend: RewardedAdBackend & { calls: string[]; script: typeof script } = {
    supported: true,
    calls,
    script,
    gatherConsent: async () => {
      calls.push('consent');
      if (script.consent instanceof Error) throw script.consent;
      return script.consent ?? { canRequestAds: true, privacyOptionsRequired: false };
    },
    initialize: async () => {
      calls.push('initialize');
      if (script.initFails) throw new Error('init failed');
    },
    load: () => {
      calls.push('load');
      if (script.loadHangs) return new Promise<void>(() => {});
      return script.loadFails ? Promise.reject(new Error('no fill')) : Promise.resolve();
    },
    show: async (onReward) => {
      calls.push('show');
      if (script.showFails) throw new Error('failed to show');
      for (let i = 0; i < (script.rewardCalls ?? 1); i++) onReward();
    },
    showPrivacyOptions: async () => {
      calls.push('privacy');
      return { canRequestAds: true, privacyOptionsRequired: true };
    },
  };
  return backend;
}

/** The real wallet (Rewards over an in-memory store) and a controller using it. */
function setup(backend: RewardedAdBackend = fakeBackend(), store = new MemoryStore(), today = { day: DAY }) {
  const make = () => new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store);
  const rewards = make();
  const showing: boolean[] = [];
  const ads = new RewardedAds({
    backend,
    ledger: {
      remaining: (d) => rewards.remainingAdRewards(d),
      nextRewardId: (d) => rewards.nextAdRewardId(d),
      grant: (d, id) => rewards.grantAdReward(d, id),
    },
    today: () => today.day,
    onShowing: (s) => void showing.push(s),
    loadTimeoutMs: 20,
  });
  return { ads, rewards, store, showing, today, reload: make };
}

describe('rewarded ads: configuration', () => {
  it('uses Google test IDs only, with the production configuration empty', () => {
    expect(ACTIVE_AD_CONFIG).toBe(TEST_AD_CONFIG);
    expect(TEST_AD_CONFIG).toEqual({ appId: 'ca-app-pub-3940256099942544~3347511713', rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917', isTesting: true });
    expect(PRODUCTION_AD_CONFIG).toBeNull();
    expect([REWARDED_AD_CREDITS, MAX_REWARDED_ADS_PER_DAY]).toEqual([30, 5]);
  });
});

describe('rewarded ads: watching', () => {
  it('a successful reward pays 30 credits once through the wallet, saved, and pauses/resumes the game around the ad', async () => {
    const { ads, rewards, store, showing } = setup();
    await ads.start();
    expect(ads.state).toBe('ready');
    expect(await ads.watch()).toEqual({ kind: 'rewarded', credits: 30, saved: true });
    expect(rewards.credits).toBe(30);
    expect(rewards.current.wallet.applied).toContain(adRewardTransactionId(DAY, 1));
    expect(readRewards(store.getItem(REWARDS_KEY)).value.wallet.credits).toBe(30);
    expect(ads.remainingToday).toBe(4);
    expect(showing).toEqual([true, false]);
  });

  it('an ad closed without earning the reward pays nothing', async () => {
    const backend = fakeBackend({ rewardCalls: 0 });
    const { ads, rewards } = setup(backend);
    await ads.start();
    expect(await ads.watch()).toEqual({ kind: 'dismissed' });
    expect(rewards.credits).toBe(0);
    expect(ads.remainingToday).toBe(5);
  });

  it('a duplicate reward callback for the same ad pays once', async () => {
    const { ads, rewards } = setup(fakeBackend({ rewardCalls: 3 }));
    await ads.start();
    expect(await ads.watch()).toMatchObject({ kind: 'rewarded' });
    expect(rewards.credits).toBe(30);
    expect(ads.remainingToday).toBe(4);
    // The wallet itself also refuses the same reward id again.
    expect(rewards.grantAdReward(DAY, adRewardTransactionId(DAY, 1))).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('a load failure or no internet (load never answers) shows nothing and pays nothing', async () => {
    const failing = setup(fakeBackend({ loadFails: true }));
    await failing.ads.start();
    expect(failing.ads.state).toBe('unavailable');
    expect(await failing.ads.watch()).toEqual({ kind: 'unavailable' });
    expect(failing.rewards.credits).toBe(0);

    const offline = setup(fakeBackend({ loadHangs: true }));
    await offline.ads.start(); // times out (20 ms in tests, 15 s in the game)
    expect(offline.ads.state).toBe('unavailable');
    expect(await offline.ads.watch()).toEqual({ kind: 'unavailable' });
    expect((offline.ads as unknown as { deps: { backend: { calls: string[] } } }).deps.backend.calls).not.toContain('show');
  });

  it('a show failure resumes the game and pays nothing; a retry after reconnecting works', async () => {
    const backend = fakeBackend({ showFails: true });
    const { ads, rewards, showing } = setup(backend);
    await ads.start();
    expect(await ads.watch()).toEqual({ kind: 'unavailable' });
    expect(showing).toEqual([true, false]);
    expect(rewards.credits).toBe(0);
    backend.script.showFails = false;
    expect(await ads.watch()).toMatchObject({ kind: 'rewarded' });
  });

  it('rapid taps open one ad', async () => {
    const backend = fakeBackend();
    const { ads, rewards } = setup(backend);
    await ads.start();
    const results = await Promise.all([ads.watch(), ads.watch(), ads.watch()]);
    expect(results.map((r) => r.kind)).toEqual(['rewarded', 'busy', 'busy']);
    expect(backend.calls.filter((c) => c === 'show')).toHaveLength(1);
    expect(rewards.credits).toBe(30);
  });

  it('the daily cap: 5 paid ads per local day, then none (no ad is even shown), and a new day starts again', async () => {
    const backend = fakeBackend();
    const { ads, rewards, today } = setup(backend);
    await ads.start();
    for (let i = 0; i < MAX_REWARDED_ADS_PER_DAY; i++) expect((await ads.watch()).kind).toBe('rewarded');
    const shows = backend.calls.filter((c) => c === 'show').length;
    expect(await ads.watch()).toEqual({ kind: 'limit' });
    expect(backend.calls.filter((c) => c === 'show')).toHaveLength(shows);
    expect(rewards.credits).toBe(150);
    expect(rewards.grantAdReward(DAY, adRewardTransactionId(DAY, 6))).toEqual({ ok: false, reason: 'limit' });
    today.day = NEXT_DAY;
    expect(ads.remainingToday).toBe(5);
    expect((await ads.watch()).kind).toBe('rewarded');
    expect(rewards.current.adRewards).toEqual({ day: NEXT_DAY, count: 1 });
  });

  it('after an app restart, credits and today\'s count are kept (no extra ads, nothing reset)', async () => {
    const store = new MemoryStore();
    const first = setup(fakeBackend(), store);
    first.rewards.grant(DAY, { id: 'test:seed', amount: 70 });
    await first.ads.start();
    await first.ads.watch();
    await first.ads.watch();
    const again = setup(fakeBackend(), store);
    expect(again.rewards.credits).toBe(130);
    expect(again.ads.remainingToday).toBe(3);
    expect(again.rewards.nextAdRewardId(DAY)).toBe(adRewardTransactionId(DAY, 3));
  });

  it('if the wallet cannot be saved, the reward still counts now and is saved by the next successful write', async () => {
    const store = new MemoryStore();
    const { ads, rewards } = setup(fakeBackend(), store);
    await ads.start();
    store.failWrites = true;
    expect(await ads.watch()).toEqual({ kind: 'rewarded', credits: 30, saved: false });
    expect(rewards.credits).toBe(30);
    expect(readRewards(store.getItem(REWARDS_KEY)).value.wallet.credits).toBe(0); // not on disk yet
    store.failWrites = false;
    rewards.markTipSeen(DAY, 'tap'); // any later write
    expect(readRewards(store.getItem(REWARDS_KEY)).value).toMatchObject({ wallet: { credits: 30 }, adRewards: { day: DAY, count: 1 } });
  });
});

describe('rewarded ads: consent and platforms', () => {
  it('browsers have no ad SDK: nothing loads, watching explains instead of showing anything', async () => {
    const { ads, rewards } = setup(NO_ADS_BACKEND);
    await ads.start();
    expect(ads.state).toBe('unsupported');
    expect(ads.canOffer).toBe(false);
    expect(await ads.watch()).toEqual({ kind: 'unsupported' });
    expect(rewards.credits).toBe(0);
  });

  it('declined or unavailable consent: no ad is ever requested, and the game carries on', async () => {
    for (const consent of [{ canRequestAds: false, privacyOptionsRequired: true }, new Error('consent unavailable')]) {
      const backend = fakeBackend({ consent });
      const { ads } = setup(backend);
      await ads.start();
      expect(ads.state).toBe('not-permitted');
      expect(await ads.watch()).toEqual({ kind: 'not-permitted' });
      expect(backend.calls).toEqual(['consent']); // never initialized, loaded or shown
    }
  });

  it('consent is asked before the SDK starts; privacy options can allow ads later', async () => {
    const backend = fakeBackend({ consent: { canRequestAds: false, privacyOptionsRequired: true } });
    const { ads } = setup(backend);
    await ads.start();
    expect(ads.privacyOptionsRequired).toBe(true);
    await ads.showPrivacyOptions();
    expect(backend.calls).toEqual(['consent', 'privacy', 'initialize', 'load']);
    expect(ads.state).toBe('ready');
  });

  it('an SDK start-up failure leaves ads unavailable, never crashing the game', async () => {
    const { ads } = setup(fakeBackend({ initFails: true }));
    await expect(ads.start()).resolves.toBeUndefined();
    expect(ads.state).toBe('unavailable');
  });
});

describe('Shop "Earn credits" presentation', () => {
  const base = { remaining: 5, limit: 5, credits: 30 };
  it('shows a clear text and button for every state', () => {
    expect(presentEarn({ ...base, state: 'ready' })).toEqual({ status: '5 of 5 ads left today.', button: { label: 'Watch ad', enabled: true, busy: false } });
    expect(presentEarn({ ...base, state: 'loading' }).button).toEqual({ label: 'Loading…', enabled: false, busy: true });
    expect(presentEarn({ ...base, state: 'unavailable' }).button).toEqual({ label: 'Try again', enabled: true, busy: false });
    expect(presentEarn({ ...base, state: 'unavailable' }).status).toMatch(/online/);
    expect(presentEarn({ ...base, state: 'ready', remaining: 0 })).toEqual({ status: 'Daily limit reached (5 of 5). Come back tomorrow.', button: { label: 'Come back tomorrow', enabled: false, busy: false } });
    expect(presentEarn({ ...base, state: 'unsupported' }).button).toBeNull();
    expect(presentEarn({ ...base, state: 'not-permitted' }).button).toBeNull();
    expect(presentEarn({ ...base, state: 'showing' }).button?.enabled).toBe(false);
  });
});

describe('rewarded ads: saved data', () => {
  it('older saves have no ad rewards yet; bad values are repaired, never inflated', () => {
    const store = new MemoryStore();
    const rewards = setup(fakeBackend(), store).rewards;
    rewards.grant(DAY, { id: 'test:seed', amount: 10 });
    const raw = JSON.parse(store.getItem(REWARDS_KEY)!);
    delete raw.adRewards;
    expect(readRewards(JSON.stringify(raw)).value.adRewards).toEqual({ day: null, count: 0 });
    expect(readRewards(JSON.stringify({ ...raw, adRewards: { day: 'yesterday', count: 3 } })).value.adRewards).toEqual({ day: null, count: 0 });
    expect(readRewards(JSON.stringify({ ...raw, adRewards: { day: DAY, count: 99 } })).value.adRewards).toEqual({ day: DAY, count: 5 });
    expect(readRewards(JSON.stringify({ ...raw, adRewards: { day: DAY, count: -1 } })).value.adRewards).toEqual({ day: DAY, count: 0 });
  });

  it('existing credits are never reset: ad credits are added to the balance and to "earned"', async () => {
    const { ads, rewards } = setup();
    rewards.grant(DAY, { id: 'test:seed', amount: 245 });
    await ads.start();
    await ads.watch();
    expect(rewards.current.wallet).toMatchObject({ credits: 275, earned: 275 });
    vi.restoreAllMocks();
  });
});

describe('rewarded ads: Continue after Game Over', () => {
  it('pays no credits and is not limited by the daily credit cap; consent still applies', async () => {
    const { ads, rewards } = setup();
    await ads.start();
    for (let i = 0; i < MAX_REWARDED_ADS_PER_DAY; i++) await ads.watch();
    expect(await ads.watch()).toEqual({ kind: 'limit' });
    expect(ads.canOfferContinue).toBe(true);
    const credits = rewards.credits;
    expect(await ads.watchForContinue()).toEqual({ kind: 'rewarded', credits: 0, saved: true });
    expect(rewards.credits).toBe(credits);
    expect(rewards.current.adRewards.count).toBe(MAX_REWARDED_ADS_PER_DAY);

    const declined = setup(fakeBackend({ consent: { canRequestAds: false, privacyOptionsRequired: false } }));
    await declined.ads.start();
    expect(await declined.ads.watchForContinue()).toEqual({ kind: 'not-permitted' });
    expect(declined.ads.canOfferContinue).toBe(false);
  });

  it('closed early gives nothing; before ads have started nothing is shown at all', async () => {
    const { ads } = setup(fakeBackend({ rewardCalls: 0 }));
    expect(await ads.watchForContinue()).toEqual({ kind: 'busy' }); // not started yet
    await ads.start();
    expect(await ads.watchForContinue()).toEqual({ kind: 'dismissed' });
  });

});
