import type { DailyChallenge } from '../league/challenges';
import type { HistoryEntry } from '../league/League';
import { league, leagueBadgeSvg, LEAGUES } from '../league/leagues';
import { requireElement } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ChallengeCardView {
  readonly challenge: DailyChallenge;
  readonly collected: number;
  readonly completed: boolean;
}

/** Everything the League screen shows. */
export interface LeagueView {
  readonly unlocked: boolean;
  readonly levelsDone: number;
  readonly unlockAt: number;
  readonly tier: number;
  readonly today: number;
  readonly maxToday: number;
  readonly perChallenge: number;
  readonly challenges: readonly ChallengeCardView[];
  readonly history: readonly HistoryEntry[];
  /** The device date is earlier than a day already played: nothing counts until it passes. */
  readonly clockBack: boolean;
}

function icon(name: string, className = 'icon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${name}`);
  svg.append(use);
  return svg;
}

const formatDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

const OUTCOME_LABEL = { promoted: 'Promoted', retained: 'Kept league', relegated: 'Moved down', inactive: 'No points' } as const;

/**
 * The Daily League: current league and today's points, progress toward the
 * personal targets, the three challenges, the rules and recent days. There
 * is deliberately no leaderboard: the league has no other players yet.
 */
export class LeagueScreen {
  private readonly badge = requireElement('league-badge');
  private readonly name = requireElement('league-name');
  private readonly points = requireElement('league-points');
  private readonly progress = requireElement('league-progress');
  private readonly locked = requireElement('league-locked');
  private readonly meter = requireElement('league-meter');
  private readonly meterFill = requireElement('league-meter-fill');
  private readonly markUp = requireElement('league-mark-up');
  private readonly markDown = requireElement('league-mark-down');
  private readonly targets = requireElement('league-targets');
  private readonly note = requireElement('league-day-note');
  private readonly list = requireElement('league-challenge-list');
  private readonly history = requireElement('league-history');

  constructor(
    onBack: () => void,
    private readonly onPlay: (number: number) => void,
  ) {
    requireElement('btn-league-back').addEventListener('click', () => onBack());
    // The targets table never changes: built once from the central configuration.
    requireElement('league-table-body').replaceChildren(
      ...LEAGUES.map((t) => {
        const row = document.createElement('tr');
        row.dataset.tier = String(t.order);
        const cells = [t.name, t.promoteAt === null ? 'Top league' : `${t.promoteAt}+ points`, t.relegateBelow === null ? 'Never' : `under ${t.relegateBelow}`];
        cells.forEach((text, i) => {
          const cell = document.createElement(i === 0 ? 'th' : 'td');
          if (i === 0) cell.setAttribute('scope', 'row');
          cell.textContent = text;
          row.append(cell);
        });
        return row;
      }),
    );
  }

  render(v: LeagueView): void {
    const t = league(v.tier);
    this.badge.innerHTML = leagueBadgeSvg(t.order, 72); // static, trusted markup
    this.name.textContent = t.name;
    this.name.style.setProperty('--league-color', t.color);
    this.points.textContent = String(v.today);
    this.locked.hidden = v.unlocked;
    this.progress.hidden = !v.unlocked;
    requireElement('league-unlock-count').textContent = String(v.levelsDone);
    requireElement('league-unlock-fill').style.width = `${(v.levelsDone / v.unlockAt) * 100}%`;
    requireElement('league-table-body')
      .querySelectorAll('tr')
      .forEach((row) => row.classList.toggle('is-current', row.dataset.tier === String(t.order)));

    // Progress toward the personal targets on a 0..12 scale.
    const pct = (n: number) => `${(n / v.maxToday) * 100}%`;
    this.meterFill.style.width = pct(v.today);
    this.meterFill.classList.toggle('is-promoting', t.promoteAt !== null && v.today >= t.promoteAt);
    this.markUp.hidden = t.promoteAt === null;
    if (t.promoteAt !== null) this.markUp.style.left = pct(t.promoteAt);
    this.markDown.hidden = t.relegateBelow === null;
    if (t.relegateBelow !== null) this.markDown.style.left = pct(t.relegateBelow);
    const parts: string[] = [];
    if (t.promoteAt !== null) {
      const need = t.promoteAt - v.today;
      parts.push(need > 0 ? `${need} more ${need === 1 ? 'point' : 'points'} to promote (target ${t.promoteAt})` : `Promotion target reached (${t.promoteAt})`);
    } else {
      parts.push('Top league: no promotion beyond Neon Elite');
    }
    if (t.relegateBelow !== null) {
      parts.push(v.today >= t.relegateBelow ? `Safe from relegation (${t.relegateBelow}+)` : `Score ${t.relegateBelow}+ to stay in ${t.name}`);
    }
    this.targets.textContent = parts.join(' · ');
    this.meter.setAttribute('aria-label', `${v.today} of ${v.maxToday} points. ${parts.join('. ')}.`);
    requireElement('league-challenges').textContent = String(v.challenges.filter((c) => c.completed).length);
    requireElement('league-arrows').textContent = String(v.today);
    this.note.hidden = !v.clockBack;
    this.note.textContent = v.clockBack ? "Your device's date is earlier than a day already played. Points count again once that date has passed." : '';

    this.list.replaceChildren(...v.challenges.map((c) => this.card(c, v)));
    this.renderHistory(v.history);
  }

  private card(c: ChallengeCardView, v: LeagueView): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `challenge${c.completed ? ' challenge--done' : ''}${v.unlocked ? '' : ' challenge--locked'}`;
    const num = document.createElement('span');
    num.className = 'challenge__number';
    num.textContent = String(c.challenge.number);
    const body = document.createElement('div');
    body.className = 'challenge__body';
    const title = document.createElement('h3');
    title.className = 'challenge__title';
    title.textContent = `Challenge ${c.challenge.number}`;
    const meta = document.createElement('p');
    meta.className = 'challenge__meta';
    const size = `${c.challenge.level.rows}×${c.challenge.level.cols} · ${c.challenge.level.arrows.length} arrows`;
    meta.textContent = c.completed ? `${size} · Completed` : size;
    const pips = document.createElement('span');
    pips.className = 'challenge__pips';
    pips.setAttribute('aria-label', `${c.collected} of ${v.perChallenge} Energy Arrows collected`);
    for (let i = 0; i < v.perChallenge; i++) {
      const pip = icon('icon-bolt', `challenge__pip${i < c.collected ? ' is-collected' : ''}`);
      pips.append(pip);
    }
    body.append(title, meta, pips);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--small ${c.completed ? 'btn--ghost' : 'btn--primary'} challenge__play`;
    button.disabled = !v.unlocked;
    button.textContent = !v.unlocked ? 'Locked' : c.completed ? 'Replay' : c.collected > 0 ? 'Continue' : 'Play';
    button.setAttribute('aria-label', `${button.textContent}: challenge ${c.challenge.number}`);
    button.addEventListener('click', () => this.onPlay(c.challenge.number));
    if (c.completed) num.replaceChildren(icon('icon-check', 'challenge__check'));
    li.append(num, body, button);
    return li;
  }

  private renderHistory(entries: readonly HistoryEntry[]): void {
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'league-history__empty';
      empty.textContent = 'Your results appear here after your first league day.';
      this.history.replaceChildren(empty);
      return;
    }
    this.history.replaceChildren(
      ...[...entries]
        .reverse()
        .slice(0, 10)
        .map((e) => {
          const li = document.createElement('li');
          li.className = `history history--${e.outcome}`;
          const when = document.createElement('span');
          when.className = 'history__date';
          when.textContent = e.days > 1 ? `${formatDay(e.date)} · ${e.days} days` : formatDay(e.date);
          const what = document.createElement('span');
          what.className = 'history__result';
          const from = league(e.startTier).name;
          const to = league(e.endTier).name;
          what.textContent = e.outcome === 'inactive' ? (from === to ? 'No points · league kept' : `No points · ${from} → ${to}`) : from === to ? `${OUTCOME_LABEL[e.outcome]} · ${to}` : `${OUTCOME_LABEL[e.outcome]} · ${from} → ${to}`;
          const pts = document.createElement('span');
          pts.className = 'history__points';
          pts.textContent = e.outcome === 'inactive' ? '–' : `${e.points} pts`;
          li.append(when, what, pts);
          return li;
        }),
    );
  }
}
