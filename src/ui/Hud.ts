import { formatClock } from '../core/time';
import { BONUS_MAX, STREAK_TAPS, STREAK_WINDOW_MS, type GameSnapshot } from '../core/types';
import { requireElement } from './dom';

/**
 * In-game heads-up display: level title and timer, lives (three hearts), arrows left
 * with a progress meter, plus the back and restart buttons. Updates only when
 * the game state changes (never per frame); the visual easing is all CSS.
 */
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

export class Hud {
  private readonly title = requireElement('hud-title');
  private readonly level = requireElement('hud-level');
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

  update(snapshot: GameSnapshot): void {
    const sameRun = this.last?.levelId === snapshot.levelId;
    if (!this.challenge) this.level.textContent = String(snapshot.levelId);
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
   * Streak progress: one pip per successful tap in the current streak. The
   * pips drain over STREAK_WINDOW_MS (CSS) and go out when the window has
   * passed, which is when the next tap would start a new streak. When a bonus
   * fires, the pips flash and "+N" floats up beside them.
   */
  private renderStreak(snapshot: GameSnapshot, previous: GameSnapshot | undefined): void {
    clearTimeout(this.streakTimer);
    const pips = [...this.momentum.children] as HTMLElement[];
    const light = (count: number) => pips.forEach((pip, index) => pip.classList.toggle('momentum__pip--on', index < count));
    light(snapshot.streak);
    this.momentum.classList.remove('momentum--timing');
    if (snapshot.streak > 0) {
      void this.momentum.offsetWidth; // restart the drain animation
      this.momentum.classList.add('momentum--timing');
      this.streakTimer = setTimeout(() => {
        light(0);
        this.momentum.classList.remove('momentum--timing');
      }, STREAK_WINDOW_MS);
    }
    const earned = previous ? snapshot.cascadeClears - previous.cascadeClears : 0;
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
        : `Streak: ${snapshot.streak} of ${STREAK_TAPS} quick taps (up to ${BONUS_MAX} bonus clears)`,
    );
  }

  private tick(el: HTMLElement): void {
    el.classList.remove('is-ticking');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-ticking');
  }
}
