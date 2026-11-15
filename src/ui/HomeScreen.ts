import type { LevelData } from '../core/types';
import type { ClaimStatus } from '../daily/Daily';
import { league, leagueBadgeSvg } from '../league/leagues';
import { avatarSvg, type AvatarId } from '../profile/avatars';
import type { CosmeticId } from '../shop/catalog';
import type { PlayerProfile } from '../profile/Profile';
import { CHAPTER_SIZE, chapterCount, chapterName, chapterSummary, chapterTiles, revealedLevelCount, type LevelTile } from '../progress/chapters';
import { completedCount, MAX_STARS, nextLevelToPlay, type Progress } from '../progress/Progress';
import { t } from '../i18n/translate';
import { requireElement, starIcons, svgIcon } from './dom';
import { journeyLayout, pathThrough, scrollToStop } from './journeyMap';

export interface HomeActions {
  onPlay(levelId: number): void;
  onLevels(): void;
  onProfile(): void;
  onSettings(): void;
  onDaily(): void;
  onAchievements(): void;
  onLeague(): void;
  onShop(): void;
}

/** The Home league button: locked progress, or the league and today's points. */
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
  /** The avatar frame bought in the Shop and equipped (null or missing: none). */
  readonly frame?: CosmeticId | null;
}

/**
 * The start screen, as a journey map: every level the player may see on one
 * winding path that scrolls (level 1 at the bottom), a banner opening each
 * chapter, the next level lit and pulsing, one big Play button and a dock
 * for the rest of the game. Completed chapters and the current one are
 * shown (see revealedLevelCount); above them a locked teaser says the next
 * chapter appears once this one is finished.
 */
export class HomeScreen {
  private readonly avatar = requireElement('home-avatar');
  private avatarId?: AvatarId;
  /** The equipped Shop frame, drawn around the avatar. */
  private frame: CosmeticId | null = null;
  private readonly nickname = requireElement('home-nickname');
  private readonly playLabel = requireElement('home-play-label');
  private readonly playButton = requireElement('btn-home-play');
  private readonly credits = requireElement('home-credits');
  private readonly creditsButton = requireElement('btn-home-credits');
  private readonly dailyDot = requireElement('home-daily-dot');
  private readonly achievements = requireElement('home-achievements');
  private readonly achievementsButton = requireElement('btn-home-achievements');
  private readonly leagueButton = requireElement('btn-home-league');
  private readonly leagueBadge = requireElement('home-league-badge');
  private readonly leagueName = requireElement('home-league-name');
  private readonly leagueStatus = requireElement('home-league-status');
  private readonly journey = requireElement('home-journey');
  private readonly map = requireElement('home-journey-map');
  private readonly path = requireElement('home-journey-path');
  private readonly marks = requireElement('home-journey-marks');
  private readonly stops = requireElement<HTMLOListElement>('home-journey-stops');
  private shownTier = -1;
  private playLevel = 1;
  /** The level left unfinished (marked on the map), if any. */
  private resumeLevel: number | null = null;
  /** The level the map was last scrolled to, so a refresh doesn't fight the player's own scrolling. */
  private scrolledTo = 0;

  constructor(
    private readonly levels: readonly LevelData[],
    actions: HomeActions,
  ) {
    this.playButton.addEventListener('click', () => actions.onPlay(this.playLevel));
    requireElement('btn-home-profile').addEventListener('click', () => actions.onProfile());
    requireElement('btn-home-avatar').addEventListener('click', () => actions.onProfile());
    this.creditsButton.addEventListener('click', () => actions.onDaily());
    this.achievementsButton.addEventListener('click', () => actions.onAchievements());
    this.leagueButton.addEventListener('click', () => actions.onLeague());
    requireElement('btn-home-shop').addEventListener('click', () => actions.onShop());
    requireElement('btn-home-settings').addEventListener('click', () => actions.onSettings());
    // One delegated listener for every stop; the stops are rebuilt on each render.
    this.stops.addEventListener('click', (event) => {
      const stop = (event.target as Element).closest<HTMLButtonElement>('button[data-level]');
      if (stop && !stop.disabled) actions.onPlay(Number(stop.dataset.level));
    });
  }

  /** `resumeLevel`: a level left unfinished, which opens where the player left it. */
  render(profile: PlayerProfile, progress: Progress, resumeLevel: number | null = null): void {
    const levelCount = this.levels.length;
    this.avatarId = profile.avatar;
    this.avatar.innerHTML = avatarSvg(profile.avatar, this.frame); // static, trusted markup
    this.nickname.textContent = profile.nickname; // player text: never parsed as HTML

    const done = completedCount(progress, levelCount);
    const allDone = done === levelCount;
    this.playLevel = allDone ? 1 : nextLevelToPlay(progress, levelCount);
    if (resumeLevel !== null && allDone) this.playLevel = resumeLevel; // finish the replay left open
    const resuming = resumeLevel === this.playLevel;
    const level = this.playLevel;
    this.playLabel.textContent = resuming
      ? t('home.playResume', { level })
      : allDone
        ? t('home.playAgain')
        : t(done === 0 ? 'home.playStart' : 'home.playContinue', { level });
    this.playButton.setAttribute('aria-label', resuming ? t('home.playResumeAria', { level }) : allDone ? t('home.playAgainAria') : t('home.playAria', { level }));
    this.resumeLevel = resumeLevel;
    this.renderMap(progress, allDone && !resuming ? levelCount : this.playLevel);
  }

  /** Every chapter reached, in one column; scrolls to `focusLevel` when it changes. */
  private renderMap(progress: Progress, focusLevel: number): void {
    const levelCount = this.levels.length;
    const revealed = revealedLevelCount(progress, levelCount);
    const chapters = chapterCount(revealed);
    const tiles: LevelTile[] = [];
    for (let c = 1; c <= chapters; c++) tiles.push(...chapterTiles(progress, c, levelCount));
    const teaser = revealed < levelCount;
    const layout = journeyLayout(tiles.length, { chapterSize: CHAPTER_SIZE, teaser });

    this.map.style.height = `${layout.height}px`;
    this.path.setAttribute('viewBox', `0 0 100 ${Math.max(1, layout.height)}`);
    const [trail, lit] = Array.from(this.path.querySelectorAll('path'));
    trail?.setAttribute('d', layout.path);
    // The lit part of the trail runs up to the furthest stop the player can play.
    const reached = tiles.reduce((last, t, i) => (t.state === 'locked' || t.state === 'test' ? last : i), -1);
    lit?.setAttribute('d', pathThrough(layout.stops.slice(0, reached + 1)));

    const banners = layout.banners.map((b) => this.banner(progress, b.chapter, b.y));
    if (teaser && layout.teaser !== null) banners.push(this.teaser(chapters + 1, layout.teaser));
    this.marks.replaceChildren(...banners);
    this.stops.setAttribute('aria-label', t('home.mapAria', { last: revealed }));
    this.stops.replaceChildren(
      ...tiles.map((tile, i) => this.stop(tile, layout.stops[i].x, layout.stops[i].y, (i + 1) % CHAPTER_SIZE === 0 || i === levelCount - 1)),
    );

    // Bring the level to play into view: once per level, not on every refresh.
    if (focusLevel !== this.scrolledTo && this.journey.clientHeight > 0) {
      this.scrolledTo = focusLevel;
      this.journey.scrollTop = scrollToStop(layout, focusLevel - 1, this.journey.clientHeight);
    }
  }

  /** The sign that opens a chapter: its number, name and progress. */
  private banner(progress: Progress, chapter: number, y: number): HTMLElement {
    const summary = chapterSummary(progress, chapter, this.levels.length);
    const el = document.createElement('div');
    el.className = 'journey-banner';
    el.classList.toggle('journey-banner--done', summary.completed === summary.levels);
    el.style.top = `${y}px`;
    const label = document.createElement('span');
    label.className = 'journey-banner__label';
    label.textContent = t('home.chapter', { chapter });
    const title = document.createElement('span');
    title.className = 'journey-banner__title';
    title.textContent = chapterName(chapter);
    const meta = document.createElement('span');
    meta.className = 'journey-banner__meta';
    const { completed, levels, stars, maxStars } = summary;
    meta.textContent = t('home.bannerMeta', { completed, levels, stars, maxStars });
    el.append(label, title, meta);
    return el;
  }

  /** The locked sign above the last chapter reached: the next one appears once this one is finished. */
  private teaser(chapter: number, y: number): HTMLElement {
    const el = document.createElement('div');
    el.className = 'journey-banner journey-banner--locked';
    el.style.top = `${y}px`;
    const icon = svgIcon('icon-lock', 'journey-banner__lock');
    const label = document.createElement('span');
    label.className = 'journey-banner__label';
    label.textContent = t('home.chapter', { chapter });
    const text = document.createElement('span');
    text.className = 'journey-banner__meta';
    text.textContent = t('home.teaser', { chapter: chapter - 1 });
    el.append(icon, label, text);
    return el;
  }

  private stop(tile: LevelTile, x: number, y: number, final: boolean): HTMLLIElement {
    const level = this.levels[tile.id - 1];
    const { state, bestStars } = tile;
    const completed = state === 'completed';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.level = String(tile.id);
    button.className = `journey-stop journey-stop--${state}`;
    button.classList.toggle('journey-stop--final', final);
    button.classList.toggle('journey-stop--hard', level?.tier === 'hard');
    button.classList.toggle('journey-stop--very-hard', level?.tier === 'very hard');
    button.disabled = state === 'locked';
    const resumable = tile.id === this.resumeLevel && state !== 'locked';
    button.classList.toggle('journey-stop--resume', resumable);
    const description =
      state === 'test'
        ? t('home.stateTest')
        : state === 'locked'
          ? t('home.stateLocked')
          : state === 'current'
            ? t('home.stateCurrent')
            : !completed
              ? t('home.stateNotCompleted')
              : bestStars === null
                ? t('home.stateCompleted')
                : t('home.stateStars', { stars: bestStars, max: MAX_STARS });
    const parts = [t('home.level', { level: tile.id }), level?.name, description, resumable ? t('home.stateResume') : ''];
    button.setAttribute('aria-label', parts.filter(Boolean).join(', '));
    const number = document.createElement('span');
    number.className = 'journey-stop__number';
    if (state === 'locked') number.append(svgIcon('icon-lock', 'journey-stop__lock'));
    else number.textContent = String(tile.id);
    button.append(number);
    if (resumable) {
      const badge = document.createElement('span');
      badge.className = 'journey-stop__resume';
      badge.append(svgIcon('icon-next', 'journey-stop__resume-icon'));
      button.append(badge);
    }
    if (completed && bestStars !== null) {
      const stars = document.createElement('span');
      stars.className = 'journey-stop__stars';
      stars.append(...starIcons(bestStars));
      button.append(stars);
    }
    const item = document.createElement('li');
    item.className = 'journey__stop';
    item.style.left = `${x * 100}%`;
    item.style.top = `${y}px`;
    item.append(button);
    return item;
  }

  /** The League dock button: the league badge and today's points, or a lock until it opens. */
  renderLeague(l: HomeLeague): void {
    const tier = league(l.tier);
    if (this.shownTier !== (l.unlocked ? tier.order : -2)) {
      this.leagueBadge.innerHTML = l.unlocked ? leagueBadgeSvg(tier.order, 26) : '<svg class="icon" aria-hidden="true"><use href="#icon-lock" /></svg>';
      this.shownTier = l.unlocked ? tier.order : -2;
    }
    this.leagueButton.classList.toggle('dock__item--locked', !l.unlocked);
    if (!l.unlocked) {
      this.leagueName.textContent = t('home.league');
      this.leagueStatus.textContent = `${l.levelsDone}/${l.unlockAt}`;
      this.leagueButton.setAttribute('aria-label', t('home.leagueLockedAria', { level: l.unlockAt, done: l.levelsDone }));
      return;
    }
    this.leagueName.textContent = tier.name;
    this.leagueStatus.textContent = `${l.today}/${l.maxToday}`;
    const goal =
      tier.promoteAt === null
        ? t('home.leagueGoalTop')
        : l.today >= tier.promoteAt
          ? t('home.leagueGoalReached')
          : t('home.leagueGoalPromote', { points: tier.promoteAt });
    this.leagueButton.setAttribute('aria-label', t('home.leagueAria', { league: tier.name, today: l.today, max: l.maxToday, goal }));
  }

  /**
   * The credits chip (with a dot while today's daily reward waits) and the
   * achievements count on the dock. Play stays the main action.
   */
  renderRewards(r: HomeRewards): void {
    const frame = r.frame ?? null;
    if (frame !== this.frame) {
      this.frame = frame;
      if (this.avatarId) this.avatar.innerHTML = avatarSvg(this.avatarId, frame); // static, trusted markup
    }
    const ready = r.status === 'available';
    this.credits.textContent = String(r.credits);
    this.dailyDot.hidden = !ready;
    this.creditsButton.classList.toggle('credits-chip--ready', ready);
    const sentences = [
      t('home.creditsAria', { credits: r.credits }),
      ready ? t('home.creditsReady', { day: r.today.day, credits: r.today.credits }) : '',
      r.streak > 0 ? t('home.creditsStreak', { count: r.streak }) : '',
      t('home.creditsOpen'),
    ];
    this.creditsButton.setAttribute('aria-label', sentences.filter(Boolean).join(' '));
    this.achievements.textContent = `${r.unlocked}/${r.total}`;
    this.achievementsButton.setAttribute('aria-label', t('home.achievementsAria', { unlocked: r.unlocked, total: r.total }));
  }
}
