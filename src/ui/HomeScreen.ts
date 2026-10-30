import type { LevelData } from '../core/types';
import { avatarSvg } from '../profile/avatars';
import type { PlayerProfile } from '../profile/Profile';
import { completedCount, MAX_STARS, nextLevelToPlay, totalStars, type Progress } from '../progress/Progress';
import { requireElement } from './dom';

export interface HomeActions {
  onPlay(levelId: number): void;
  onLevels(): void;
  onProfile(): void;
  /** A feature that isn't available yet (settings, events). */
  onComingSoon(feature: string): void;
}

/** The start screen: identity, the next level to play, progress and the main menu. */
export class HomeScreen {
  private readonly avatar = requireElement('home-avatar');
  private readonly nickname = requireElement('home-nickname');
  private readonly nextLabel = requireElement('home-next-label');
  private readonly nextLevel = requireElement('home-next-level');
  private readonly nextGrid = requireElement('home-next-grid');
  private readonly playLabel = requireElement('home-play-label');
  private readonly count = requireElement('home-progress-count');
  private readonly total = requireElement('home-progress-total');
  private readonly fill = requireElement('home-progress-fill');
  private readonly stars = requireElement('home-stars');
  private readonly starsTotal = requireElement('home-stars-total');
  private playLevel = 1;

  constructor(
    private readonly levels: readonly LevelData[],
    actions: HomeActions,
  ) {
    requireElement('btn-home-play').addEventListener('click', () => actions.onPlay(this.playLevel));
    requireElement('btn-home-levels').addEventListener('click', () => actions.onLevels());
    requireElement('btn-home-profile').addEventListener('click', () => actions.onProfile());
    requireElement('btn-home-avatar').addEventListener('click', () => actions.onProfile());
    requireElement('btn-home-events').addEventListener('click', () => actions.onComingSoon('Events'));
    requireElement('btn-home-settings').addEventListener('click', () => actions.onComingSoon('Settings'));
    requireElement('btn-home-settings-tile').addEventListener('click', () => actions.onComingSoon('Settings'));
  }

  render(profile: PlayerProfile, progress: Progress): void {
    const levelCount = this.levels.length;
    this.avatar.innerHTML = avatarSvg(profile.avatar); // static, trusted markup
    this.nickname.textContent = profile.nickname; // player text: never parsed as HTML

    const done = completedCount(progress, levelCount);
    const allDone = done === levelCount;
    this.playLevel = allDone ? 1 : nextLevelToPlay(progress, levelCount);
    const level = this.levels[this.playLevel - 1];
    this.nextLabel.textContent = allDone ? 'All levels complete' : done === 0 ? 'First level' : 'Next level';
    this.nextLevel.textContent = String(this.playLevel);
    this.nextGrid.textContent = level ? `${level.rows}×${level.cols}` : '';
    this.playLabel.textContent = allDone ? 'Play again' : done === 0 ? 'Play' : 'Continue';

    this.count.textContent = String(done);
    this.total.textContent = String(levelCount);
    this.fill.style.width = `${(done / levelCount) * 100}%`;
    this.stars.textContent = String(totalStars(progress, levelCount));
    this.starsTotal.textContent = String(levelCount * MAX_STARS);
  }
}
