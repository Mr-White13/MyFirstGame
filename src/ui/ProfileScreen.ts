import { formatPrecise, formatTotal } from '../core/time';
import type { LevelData } from '../core/types';
import { avatarSvg } from '../profile/avatars';
import { countryName, flagEmoji } from '../profile/countries';
import { rankFor, validateNickname, type PlayerProfile } from '../profile/Profile';
import type { PlayerStats } from '../profile/Stats';
import { completedCount, MAX_STARS, perfectLevels, totalStars, type Progress } from '../progress/Progress';
import { requireElement } from './dom';

export interface ProfileActions {
  onBack(): void;
  onRename(nickname: string): void;
  onChangeAvatar(): void;
  onChangeCountry(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Player identity, progress summary, lifetime statistics and per-level records. */
export class ProfileScreen {
  private readonly avatar = requireElement('profile-avatar');
  private readonly nickname = requireElement('profile-nickname');
  private readonly nameView = requireElement('profile-name-view');
  private readonly nameForm = requireElement<HTMLFormElement>('profile-name-form');
  private readonly nameInput = requireElement<HTMLInputElement>('profile-name-input');
  private readonly nameError = requireElement('profile-name-error');
  private readonly countryFlag = requireElement('profile-country-flag');
  private readonly countryName = requireElement('profile-country-name');
  private readonly rank = requireElement('profile-rank');
  private readonly records = requireElement('profile-records');
  private current?: PlayerProfile;

  constructor(
    private readonly levels: readonly LevelData[],
    private readonly actions: ProfileActions,
  ) {
    requireElement('btn-profile-back').addEventListener('click', () => actions.onBack());
    this.avatar.addEventListener('click', () => actions.onChangeAvatar());
    requireElement('btn-country').addEventListener('click', () => actions.onChangeCountry());
    requireElement('btn-edit-name').addEventListener('click', () => this.startEditing());
    requireElement('btn-name-cancel').addEventListener('click', () => this.stopEditing());
    this.nameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const check = validateNickname(this.nameInput.value);
      if (!check.ok) {
        this.nameError.textContent = check.message;
        this.nameInput.focus();
        return;
      }
      this.actions.onRename(check.value);
      this.stopEditing();
    });
    this.nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation(); // don't also trigger "back"
        this.stopEditing();
      }
    });
  }

  /** True while the nickname field is open (Escape should close it, not leave the screen). */
  get isEditing(): boolean {
    return !this.nameForm.hidden;
  }

  render(profile: PlayerProfile, progress: Progress, stats: PlayerStats): void {
    this.current = profile;
    const levelCount = this.levels.length;
    this.avatar.innerHTML = avatarSvg(profile.avatar); // static, trusted markup
    this.nickname.textContent = profile.nickname; // player text: never parsed as HTML
    this.countryFlag.textContent = profile.country ? flagEmoji(profile.country) : '';
    this.countryName.textContent = profile.country ? countryName(profile.country) : 'Add country';

    const stars = totalStars(progress, levelCount);
    const rank = rankFor(stars);
    this.rank.textContent = rank.nextAt === null ? rank.title : `${rank.title} · ${rank.nextAt - stars} ★ to next`;

    this.setText('profile-levels', completedCount(progress, levelCount));
    this.setText('profile-levels-total', levelCount);
    this.setText('profile-stars', stars);
    this.setText('profile-stars-total', levelCount * MAX_STARS);
    this.setText('profile-perfect', perfectLevels(progress, levelCount));

    this.setText('stat-time', formatTotal(stats.playTimeMs));
    this.setText('stat-clears', stats.successfulRuns);
    this.setText('stat-failed', stats.failedRuns);
    this.setText('stat-flawless', stats.flawlessRuns);
    this.setText('stat-arrows', stats.arrowsCleared);
    this.setText('stat-chains', stats.chainClears);
    const since = new Date(stats.trackedSince).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    this.setText('profile-tracked-since', `Runs counted since ${since}. "Levels cleared" includes replays.`);

    this.records.replaceChildren(...this.levels.map((level) => this.recordRow(level, progress)));
  }

  private recordRow(level: LevelData, progress: Progress): HTMLLIElement {
    const record = progress.completed[level.id];
    const item = document.createElement('li');
    item.className = 'record';
    if (!record) item.classList.add('record--empty');

    const name = document.createElement('span');
    name.className = 'record__level';
    name.textContent = `Level ${level.id}`;
    const time = document.createElement('span');
    time.className = 'record__time';
    time.textContent = record?.bestTimeMs != null ? formatPrecise(record.bestTimeMs) : record ? 'not timed' : '–';
    time.classList.toggle('record__time--none', record?.bestTimeMs == null);
    const stars = document.createElement('span');
    stars.className = 'record__stars';
    const earned = record?.bestStars ?? 0;
    for (let i = 0; i < MAX_STARS; i++) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', i < earned ? 'star-mini star-mini--earned' : 'star-mini');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#icon-spark');
      svg.append(use);
      stars.append(svg);
    }
    item.setAttribute(
      'aria-label',
      record
        ? `Level ${level.id}: best time ${time.textContent}, ${record.bestStars === null ? 'unranked' : `${earned} stars`}`
        : `Level ${level.id}: not completed`,
    );
    item.append(name, time, stars);
    return item;
  }

  private startEditing(): void {
    this.nameInput.value = this.current?.nickname ?? '';
    this.nameError.textContent = '';
    this.nameView.hidden = true;
    this.nameForm.hidden = false;
    this.nameInput.focus();
    this.nameInput.select();
  }

  private stopEditing(): void {
    this.nameForm.hidden = true;
    this.nameView.hidden = false;
    this.nameError.textContent = '';
  }

  private setText(id: string, value: string | number): void {
    requireElement(id).textContent = String(value);
  }
}
