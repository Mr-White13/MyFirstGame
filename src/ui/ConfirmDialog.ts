import { Overlay, requireElement } from './dom';

export interface ConfirmQuestion {
  readonly title: string;
  readonly text: string;
  readonly confirm: string;
  readonly cancel: string;
}

/** The original question: leaving a level with an attempt in progress. */
export const LEAVE_LEVEL: ConfirmQuestion = {
  title: 'Leave level?',
  text: 'Your moves on this attempt will be lost. Saved progress is kept.',
  confirm: 'Leave',
  cancel: 'Keep playing',
};

export const RESTART_LEVEL: ConfirmQuestion = {
  title: 'Restart level?',
  text: 'This attempt starts over with full lives. Saved progress is kept.',
  confirm: 'Restart',
  cancel: 'Keep playing',
};

export const RESET_SETTINGS: ConfirmQuestion = {
  title: 'Reset settings?',
  text: 'Theme, sound, haptics, motion and gameplay options go back to their defaults. Your levels, stars, times, statistics and profile are kept.',
  confirm: 'Reset',
  cancel: 'Cancel',
};

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
    this.overlay.element.addEventListener('click', (event) => {
      if (event.target === this.overlay.element) this.close(false);
    });
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
