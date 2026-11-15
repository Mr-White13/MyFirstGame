/**
 * The Energy Credits Shop catalog: permanent cosmetic items, bought once
 * with credits from the existing wallet. Pure data and rules: purchases are
 * saved by Rewards.buyCosmetic, the screen is ui/ShopScreen.ts.
 *
 * Each item fills a `slot` (what it customises). Only avatar frames exist
 * today; later categories (arrow trails, special effects, seasonal items)
 * add a slot and items here without changing how buying or saving works.
 * Boosters are not sold here: they are bought directly during a level.
 */
import { t, type MessageKey } from '../i18n/translate';

export type CosmeticSlot = 'frame';

export const COSMETIC_SLOTS: readonly CosmeticSlot[] = ['frame'];

/** Initial balancing values, in Energy Credits: change prices here only. */
export const COSMETIC_PRICES = {
  'frame-cyber': 150,
  'frame-plasma': 250,
  'frame-elite': 400,
  'frame-inferno': 500,
} as const;

export type CosmeticId = keyof typeof COSMETIC_PRICES;

export interface CosmeticItem {
  readonly id: CosmeticId;
  readonly slot: CosmeticSlot;
  /** Name in the current language (looked up on each read: `rewards.item-<id>`). */
  readonly name: string;
  /** Description in the current language (`rewards.item-<id>-desc`). */
  readonly description: string;
  readonly price: number;
}

/** An item whose name and description follow the language (getters, so no t() while modules load). */
const cosmetic = (id: CosmeticId, slot: CosmeticSlot): CosmeticItem => ({
  id,
  slot,
  get name() {
    return t(`rewards.item-${id}` as MessageKey);
  },
  get description() {
    return t(`rewards.item-${id}-desc` as MessageKey);
  },
  price: COSMETIC_PRICES[id],
});

export const CATALOG: readonly CosmeticItem[] = [cosmetic('frame-cyber', 'frame'), cosmetic('frame-plasma', 'frame'), cosmetic('frame-elite', 'frame'), cosmetic('frame-inferno', 'frame')];

/** Section titles in the Shop, one per slot (in the current language, read at render time). */
export const SLOT_TITLES: Readonly<Record<CosmeticSlot, string>> = {
  get frame() {
    return t('rewards.slotFrame');
  },
};

export function cosmeticById(id: unknown): CosmeticItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

export function isCosmeticId(id: unknown): id is CosmeticId {
  return cosmeticById(id) !== undefined;
}

/** The wallet transaction id of buying an item: one per item, so it can only ever be paid once. */
export const shopTransactionId = (id: CosmeticId): string => `shop:${id}`;

/** What the player owns and wears. `equipped[slot]` null = the free default (no frame). */
export interface CosmeticsState {
  readonly owned: readonly CosmeticId[];
  readonly equipped: Readonly<Record<CosmeticSlot, CosmeticId | null>>;
}

export function createCosmetics(): CosmeticsState {
  return { owned: [], equipped: { frame: null } };
}

/**
 * Validates stored cosmetics: unknown or repeated items are dropped, and an
 * equipped item must be owned and fit its slot (otherwise the free default).
 * `paid`: transaction ids already in the wallet. An item that was paid for
 * counts as owned even if the owned list lost it, so a purchase is never lost
 * or charged twice.
 */
export function readCosmetics(data: unknown, paid: readonly string[] = []): CosmeticsState {
  const c = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const listed = Array.isArray(c.owned) ? c.owned.filter(isCosmeticId) : [];
  const fromWallet = CATALOG.filter((item) => paid.includes(shopTransactionId(item.id))).map((item) => item.id);
  const owned = CATALOG.map((item) => item.id).filter((id) => listed.includes(id) || fromWallet.includes(id));
  const stored = typeof c.equipped === 'object' && c.equipped !== null ? (c.equipped as Record<string, unknown>) : {};
  const equipped = Object.fromEntries(
    COSMETIC_SLOTS.map((slot) => {
      const id = stored[slot];
      return [slot, isCosmeticId(id) && owned.includes(id) && cosmeticById(id)!.slot === slot ? id : null];
    }),
  ) as Record<CosmeticSlot, CosmeticId | null>;
  return { owned, equipped };
}

/** Why an item can't be bought right now. */
export type PurchaseBlock = 'unknown' | 'owned' | 'insufficient' | 'not-saved';

/** Owned items in a slot plus `null` (the free default) can be equipped; anything else is refused. */
export function canEquip(state: CosmeticsState, slot: CosmeticSlot, id: CosmeticId | null): boolean {
  if (id === null) return true;
  const item = cosmeticById(id);
  return item !== undefined && item.slot === slot && state.owned.includes(id);
}
