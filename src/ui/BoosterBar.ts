import { BOOSTER_IDS, BOOSTERS, type BoosterId } from '../boosters/Boosters';
import { t } from '../i18n/translate';
import { requireElement } from './dom';

/** What the booster toolbar shows (see BoosterController). */
export interface BoosterBarView {
  /** False in Daily League challenges: the league strip takes the row instead. */
  readonly visible: boolean;
  readonly credits: number;
  /** Test play: boosters are free, so costs read "Free". */
  readonly free: boolean;
  /** Boosters that would work if tapped now. The others are dimmed (still tappable, to explain why). */
  readonly available: Readonly<Record<BoosterId, boolean>>;
}

/**
 * The HUD's booster row: the Energy Credits balance, then Hint and Reveal,
 * each with its cost. A DOM view only: what a tap does is up to
 * BoosterController. Unavailable boosters use aria-disabled rather than
 * `disabled`, so a tap still reaches the controller, which explains why
 * (not enough credits, no free arrow…).
 */
export class BoosterBar {
  private readonly root = requireElement('boosters');
  private readonly creditsBox = requireElement('booster-credits');
  private readonly creditsValue = requireElement('booster-credits-value');
  private readonly buttons: Record<BoosterId, HTMLButtonElement>;

  constructor(onUse: (id: BoosterId) => void) {
    const find = (id: BoosterId) => {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-booster="${id}"]`);
      if (!button) throw new Error(`Missing booster button: ${id}`);
      button.addEventListener('click', () => onUse(id));
      return button;
    };
    this.buttons = { hint: find('hint'), reveal: find('reveal') };
  }

  render(view: BoosterBarView): void {
    this.root.hidden = !view.visible;
    if (!view.visible) return;
    this.creditsValue.textContent = String(view.credits);
    this.creditsBox.setAttribute('aria-label', t('game.creditsAria', { credits: view.credits }));
    for (const id of BOOSTER_IDS) {
      const b = BOOSTERS[id];
      const button = this.buttons[id];
      const { name, description } = b;
      const free = t('game.boosterFreeInTest');
      button.querySelector('[data-cost]')!.textContent = view.free ? t('game.boosterFree') : String(b.cost);
      button.setAttribute('aria-disabled', String(!view.available[id]));
      button.setAttribute('aria-label', t('game.boosterAria', { name, price: view.free ? free : t('game.boosterPriceAria', { cost: b.cost }), description }));
      button.title = t('game.boosterTitle', { name, price: view.free ? free : t('game.boosterPriceShort', { cost: b.cost }), description });
    }
  }

  /** A short pop on the button that was just used. */
  flash(id: BoosterId): void {
    const button = this.buttons[id];
    button.classList.remove('is-activated');
    void button.offsetWidth; // restart the CSS animation
    button.classList.add('is-activated');
  }
}
