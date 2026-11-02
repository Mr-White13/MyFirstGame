import { formatClock } from '../core/time';
import { BONUS_CLEARS, STREAK_TAPS, STREAK_WINDOW_MS, type GameSnapshot, type LevelData } from '../core/types';
import { requireElement } from './dom';

/** What the HUD shows during a Daily League challenge. */
export interface ChallengeHud {
  /** 1..3 */
  readonly number: number;
  /** Energy Arrows of this challenge collected today (0..4). */
  readonly collected: number;
  readonly perChallenge: number;
  /** Energy Points today (0..12). */
  readonly today: number;
  readonly maxToday: number;
  readonly leagueName: string;
}

/**
 * In-game heads-up display: level title and timer, lives (three hearts), arrows left
 * with a progress meter, plus the back and restart buttons. Updates only when
 * the game state changes (never per frame); the visual easing is all CSS.
 */
export class Hud {
  private readonly title = requireElement('hud-title');
  private readonly level = requireElement('hud-level');
  /** Under the title: a named level's name, else HARD / VERY HARD, coloured by tier; hidden for normal levels and challenges. */
  private readonly name = requireElement('hud-name');
  private readonly league = requireElement('hud-league');
  private readonly energy = requireElement('hud-energy');
  private readonly energyWrap = requireElement('hud-energy-wrap');
  private readonly leagueName = requireElement('hud-league-name');
  private readonly points = requireElement('hud-points');
  private challenge: ChallengeHud | null = null;
  private readonly resetViewButton = requireElement<HTMLButtonElement>('btn-reset-view');
  private readonly hearts = requireElement('hud-hearts');
  private readonly remaining = requireElement('hud-remaining');
  private readonly progress = requireElement('hud-progress');
  private readonly backButton = requireElement<HTMLButtonElement>('btn-back');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private readonly time = requireElement('hud-time');
  private readonly momentum = requireElement('hud-momentum');
  private readonly bonus = requireElement('hud-bonus');
  private streakTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly timer = requireElement('hud-timer');
  private shownTime = '';
  private last?: GameSnapshot;

  constructor(
    /** A level's name and difficulty tier, if it has them (see LevelData.name and LevelData.tier). */
    private readonly levelInfo: (levelId: number) => Pick<LevelData, 'name' | 'tier'> | undefined = () => undefined,
  ) {}

  update(snapshot: GameSnapshot): void {
    const sameRun = this.last?.levelId === snapshot.levelId;
    if (!this.challenge) this.level.textContent = String(snapshot.levelId);
    if (!sameRun) this.renderName(snapshot.levelId);
    this.remaining.textContent = String(snapshot.remaining);
    const cleared = snapshot.total === 0 ? 0 : (snapshot.total - snapshot.remaining) / snapshot.total;
    this.progress.style.transform = `scaleX(${cleared})`;
    // Nothing to restart before the first move or mistake.
    this.restartButton.disabled = snapshot.moves === 0 && snapshot.mistakes === 0;

    this.renderHearts(snapshot.lives, sameRun && this.last !== undefined && snapshot.lives < this.last.lives);
    this.renderStreak(snapshot, sameRun ? this.last : undefined);
    if (sameRun && this.last && snapshot.remaining < this.last.remaining) this.tick(this.remaining);
    this.last = snapshot;
  }

  /** Shows the level time. Writes to the DOM only when the displayed text changes (about once a second). */
  setTime(ms: number): void {
    const text = formatClock(ms);
    if (text === this.shownTime) return;
    this.shownTime = text;
    this.time.textContent = text;
  }

  /**
   * Switches the HUD between a regular level (null) and a Daily League
   * challenge: "Daily 2/3", plus a strip with Energy Arrows collected, the
   * league and today's points. Updating the numbers ticks the counter.
   */
  setChallenge(info: ChallengeHud | null): void {
    const before = this.challenge;
    this.challenge = info;
    this.renderName(this.last?.levelId);
    this.league.hidden = info === null;
    this.backButton.setAttribute('aria-label', info ? 'Back to the league' : 'Back to levels');
    this.restartButton.setAttribute('aria-label', info ? 'Restart challenge' : 'Restart level');
    if (!info) {
      this.title.textContent = 'Level';
      if (this.last) this.level.textContent = String(this.last.levelId);
      return;
    }
    this.title.textContent = 'Daily';
    this.level.textContent = `${info.number}/3`;
    this.energy.textContent = String(info.collected);
    this.energyWrap.lastChild!.textContent = `/${info.perChallenge}`;
    this.energyWrap.setAttribute('aria-label', `${info.collected} of ${info.perChallenge} Energy Arrows collected`);
    this.leagueName.textContent = info.leagueName;
    this.points.textContent = String(info.today);
    if (before && info.collected > before.collected) this.tick(this.energy);
  }

  /**
   * Shows or hides the clock. Hiding is only visual: the attempt is still
   * timed, and the completion dialog still shows the time.
   */
  setTimerVisible(visible: boolean): void {
    this.timer.hidden = !visible;
  }

  private renderName(levelId: number | undefined): void {
    const info = this.challenge || levelId === undefined ? undefined : this.levelInfo(levelId);
    const text = info?.name ?? info?.tier?.toUpperCase();
    this.name.textContent = text ?? '';
    this.name.hidden = text === undefined;
    this.name.classList.toggle('hud__name--hard', info?.tier === 'hard');
    this.name.classList.toggle('hud__name--very-hard', info?.tier === 'very hard');
    // A very hard level's name flickers on with the board's power-up wave.
    this.name.classList.remove('is-powering-up');
    if (info?.tier === 'very hard') {
      void this.name.offsetWidth; // restart the CSS animation
      this.name.classList.add('is-powering-up');
    }
  }

  /** The Reset zoom control on the board: shown only while the board is zoomed in. */
  setZoomed(zoomed: boolean): void {
    this.resetViewButton.hidden = !zoomed;
  }

  onResetView(handler: () => void): void {
    this.resetViewButton.addEventListener('click', handler);
  }

  onBack(handler: () => void): void {
    this.backButton.addEventListener('click', handler);
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener('click', handler);
  }

  /** Full hearts first, lost hearts last; the heart that was just lost plays a short break animation. */
  private renderHearts(lives: number, justLost: boolean): void {
    const hearts = [...this.hearts.children] as SVGElement[];
    hearts.forEach((heart, index) => {
      const full = index < lives;
      heart.classList.toggle('heart--lost', !full);
      heart.classList.remove('heart--breaking');
      if (justLost && index === lives) {
        void heart.getBoundingClientRect(); // restart the CSS animation
        heart.classList.add('heart--breaking');
      }
    });
    this.hearts.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'} left`);
    this.hearts.classList.toggle('hearts--last', lives === 1);
  }

  /**
   * Streak progress: one pip per successful tap in the rolling window. The
   * pips drain over STREAK_WINDOW_MS (CSS) and go out once the window has
   * passed since the last tap. While the bonus is cooling down the pips are
   * dimmed. When a bonus fires, the pips flash and "+N" floats up.
   */
  private renderStreak(snapshot: GameSnapshot, previous: GameSnapshot | undefined): void {
    clearTimeout(this.streakTimer);
    const pips = [...this.momentum.children] as HTMLElement[];
    const light = (count: number) => pips.forEach((pip, index) => pip.classList.toggle('momentum__pip--on', index < count));
    light(snapshot.streak);
    this.momentum.classList.toggle('momentum--cooldown', snapshot.bonusCooldown > 0);
    this.momentum.classList.remove('momentum--timing');
    if (snapshot.streak > 0) {
      void this.momentum.offsetWidth; // restart the drain animation
      this.momentum.classList.add('momentum--timing');
      this.streakTimer = setTimeout(() => {
        light(0);
        this.momentum.classList.remove('momentum--timing');
      }, STREAK_WINDOW_MS);
    }
    const earned = previous ? snapshot.bonusClears - previous.bonusClears : 0;
    if (earned > 0) {
      this.bonus.textContent = `+${earned}`;
      this.tick(this.bonus);
      this.momentum.classList.remove('momentum--burst');
      void this.momentum.offsetWidth;
      this.momentum.classList.add('momentum--burst');
    }
    this.momentum.setAttribute(
      'aria-label',
      earned > 0
        ? `Streak bonus: ${earned} arrows cleared`
        : snapshot.bonusCooldown > 0
          ? `Streak bonus recharging: ${snapshot.bonusCooldown} more clears`
          : `Streak: ${snapshot.streak} of ${STREAK_TAPS} taps within ${STREAK_WINDOW_MS / 1000} s (bonus clears ${BONUS_CLEARS})`,
    );
  }

  private tick(el: HTMLElement): void {
    el.classList.remove('is-ticking');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-ticking');
  }
}
