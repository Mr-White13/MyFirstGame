import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { AVATARS, avatarSvg } from '../profile/avatars';
import { createProgress } from '../progress/Progress';
import { createStats } from '../profile/Stats';
import { readRewards, REWARDS_KEY, Rewards, serializeRewards, createRewards } from '../rewards/Rewards';
import { MemoryStore } from '../testing/memoryStore';
import { cardState } from '../ui/ShopScreen';
import { CATALOG, canEquip, COSMETIC_PRICES, createCosmetics, readCosmetics, shopTransactionId, type CosmeticId } from './catalog';

const DAY = '2026-11-02';

function setup(credits: number, store = new MemoryStore()) {
  const rewards = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store);
  if (credits > 0) rewards.grant(DAY, { id: 'test:seed', amount: credits });
  return { rewards, store, reload: () => new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store) };
}

describe('catalog', () => {
  it('offers the four avatar frames at their configured prices', () => {
    expect(CATALOG.map((i) => [i.name, i.price])).toEqual([
      ['Cyber Frame', 150],
      ['Plasma Frame', 250],
      ['Elite Frame', 400],
      ['Inferno Frame', 500],
    ]);
    expect(CATALOG.every((i) => i.slot === 'frame' && i.price === COSMETIC_PRICES[i.id] && i.description.length > 0)).toBe(true);
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length);
  });
});

describe('avatar frames', () => {
  it('render around every avatar: one SVG, the avatar art kept, balanced markup, no element ids', () => {
    for (const avatar of AVATARS) {
      const plain = avatarSvg(avatar.id);
      expect(plain).not.toContain('avatar-frame');
      for (const item of CATALOG) {
        const framed = avatarSvg(avatar.id, item.id);
        expect(framed.match(/<svg/g)).toHaveLength(1);
        expect(framed).toContain(`avatar-frame--${item.id.replace('frame-', '')}`);
        expect(framed).toContain('class="avatar-svg--framed"');
        // The avatar itself is unchanged: the frame is only added on top.
        expect(framed.replace(' class="avatar-svg--framed"', '').startsWith(plain.replace(/\s*<\/svg>$/, ''))).toBe(true);
        expect((framed.match(/<g\b/g) ?? []).length).toBe((framed.match(/<\/g>/g) ?? []).length);
        expect(framed).not.toMatch(/\sid="/); // no ids that could clash when a frame is shown twice
        expect(framed).not.toMatch(/NaN|undefined/);
      }
    }
  });

  it('a missing frame renders the plain avatar exactly as before', () => {
    for (const avatar of AVATARS) expect(avatarSvg(avatar.id, null)).toBe(avatarSvg(avatar.id));
  });
});

describe('buying', () => {
  it('a successful purchase charges the price once, unlocks the item and equips it, in one write', () => {
    const { rewards, store } = setup(300);
    store.writes = [];
    const result = rewards.buyCosmetic('frame-plasma');
    expect(result).toMatchObject({ ok: true, item: { id: 'frame-plasma' } });
    expect(store.writes).toEqual([REWARDS_KEY]);
    expect(rewards.credits).toBe(50);
    expect(rewards.current.cosmetics).toEqual({ owned: ['frame-plasma'], equipped: { frame: 'frame-plasma' } });
    expect(rewards.current.wallet.applied).toContain(shopTransactionId('frame-plasma'));
    expect(rewards.current.wallet.earned).toBe(300); // spending never lowers what was earned
  });

  it('insufficient credits: nothing changes and nothing is written', () => {
    const { rewards, store } = setup(149);
    store.writes = [];
    expect(rewards.buyCosmetic('frame-cyber')).toEqual({ ok: false, reason: 'insufficient' });
    expect(rewards.credits).toBe(149);
    expect(rewards.current.cosmetics).toEqual(createCosmetics());
    expect(store.writes).toEqual([]);
    expect(setup(150).rewards.buyCosmetic('frame-cyber').ok).toBe(true); // exactly enough is enough
  });

  it('an item is bought only once: buying it again (or tapping fast) never charges twice', () => {
    const { rewards } = setup(1000);
    const results = [rewards.buyCosmetic('frame-elite'), rewards.buyCosmetic('frame-elite'), rewards.buyCosmetic('frame-elite')];
    expect(results.map((r) => r.ok)).toEqual([true, false, false]);
    expect(results[1]).toEqual({ ok: false, reason: 'owned' });
    expect(rewards.credits).toBe(600);
    expect(rewards.current.cosmetics.owned).toEqual(['frame-elite']);
  });

  it('unknown items are refused', () => {
    const { rewards } = setup(1000);
    expect(rewards.buyCosmetic('frame-gold-plated')).toEqual({ ok: false, reason: 'unknown' });
    expect(rewards.credits).toBe(1000);
  });

  it('the balance never goes negative across many purchases', () => {
    const { rewards } = setup(700);
    for (const item of CATALOG) rewards.buyCosmetic(item.id);
    expect(rewards.credits).toBeGreaterThanOrEqual(0);
    expect(rewards.credits).toBe(700 - 150 - 250); // Elite (400) no longer fits after Cyber + Plasma; Inferno neither
    expect(rewards.current.cosmetics.owned).toEqual(['frame-cyber', 'frame-plasma']);
  });

  it('if the write fails, the purchase does not happen at all: no charge, no unlock, not even in memory', () => {
    const { rewards, store } = setup(500);
    const saved = store.getItem(REWARDS_KEY);
    store.failWrites = true;
    expect(rewards.buyCosmetic('frame-inferno')).toEqual({ ok: false, reason: 'not-saved' });
    expect(rewards.credits).toBe(500);
    expect(rewards.current.cosmetics.owned).toEqual([]);
    expect(store.getItem(REWARDS_KEY)).toBe(saved);
    store.failWrites = false;
    expect(rewards.buyCosmetic('frame-inferno').ok).toBe(true); // works once storage does
    expect(rewards.credits).toBe(0);
  });

  it('without any storage a purchase is refused (it could not be kept)', () => {
    const rewards = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, null);
    rewards.grant(DAY, { id: 'test:seed', amount: 500 });
    expect(rewards.buyCosmetic('frame-cyber')).toEqual({ ok: false, reason: 'not-saved' });
    expect(rewards.credits).toBe(500);
  });
});

describe('equipping', () => {
  it('equips any owned frame, unequips back to the free default, and refuses frames not owned', () => {
    const { rewards } = setup(1000);
    rewards.buyCosmetic('frame-cyber');
    rewards.buyCosmetic('frame-plasma');
    expect(rewards.current.cosmetics.equipped.frame).toBe('frame-plasma'); // the newest purchase is worn
    expect(rewards.equipCosmetic(DAY, 'frame', 'frame-cyber')).toBe(true);
    expect(rewards.current.cosmetics.equipped.frame).toBe('frame-cyber');
    expect(rewards.equipCosmetic(DAY, 'frame', null)).toBe(true);
    expect(rewards.current.cosmetics.equipped.frame).toBeNull();
    expect(rewards.equipCosmetic(DAY, 'frame', 'frame-inferno')).toBe(false);
    expect(rewards.current.cosmetics.equipped.frame).toBeNull();
    expect(rewards.credits).toBe(600); // equipping is free
  });

  it('shop cards show Buy, Equip (owned) and Equipped', () => {
    const state = { owned: ['frame-cyber'] as CosmeticId[], equipped: { frame: 'frame-cyber' as CosmeticId | null } };
    expect(cardState(state, 'frame', 'frame-cyber')).toBe('equipped');
    expect(cardState(state, 'frame', null)).toBe('equip');
    expect(cardState(state, 'frame', 'frame-elite')).toBe('buy');
    expect(cardState(createCosmetics(), 'frame', null)).toBe('equipped');
    expect(canEquip(state, 'frame', 'frame-elite')).toBe(false);
  });
});

describe('saved data', () => {
  it('ownership and the equipped frame survive a reload', () => {
    const { rewards, reload } = setup(1000);
    rewards.buyCosmetic('frame-elite');
    rewards.buyCosmetic('frame-cyber');
    rewards.equipCosmetic(DAY, 'frame', 'frame-elite');
    const again = reload();
    expect(again.current.cosmetics).toEqual({ owned: ['frame-cyber', 'frame-elite'], equipped: { frame: 'frame-elite' } });
    expect(again.credits).toBe(450);
    expect(again.buyCosmetic('frame-elite')).toEqual({ ok: false, reason: 'owned' });
  });

  it('existing players (saves from before the Shop) keep everything and start with no cosmetics', () => {
    const old = {
      version: 1,
      daily: createRewards().daily,
      wallet: { credits: 320, earned: 400, applied: ['daily:2026-10-30', 'achievement:first-escape', 'booster:hint:1'] },
      achievements: {},
      bestChain: 3,
      boosters: { used: { hint: 1, reveal: 0, heart: 0 }, introduced: true },
    };
    const { value, status } = readRewards(JSON.stringify(old));
    expect(status).toBe('current');
    expect(value).toMatchObject({ wallet: old.wallet, bestChain: 3, boosters: old.boosters, cosmetics: { owned: [], equipped: { frame: null } } });
    expect(readRewards(serializeRewards(value)).value).toEqual(value);
  });

  it('corrupted cosmetics are repaired field by field, never granting what was not paid', () => {
    const paid = [shopTransactionId('frame-cyber')];
    expect(readCosmetics({ owned: ['frame-cyber', 'frame-cyber', 'frame-free-money', 7, null], equipped: { frame: 'frame-inferno' } }, paid)).toEqual({
      owned: ['frame-cyber'],
      equipped: { frame: null }, // Inferno is not owned
    });
    expect(readCosmetics('nonsense')).toEqual(createCosmetics());
    expect(readCosmetics({ owned: 'all', equipped: [] })).toEqual(createCosmetics());
    expect(readCosmetics({ owned: ['frame-plasma'], equipped: { frame: 'frame-plasma' } })).toEqual({ owned: ['frame-plasma'], equipped: { frame: 'frame-plasma' } });
  });

  it('an item paid for is owned even if the owned list was lost, so it is never charged twice', () => {
    const store = new MemoryStore();
    const { rewards } = setup(500, store);
    rewards.buyCosmetic('frame-plasma');
    const raw = JSON.parse(store.getItem(REWARDS_KEY)!);
    store.setItem(REWARDS_KEY, JSON.stringify({ ...raw, cosmetics: { owned: [], equipped: {} } }));
    const again = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store);
    expect(again.current.cosmetics.owned).toEqual(['frame-plasma']);
    expect(again.buyCosmetic('frame-plasma')).toEqual({ ok: false, reason: 'owned' });
    expect(again.credits).toBe(250);
  });

  it('unreadable rewards data is backed up and the game starts clean, as for every save', () => {
    const store = new MemoryStore();
    store.setItem(REWARDS_KEY, '{broken');
    const { rewards } = setup(0, store);
    expect(rewards.current.cosmetics).toEqual(createCosmetics());
    expect(store.getItem(`${REWARDS_KEY}.backup`)).toBe('{broken');
  });
});
