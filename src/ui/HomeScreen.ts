import type { LevelData } from '../core/types';
import type { ClaimStatus } from '../daily/Daily';
import { league, leagueBadgeSvg } from '../league/leagues';
import { avatarSvg } from '../profile/avatars';
import type { PlayerProfile } from '../profile/Profile';
import { completedCount, MAX_STARS, nextLevelToPlay, totalStars, type Progress } from '../progress/Progress';
import { requireElement } from './dom';

export interface HomeActions {
  onPlay(levelId: number): void;
  onLevels(): void;
  onProfile(): void;
  onSettings(): void;
  onDaily(): void;
  onAchievements(): void;
  onLeague(): void;
}

/** The Home league card: locked progress, or the league and today's points. */
export interface HomeLeague {
  readonly unlocked: boolean;
  readonly levelsDone: number;
  readonly unlockAt: number;
  readonly tier: number;
  readonly today: number;
  readonly maxToday: number;
}

/** What the Home screen shows about daily rewards and achievements. */
export interface HomeRewards {
  readonly credits: number;
  readonly streak: number;
  readonly status: ClaimStatus;
  /** Today's cycle day and reward. */
  readonly today: { readonly day: number; readonly credits: number };
  /** Tomorrow's reward if the streak continues. */
  readonly next: { readonly day: number; readonly credits: number };
  readonly unlocked: number;
  readonly total: number;
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
  private readonly credits = requireElement('home-credits');
  private readonly creditsButton = requireElement('btn-home-credits');
  private readonly streak = requireElement('home-streak');
  private readonly dailyStatus = requireElement('home-daily-status');
  private readonly dailyButton = requireElement('btn-home-daily');
  private readonly dailyLabel = requireElement('home-daily-label');
  private readonly achievements = requireElement('home-achievements');
  private readonly achievementsButton = requireElement('btn-home-achievements');
  private readonly leagueButton = requireElement('btn-home-league');
  private readonly leagueBadge = requireElement('home-league-badge');
  private readonly leagueName = requireElement('home-league-name');
  private readonly leagueStatus = requireElement('home-league-status');
  private readonly leagueFill = requireElement('home-league-fill');
  private shownTier = -1;
  private playLevel = 1;

  constructor(
    private readonly levels: readonly LevelData[],
    actions: HomeActions,
  ) {
    requireElement('btn-home-play').addEventListener('click', () => actions.onPlay(this.playLevel));
    requireElement('btn-home-levels').addEventListener('click', () => actions.onLevels());
    requireElement('btn-home-profile').addEventListener('click', () => actions.onProfile());
    requireElement('btn-home-avatar').addEventListener('click', () => actions.onProfile());
    this.dailyButton.addEventListener('click', () => actions.onDaily());
    this.creditsButton.addEventListener('click', () => actions.onDaily());
    this.achievementsButton.addEventListener('click', () => actions.onAchievements());
    this.leagueButton.addEventListener('click', () => actions.onLeague());
    requireElement('btn-home-settings').addEventListener('click', () => actions.onSettings());
    requireElement('btn-home-settings-tile').addEventListener('click', () => actions.onSettings());
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

  /**
   * One compact daily card and two small numbers: the streak and today's
   * reward state, the credits balance, and achievement progress. Play stays
   * the main action; the card only asks for attention when a reward is ready.
   */
  /** One row: the league badge and today's points, or how far the player is from unlocking it. */
  renderLeague(l: HomeLeague): void {
    const t = league(l.tier);
    if (this.shownTier !== (l.unlocked ? t.order : -2)) {
      this.leagueBadge.innerHTML = l.unlocked ? leagueBadgeSvg(t.order, 44) : '<svg class="icon" aria-hidden="true"><use href="#icon-lock" /></svg>';
      this.shownTier = l.unlocked ? t.order : -2;
    }
    this.leagueButton.classList.toggle('league-card--locked', !l.unlocked);
    if (!l.unlocked) {
      this.leagueName.textContent = 'Daily League';
      this.leagueStatus.textContent = `Unlocks after Level ${l.unlockAt} · ${l.levelsDone}/${l.unlockAt}`;
      this.leagueFill.style.width = `${(l.levelsDone / l.unlockAt) * 100}%`;
      this.leagueButton.setAttribute('aria-label', `Daily League, locked: unlocks after level ${l.unlockAt}. ${l.levelsDone} of ${l.unlockAt} levels done.`);
      return;
    }
    this.leagueName.textContent = `${t.name} League`;
    const goal = t.promoteAt === null ? 'top league' : l.today >= t.promoteAt ? 'promotion reached' : `promote at ${t.promoteAt}`;
    this.leagueStatus.textContent = `Today ${l.today}/${l.maxToday} ⚡ · ${goal}`;
    this.leagueFill.style.width = `${(l.today / l.maxToday) * 100}%`;
    this.leagueButton.setAttribute('aria-label', `${t.name} League: ${l.today} of ${l.maxToday} Energy Points today, ${goal}. Open the league.`);
  }

  renderRewards(r: HomeRewards): void {
    this.credits.textContent = String(r.credits);
    this.creditsButton.setAttribute('aria-label', `Energy Credits: ${r.credits}. Open daily rewards`);
    this.streak.textContent = r.streak > 0 ? `${r.streak}-day streak` : 'Start a streak';
    const ready = r.status === 'available';
    this.dailyButton.classList.toggle('daily-card__btn--ready', ready);
    this.dailyLabel.textContent = ready ? `Claim +${r.today.credits}` : 'Rewards';
    this.dailyStatus.textContent =
      r.status === 'available'
        ? `Day ${r.today.day} reward ready`
        : r.status === 'claimed'
          ? `Claimed today · Tomorrow +${r.next.credits}`
          : r.status === 'clock-back'
            ? 'Device date moved back: rewards resume later'
            : `Day ${r.today.day} reward`;
    this.achievements.textContent = `${r.unlocked}/${r.total}`;
    this.achievementsButton.setAttribute('aria-label', `Achievements: ${r.unlocked} of ${r.total} unlocked`);
  }
}
