import { calendar, claimStatus, nextReward, type DailyClaim, type DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import { Overlay, prefersReducedMotion, requireElement } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COUNT_UP_MS = 600;

/**
 * The daily check-in calendar: the 7-day cycle with claimed, missed, today's
 * and upcoming rewards, the streak and the balance. Claiming is the one
 * action; there are no countdowns or timers pushing the player.
 */
export class DailyDialog {
  private readonly overlay = new Overlay(requireElement('daily-dialog'));
  private readonly grid = requireElement('daily-grid');
  private readonly streak = requireElement('daily-streak');
  private readonly best = requireElement('daily-best');
  private readonly balance = requireElement('daily-balance');
  private readonly message = requireElement('daily-message');
  private readonly claimButton = requireElement<HTMLButtonElement>('btn-daily-claim');
  private shownCredits = 0;
  private countFrame = 0;

  constructor(onClaim: () => void) {
    this.claimButton.addEventListener('click', () => onClaim());
    requireElement('btn-daily-close').addEventListener('click', () => this.close());
    this.overlay.element.addEventListener('click', (event) => {
      if (event.target === this.overlay.element) this.close();
    });
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(): void {
    this.overlay.show(this.claimButton.disabled ? requireElement('btn-daily-close') : this.claimButton);
  }

  close(): void {
    this.overlay.hide();
  }

  render(state: DailyState, today: DayKey, credits: number): void {
    const status = claimStatus(state, today);
    this.streak.textContent = String(state.streak);
    this.best.textContent = `${state.longestStreak} ${state.longestStreak === 1 ? 'day' : 'days'}`;
    cancelAnimationFrame(this.countFrame);
    this.setBalance(credits);

    this.grid.replaceChildren(
      ...calendar(state, today).map((d) => {
        const li = document.createElement('li');
        li.className = `daily-day daily-day--${d.status}${d.day === 7 ? ' daily-day--big' : ''}`;
        const label = { claimed: 'claimed', missed: 'missed', today: 'today, ready to claim', upcoming: 'upcoming' }[d.status];
        li.setAttribute('aria-label', `Day ${d.day}: ${d.credits} Energy Credits, ${label}`);
        li.dataset.day = String(d.day);
        const name = document.createElement('span');
        name.className = 'daily-day__name';
        name.textContent = d.status === 'today' ? 'Today' : `Day ${d.day}`;
        const icon = document.createElementNS(SVG_NS, 'svg');
        icon.setAttribute('class', 'daily-day__icon');
        icon.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', d.status === 'claimed' ? '#icon-check' : '#icon-credit');
        icon.append(use);
        const amount = document.createElement('span');
        amount.className = 'daily-day__amount';
        amount.textContent = `+${d.credits}`;
        li.append(name, icon, amount);
        if (d.status === 'missed') {
          const tag = document.createElement('span');
          tag.className = 'daily-day__tag';
          tag.textContent = 'Missed';
          li.append(tag);
        }
        return li;
      }),
    );

    const ready = status === 'available';
    this.claimButton.disabled = !ready;
    const todayReward = calendar(state, today).find((d) => d.date === today);
    this.claimButton.textContent = ready ? `Claim +${todayReward?.credits ?? 0}` : status === 'claimed' ? 'Claimed today' : 'Not available';
    const next = nextReward(state, today);
    this.message.textContent =
      status === 'claimed'
        ? `Come back tomorrow for Day ${next.day}: +${next.credits}.`
        : status === 'clock-back'
          ? "Your device's date is earlier than a day you've already played. Rewards continue once that date has passed."
          : ready
            ? ''
            : 'Checking in…';
  }

  /** The claim animation: today's tile pops, "+N" floats up, the balance counts up. */
  celebrate(reward: DailyClaim, before: number, credits: number): void {
    const tile = this.grid.querySelector<HTMLElement>(`[data-day="${reward.day}"]`);
    const reduced = prefersReducedMotion();
    if (tile && !reduced) {
      tile.classList.add('daily-day--pop');
      const float = document.createElement('span');
      float.className = 'reward-float';
      float.textContent = `+${reward.credits}`;
      float.setAttribute('aria-hidden', 'true');
      tile.append(float);
      float.addEventListener('animationend', () => float.remove());
    }
    this.message.textContent = `+${reward.credits} Energy Credits claimed.`;
    this.setBalance(before);
    this.countTo(credits, reduced ? 0 : COUNT_UP_MS);
  }

  private countTo(target: number, duration: number): void {
    cancelAnimationFrame(this.countFrame);
    const from = this.shownCredits;
    if (duration === 0 || from === target) return this.setBalance(target);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.setBalance(Math.round(from + (target - from) * (1 - (1 - t) * (1 - t))));
      if (t < 1) this.countFrame = requestAnimationFrame(step);
    };
    this.countFrame = requestAnimationFrame(step);
  }

  private setBalance(credits: number): void {
    this.shownCredits = credits;
    this.balance.textContent = String(credits);
  }
}
