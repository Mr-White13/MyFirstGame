import { THEME_CHOICES, type ThemeChoice } from '../settings/Settings';
import { requireElement } from './dom';

export interface ThemePickerHandlers {
  /** The picker opened: gameplay should pause (the level timer stops). */
  readonly onOpen: () => void;
  /** The picker closed, by a choice or without one: gameplay may resume. */
  readonly onClose: () => void;
  /** A theme was chosen. Applied at once by the settings; the board only redraws. */
  readonly onPick: (theme: ThemeChoice) => void;
  /** The saved choice, to mark as selected. */
  readonly current: () => ThemeChoice;
}

/**
 * The HUD's compact theme picker: a palette button that opens a small card
 * with Dark Neon, Light, Colorful and System. Choosing one applies it and
 * closes the card; a tap outside (caught by a transparent backdrop, so it
 * never reaches the board) or Back / Escape closes it without a change.
 * Open and close are reported exactly once each, so the level timer is
 * paused for exactly as long as the card is open.
 */
export class ThemePicker {
  private readonly button = requireElement<HTMLButtonElement>('btn-theme');
  private readonly popover = requireElement('theme-popover');
  private readonly backdrop = requireElement('theme-backdrop');
  private open = false;

  constructor(private readonly handlers: ThemePickerHandlers) {
    this.button.addEventListener('click', () => (this.open ? this.close() : this.show()));
    this.backdrop.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.close();
    });
    this.popover.addEventListener('click', (event) => {
      const option = (event.target as Element).closest?.<HTMLElement>('[data-theme-choice]');
      const choice = option?.dataset.themeChoice;
      if (!THEME_CHOICES.includes(choice as ThemeChoice)) return;
      this.pick(choice as ThemeChoice);
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.render();
    this.popover.hidden = false;
    this.backdrop.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.handlers.onOpen();
    this.popover.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
  }

  /** Closes without changing anything. Safe to call when already closed. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.popover.hidden = true;
    this.backdrop.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    this.handlers.onClose();
  }

  pick(theme: ThemeChoice): void {
    if (!this.open) return;
    this.handlers.onPick(theme);
    this.close();
  }

  private render(): void {
    const current = this.handlers.current();
    this.popover.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach((option) => {
      option.setAttribute('aria-checked', String(option.dataset.themeChoice === current));
    });
  }
}
