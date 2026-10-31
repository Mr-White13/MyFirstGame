import { formatClock } from '../core/time';
import type { GameSnapshot } from '../core/types';
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

  private tick(el: HTMLElement): void {
    el.classList.remove('is-ticking');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-ticking');
  }
}
