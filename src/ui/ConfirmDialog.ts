import { t, type MessageKey } from '../i18n/translate';
import { Overlay, requireElement } from './dom';

export interface ConfirmQuestion {
  readonly title: string;
  readonly text: string;
  readonly confirm: string;
  readonly cancel: string;
}

/**
 * A question whose text is looked up when read (getters), so it is always in
 * the current language and never translated while modules load.
 */
function question(title: MessageKey, text: MessageKey, confirm: MessageKey, cancel: MessageKey): ConfirmQuestion {
  return {
    get title() {
      return t(title);
    },
    get text() {
      return t(text);
    },
    get confirm() {
      return t(confirm);
    },
    get cancel() {
      return t(cancel);
    },
  };
}

/** The original question: leaving a level with an attempt in progress. */
export const LEAVE_LEVEL: ConfirmQuestion = question('game.leaveTitle', 'game.leaveText', 'game.leaveConfirm', 'game.keepPlaying');

export const RESTART_LEVEL: ConfirmQuestion = question('game.restartTitle', 'game.restartText', 'game.restartConfirm', 'game.keepPlaying');

export const RESET_SETTINGS: ConfirmQuestion = question('game.resetTitle', 'game.resetText', 'game.resetConfirm', 'game.cancel');

/**
 * A yes/no confirmation (leave level, restart level, reset settings).
 * `ask()` resolves true for the confirm button, false for cancel, the
 * backdrop or Escape.
 */
export class ConfirmDialog {
  private readonly overlay = new Overlay(requireElement('confirm-dialog'));
  private readonly title = requireElement('confirm-title');
  private readonly text = requireElement('confirm-text');
  private readonly okButton = requireElement<HTMLButtonElement>('btn-confirm-ok');
  private readonly cancelButton = requireElement<HTMLButtonElement>('btn-confirm-cancel');
  private resolve?: (confirmed: boolean) => void;

  constructor() {
    this.okButton.addEventListener('click', () => this.close(true));
    this.cancelButton.addEventListener('click', () => this.close(false));
    // Tapping the dimmed backdrop counts as "keep playing".
    this.overlay.onBackdropClick(() => this.close(false));
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  ask(question: ConfirmQuestion = LEAVE_LEVEL): Promise<boolean> {
    this.close(false); // settle any previous question first
    this.title.textContent = question.title;
    this.text.textContent = question.text;
    this.okButton.textContent = question.confirm;
    this.cancelButton.textContent = question.cancel;
    this.overlay.show(this.cancelButton);
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  close(confirmed: boolean): void {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = undefined;
    this.overlay.hide();
    resolve(confirmed);
  }
}
