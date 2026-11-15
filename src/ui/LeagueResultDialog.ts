import type { LeagueNotice } from '../league/League';
import { league, leagueBadgeSvg } from '../league/leagues';
import { Overlay, requireElement } from './dom';
import { t } from '../i18n/translate';

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
  const name = league(n.toTier).name;
  const over = n.daysSettled > 1;
  const days = { count: n.daysSettled, league: name };
  const kind = noticeKind(n);
  if (kind === 'relegated' && n.lastPlayed && n.daysSettled === 1) {
    return t('league.noticeRelegatedLastDay', { count: n.lastPlayed.points, league: name });
  }
  const body =
    kind === 'promoted'
      ? over
        ? t('league.noticePromotedOver', days)
        : t('league.noticePromoted', { league: name })
      : kind === 'relegated'
        ? over
          ? t('league.noticeRelegatedAwayOver', days)
          : t('league.noticeRelegatedAway', { league: name })
        : kind === 'mixed'
          ? over
            ? t('league.noticeMixedOver', days)
            : t('league.noticeMixed', { league: name })
          : t('league.noticeRetained', { league: name });
  // The last day's score is a sentence of its own, ahead of the result.
  return n.lastPlayed ? `${t('league.noticeLastDay', { count: n.lastPlayed.points })} ${body}` : body;
}

/** The result of settled league days, shown once and then acknowledged. Neutral wording for moving down. */
export class LeagueResultDialog {
  private readonly overlay = new Overlay(requireElement('league-result'));
  private readonly okButton = requireElement<HTMLButtonElement>('btn-league-result-ok');
  private onClose?: () => void;

  constructor() {
    this.okButton.addEventListener('click', () => this.close());
    this.overlay.onBackdropClick(() => this.close());
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(notice: LeagueNotice, onClose: () => void): void {
    const kind = noticeKind(notice);
    const to = league(notice.toTier);
    this.onClose = onClose;
    requireElement('league-result-badge').innerHTML = leagueBadgeSvg(to.order, 84);
    requireElement('league-result-eyebrow').textContent = t('league.resultEyebrow');
    requireElement('league-result-title').textContent =
      kind === 'promoted' ? t('league.resultTitlePromoted', { league: to.name }) : kind === 'relegated' ? t('league.resultTitleRelegated', { league: to.name }) : t('league.resultTitleLeague', { league: to.name });
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
