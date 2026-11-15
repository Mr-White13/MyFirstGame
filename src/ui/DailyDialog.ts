import { calendar, claimStatus, nextReward, type DailyClaim, type DailyState } from '../daily/Daily';
import type { DayKey } from '../daily/dayKey';
import { t } from '../i18n/translate';
import { Overlay, prefersReducedMotion, requireElement, svgIcon } from './dom';

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
  /** The text after the streak number ("-day streak"): plural in Spanish and Romanian, so set from code. */
  private readonly streakSuffix = requireElement('daily-dialog').querySelector<HTMLElement>('span[data-streak-suffix]');
  private readonly best = requireElement('daily-best');
  private readonly balance = requireElement('daily-balance');
  private readonly message = requireElement('daily-message');
  private readonly claimButton = requireElement<HTMLButtonElement>('btn-daily-claim');
  private shownCredits = 0;
  private countFrame = 0;

  /** `onShop`: "Spend credits in the Shop" (the dialog closes first). */
  constructor(onClaim: () => void, onShop?: () => void) {
    this.claimButton.addEventListener('click', () => onClaim());
    requireElement('btn-daily-shop').addEventListener('click', () => {
      this.close();
      onShop?.();
    });
    requireElement('btn-daily-close').addEventListener('click', () => this.close());
    this.overlay.onBackdropClick(() => this.close());
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
    if (this.streakSuffix) this.streakSuffix.textContent = t('rewards.dailyStreakSuffix', { count: state.streak });
    this.best.textContent = t('rewards.dailyBest', { count: state.longestStreak });
    cancelAnimationFrame(this.countFrame);
    this.setBalance(credits);

    this.grid.replaceChildren(
      ...calendar(state, today).map((d) => {
        const li = document.createElement('li');
        li.className = `daily-day daily-day--${d.status}${d.day === 7 ? ' daily-day--big' : ''}`;
        const label = ({ claimed: 'rewards.dailyDayClaimedAria', missed: 'rewards.dailyDayMissedAria', today: 'rewards.dailyDayTodayAria', upcoming: 'rewards.dailyDayUpcomingAria' } as const)[d.status];
        li.setAttribute('aria-label', t(label, { day: d.day, count: d.credits }));
        li.dataset.day = String(d.day);
        const name = document.createElement('span');
        name.className = 'daily-day__name';
        name.textContent = d.status === 'today' ? t('rewards.dailyToday') : t('rewards.dailyDay', { day: d.day });
        const icon = svgIcon(d.status === 'claimed' ? 'icon-check' : 'icon-credit', 'daily-day__icon');
        const amount = document.createElement('span');
        amount.className = 'daily-day__amount';
        amount.textContent = `+${d.credits}`;
        li.append(name, icon, amount);
        if (d.status === 'missed') {
          const tag = document.createElement('span');
          tag.className = 'daily-day__tag';
          tag.textContent = t('rewards.dailyMissed');
          li.append(tag);
        }
        return li;
      }),
    );

    const ready = status === 'available';
    this.claimButton.disabled = !ready;
    const todayReward = calendar(state, today).find((d) => d.date === today);
    this.claimButton.textContent = ready
      ? t('rewards.dailyClaim', { credits: todayReward?.credits ?? 0 })
      : status === 'claimed'
        ? t('rewards.dailyClaimedToday')
        : t('rewards.dailyNotAvailable');
    const next = nextReward(state, today);
    this.message.textContent =
      status === 'claimed'
        ? t('rewards.dailyComeBack', { day: next.day, credits: next.credits })
        : status === 'clock-back'
          ? t('rewards.dailyClockBack')
          : ready
            ? ''
            : t('rewards.dailyChecking');
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
    this.message.textContent = t('rewards.dailyClaimed', { count: reward.credits });
    this.setBalance(before);
    this.countTo(credits, reduced ? 0 : COUNT_UP_MS);
  }

  private countTo(target: number, duration: number): void {
    cancelAnimationFrame(this.countFrame);
    const from = this.shownCredits;
    if (duration === 0 || from === target) return this.setBalance(target);
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      this.setBalance(Math.round(from + (target - from) * (1 - (1 - k) * (1 - k))));
      if (k < 1) this.countFrame = requestAnimationFrame(step);
    };
    this.countFrame = requestAnimationFrame(step);
  }

  private setBalance(credits: number): void {
    this.shownCredits = credits;
    this.balance.textContent = String(credits);
  }
}
