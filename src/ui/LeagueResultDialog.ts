import type { LeagueNotice } from '../league/League';
import { league, leagueBadgeSvg } from '../league/leagues';
import { Overlay, requireElement } from './dom';

export type NoticeKind = 'promoted' | 'relegated' | 'mixed' | 'retained';

/** How a settled notice should be presented: a dialog for a league change, a short toast otherwise. */
export function noticeKind(n: LeagueNotice): NoticeKind {
  if (n.toTier > n.fromTier) return 'promoted';
  if (n.toTier < n.fromTier) return 'relegated';
  if (n.promotions || n.relegations) return 'mixed';
  return 'retained';
}

/** One line summarising a notice (also used for the compact "league kept" toast). */
export function noticeText(n: LeagueNotice): string {
  const to = league(n.toTier).name;
  const played = n.lastPlayed ? `You scored ${n.lastPlayed.points} ${n.lastPlayed.points === 1 ? 'point' : 'points'} on your last league day. ` : '';
  const span = n.daysSettled > 1 ? `Over the last ${n.daysSettled} days: ` : '';
  switch (noticeKind(n)) {
    case 'promoted':
      return `${played}${span}Welcome to ${to}. New targets apply from today.`;
    case 'relegated':
      return n.lastPlayed && n.daysSettled === 1
        ? `${played}That was below the target to stay, so you continue in ${to} today. Earn points to climb back.`
        : `${played}${span}days without points moved you to ${to}. Play a challenge to start climbing again.`;
    case 'mixed':
      return `${played}${span}you moved up and down and are back in ${to}.`;
    case 'retained':
      return `${played}You stay in ${to}.`;
  }
}

/** The result of settled league days, shown once and then acknowledged. Neutral wording for moving down. */
export class LeagueResultDialog {
  private readonly overlay = new Overlay(requireElement('league-result'));
  private readonly okButton = requireElement<HTMLButtonElement>('btn-league-result-ok');
  private onClose?: () => void;

  constructor() {
    this.okButton.addEventListener('click', () => this.close());
    this.overlay.element.addEventListener('click', (event) => {
      if (event.target === this.overlay.element) this.close();
    });
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(notice: LeagueNotice, onClose: () => void): void {
    const kind = noticeKind(notice);
    const to = league(notice.toTier);
    this.onClose = onClose;
    requireElement('league-result-badge').innerHTML = leagueBadgeSvg(to.order, 84);
    requireElement('league-result-eyebrow').textContent = 'Daily League';
    requireElement('league-result-title').textContent =
      kind === 'promoted' ? `Promoted to ${to.name}!` : kind === 'relegated' ? `Now in ${to.name}` : `League: ${to.name}`;
    requireElement('league-result-text').textContent = noticeText(notice);
    this.overlay.element.dataset.kind = kind;
    this.overlay.show(this.okButton);
  }

  close(): void {
    if (!this.overlay.isOpen) return;
    this.overlay.hide();
    const done = this.onClose;
    this.onClose = undefined;
    done?.();
  }
}
