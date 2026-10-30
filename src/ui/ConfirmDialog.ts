import { Overlay, requireElement } from './dom';

/** "Leave level?" confirmation. `ask()` resolves true for Leave, false for Keep playing. */
export class ConfirmDialog {
  private readonly overlay = new Overlay(requireElement('confirm-dialog'));
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

  ask(): Promise<boolean> {
    this.close(false); // settle any previous question first
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
