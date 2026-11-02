import { avatarSvg, type AvatarId } from '../profile/avatars';
import { CATALOG, COSMETIC_SLOTS, SLOT_TITLES, type CosmeticId, type CosmeticItem, type CosmeticSlot, type CosmeticsState, type PurchaseBlock } from '../shop/catalog';
import type { ConfirmQuestion } from './ConfirmDialog';
import { presentEarn, type EarnView } from './earnView';
import { requireElement, svgIcon } from './dom';

export interface ShopActions {
  onBack(): void;
  /** Buy a not-yet-owned item (App asks for confirmation first). */
  onBuy(id: CosmeticId): void;
  /** Wear an owned item, or `null` for the free default. */
  onEquip(slot: CosmeticSlot, id: CosmeticId | null): void;
  onPlay(): void;
  /** "Watch ad" in Earn credits (an explicit tap; App shows the ad). */
  onWatchAd?(): void;
}

export interface ShopView {
  readonly credits: number;
  /** The player's avatar, shown in every preview. */
  readonly avatar: AvatarId;
  readonly cosmetics: CosmeticsState;
  /** Rewarded ads for credits (missing: the section is hidden). */
  readonly earn?: EarnView;
}

/** What a card offers: buy it, wear it, or it is already worn. */
export type CardState = 'buy' | 'equip' | 'equipped';

export function cardState(cosmetics: CosmeticsState, slot: CosmeticSlot, id: CosmeticId | null): CardState {
  if (cosmetics.equipped[slot] === id) return 'equipped';
  return id === null || cosmetics.owned.includes(id) ? 'equip' : 'buy';
}

/** The purchase confirmation: price, balance after, and that the item is permanent. */
export function purchaseQuestion(item: CosmeticItem, credits: number): ConfirmQuestion {
  return {
    title: `Buy ${item.name}?`,
    text: `${item.price} Energy Credits (you have ${credits}, ${credits - item.price} left after). Cosmetics are permanent: it stays yours, and you can equip or remove it any time.`,
    confirm: `Buy for ${item.price}`,
    cancel: 'Not now',
  };
}

/** Why a purchase didn't happen, for the player. Nothing was charged in any of these cases. */
export function purchaseMessage(item: CosmeticItem, reason: PurchaseBlock, credits: number): string {
  switch (reason) {
    case 'insufficient':
      return `${item.name} costs ${item.price} Energy Credits; you have ${credits}. Earn more from daily rewards and achievements.`;
    case 'owned':
      return `You already own ${item.name}.`;
    case 'not-saved':
      return "The purchase couldn't be saved on this device, so nothing was charged. Try again.";
    case 'unknown':
      return 'This item is not available.';
  }
}

/** The free default of a slot, shown first so a frame can always be taken off. */
const DEFAULTS: Readonly<Record<CosmeticSlot, { name: string; description: string }>> = {
  frame: { name: 'No frame', description: "Your avatar's own ring. Always free." },
};

/**
 * The Energy Credits Shop: the balance, then one section per item slot
 * (avatar frames today) with a preview of each item on the player's own
 * avatar. A card offers Buy (with its price), Equip (owned) or shows
 * Equipped. Cards the player can't afford stay tappable, so App can explain
 * the price. A DOM view only: buying and saving are App's and Rewards' job.
 */
export class ShopScreen {
  private readonly catalog = requireElement('shop-catalog');
  private readonly credits = requireElement('shop-credits');
  private readonly creditsWrap = requireElement('shop-credits-wrap');
  private readonly avatar = requireElement('shop-avatar');
  private readonly earnSection = requireElement('shop-earn');
  private readonly earnStatus = requireElement('shop-earn-status');
  private readonly earnOffer = requireElement('shop-earn-offer');
  private readonly watchButton = requireElement<HTMLButtonElement>('btn-shop-watch-ad');
  private last?: ShopView;

  constructor(actions: ShopActions) {
    requireElement('btn-shop-back').addEventListener('click', () => actions.onBack());
    requireElement('btn-shop-play').addEventListener('click', () => actions.onPlay());
    this.watchButton.addEventListener('click', () => actions.onWatchAd?.());
    this.catalog.addEventListener('click', (event) => {
      const button = (event.target as Element).closest?.<HTMLButtonElement>('[data-shop-action]');
      if (!button) return;
      const slot = button.dataset.slot as CosmeticSlot;
      const id = (button.dataset.item || null) as CosmeticId | null;
      if (button.dataset.shopAction === 'buy' && id) actions.onBuy(id);
      else if (button.dataset.shopAction === 'equip') actions.onEquip(slot, id);
    });
  }

  render(view: ShopView): void {
    this.last = view;
    this.credits.textContent = String(view.credits);
    this.creditsWrap.setAttribute('aria-label', `${view.credits} Energy Credits`);
    this.avatar.innerHTML = avatarSvg(view.avatar, view.cosmetics.equipped.frame); // static, trusted markup
    this.catalog.replaceChildren(...COSMETIC_SLOTS.map((slot) => this.section(slot, view)));
    this.renderEarn(view.earn);
  }

  /** A short glow on the balance after credits were earned. */
  celebrateEarn(): void {
    this.creditsWrap.classList.remove('is-ticking');
    void this.creditsWrap.offsetWidth; // restart the CSS animation
    this.creditsWrap.classList.add('is-ticking');
  }

  private renderEarn(earn: EarnView | undefined): void {
    this.earnSection.hidden = earn === undefined;
    if (!earn) return;
    const shown = presentEarn(earn);
    this.earnOffer.lastElementChild!.textContent = `+${earn.credits}`;
    this.earnStatus.textContent = shown.status;
    this.watchButton.hidden = shown.button === null;
    if (shown.button) {
      this.watchButton.textContent = shown.button.label;
      this.watchButton.disabled = !shown.button.enabled;
      this.watchButton.setAttribute('aria-busy', String(shown.button.busy));
      this.watchButton.setAttribute('aria-label', shown.button.enabled ? `${shown.button.label}: earn ${earn.credits} Energy Credits` : shown.button.label);
    }
  }

  /** A short unlock glow on a card that was just bought. */
  celebrate(id: CosmeticId): void {
    const card = this.catalog.querySelector<HTMLElement>(`[data-card="${id}"]`);
    if (!card) return;
    card.classList.remove('is-unlocked');
    void card.offsetWidth; // restart the CSS animation
    card.classList.add('is-unlocked');
  }

  private section(slot: CosmeticSlot, view: ShopView): HTMLElement {
    const section = document.createElement('section');
    section.className = 'shop-section';
    const heading = document.createElement('h2');
    heading.className = 'shop-section__title';
    heading.textContent = SLOT_TITLES[slot];
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    grid.append(this.card(slot, null, view), ...CATALOG.filter((item) => item.slot === slot).map((item) => this.card(slot, item, view)));
    section.append(heading, grid);
    return section;
  }

  private card(slot: CosmeticSlot, item: CosmeticItem | null, view: ShopView): HTMLElement {
    const id = item?.id ?? null;
    const state = cardState(view.cosmetics, slot, id);
    const name = item?.name ?? DEFAULTS[slot].name;
    const card = document.createElement('article');
    card.className = `shop-card shop-card--${state}`;
    card.dataset.card = id ?? `${slot}-none`;

    const preview = document.createElement('span');
    preview.className = 'avatar shop-card__preview';
    preview.innerHTML = avatarSvg(view.avatar, id); // static, trusted markup

    const title = document.createElement('h3');
    title.className = 'shop-card__name';
    title.textContent = name;
    const text = document.createElement('p');
    text.className = 'shop-card__text';
    text.textContent = item?.description ?? DEFAULTS[slot].description;

    const status = document.createElement('span');
    status.className = 'shop-card__status';
    if (state === 'equipped') status.textContent = 'Equipped';
    else if (item && state === 'equip') status.textContent = 'Owned';
    status.hidden = status.textContent === '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--small shop-card__action';
    button.dataset.slot = slot;
    button.dataset.item = id ?? '';
    if (state === 'buy') {
      const affordable = view.credits >= item!.price;
      button.dataset.shopAction = 'buy';
      button.classList.add('btn--primary');
      button.classList.toggle('is-unaffordable', !affordable);
      button.append(svgIcon('icon-credit', 'icon'), String(item!.price));
      button.setAttribute('aria-label', `Buy ${name} for ${item!.price} Energy Credits${affordable ? '' : `; you have ${view.credits}`}`);
    } else if (state === 'equip') {
      button.dataset.shopAction = 'equip';
      button.classList.add('btn--ghost');
      button.textContent = 'Equip';
      button.setAttribute('aria-label', `Equip ${name}`);
    } else {
      button.classList.add('btn--ghost');
      button.disabled = true;
      button.append(svgIcon('icon-check', 'icon'), 'Equipped');
      button.setAttribute('aria-label', `${name} is equipped`);
    }

    card.append(preview, title, text, status, button);
    return card;
  }

  /** The last view rendered (for tests). */
  get current(): ShopView | undefined {
    return this.last;
  }
}
