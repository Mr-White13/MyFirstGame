import { AVATARS, avatarSvg, type AvatarId } from '../profile/avatars';
import { searchCountries } from '../profile/countries';
import { Overlay, requireElement } from './dom';

/** Grid of avatars; picking one closes the dialog. */
export class AvatarPicker {
  private readonly overlay = new Overlay(requireElement('avatar-dialog'));
  private readonly grid = requireElement('avatar-grid');
  private onPick: (id: AvatarId) => void = () => {};

  constructor() {
    requireElement('btn-avatar-close').addEventListener('click', () => this.overlay.hide());
    this.overlay.element.addEventListener('click', (event) => {
      if (event.target === this.overlay.element) this.overlay.hide();
    });
    this.grid.addEventListener('click', (event) => {
      const option = (event.target as Element).closest<HTMLButtonElement>('button[data-avatar]');
      if (!option) return;
      this.onPick(option.dataset.avatar as AvatarId);
      this.overlay.hide();
    });
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(current: AvatarId, onPick: (id: AvatarId) => void): void {
    this.onPick = onPick;
    this.grid.replaceChildren(
      ...AVATARS.map((a) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'avatar-option';
        button.dataset.avatar = a.id;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(a.id === current));
        button.setAttribute('aria-label', a.name);
        const art = document.createElement('span');
        art.className = 'avatar';
        art.innerHTML = avatarSvg(a.id); // static, trusted markup
        const name = document.createElement('span');
        name.className = 'avatar-option__name';
        name.textContent = a.name;
        button.append(art, name);
        return button;
      }),
    );
    this.overlay.show(this.grid.querySelector<HTMLElement>('[aria-selected="true"]') ?? undefined);
  }

  close(): void {
    this.overlay.hide();
  }
}

/** Searchable country list with a "Prefer not to say" option at the top. */
export class CountryPicker {
  private readonly overlay = new Overlay(requireElement('country-dialog'));
  private readonly search = requireElement<HTMLInputElement>('country-search');
  private readonly list = requireElement('country-list');
  private current: string | null = null;
  private onPick: (code: string | null) => void = () => {};

  constructor() {
    requireElement('btn-country-close').addEventListener('click', () => this.overlay.hide());
    this.overlay.element.addEventListener('click', (event) => {
      if (event.target === this.overlay.element) this.overlay.hide();
    });
    this.search.addEventListener('input', () => this.renderList());
    this.list.addEventListener('click', (event) => {
      const option = (event.target as Element).closest<HTMLButtonElement>('button[data-country]');
      if (!option) return;
      const code = option.dataset.country ?? '';
      this.onPick(code === '' ? null : code);
      this.overlay.hide();
    });
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(current: string | null, onPick: (code: string | null) => void): void {
    this.current = current;
    this.onPick = onPick;
    this.search.value = '';
    this.renderList();
    this.overlay.show(this.search);
  }

  close(): void {
    this.overlay.hide();
  }

  private renderList(): void {
    const query = this.search.value;
    const items: HTMLLIElement[] = [];
    if (query.trim() === '') items.push(this.option('', '—', 'Prefer not to say'));
    for (const c of searchCountries(query)) items.push(this.option(c.code, c.flag, c.name));
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'country-list__empty';
      empty.textContent = 'No matching country';
      items.push(empty);
    }
    this.list.replaceChildren(...items);
  }

  private option(code: string, flag: string, name: string): HTMLLIElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.country = code;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String((this.current ?? '') === code));
    const flagEl = document.createElement('span');
    flagEl.className = 'country-list__flag';
    flagEl.setAttribute('aria-hidden', 'true');
    flagEl.textContent = flag;
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    button.append(flagEl, nameEl);
    const item = document.createElement('li');
    item.append(button);
    return item;
  }
}
