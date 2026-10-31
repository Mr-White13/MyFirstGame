import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDaily, type DailyState } from '../daily/Daily';
import type { LeagueNotice } from '../league/League';
import { CompleteDialog, type ChallengeCompletion, type CompletionSummary } from './CompleteDialog';
import { ConfirmDialog, LEAVE_LEVEL, RESET_SETTINGS, RESTART_LEVEL } from './ConfirmDialog';
import { DailyDialog } from './DailyDialog';
import { expectGolden } from '../testing/golden';
import { byId, flushFrames, installDom, leafIds, serialize, uninstallDom, type FakeDocument } from './fakeDom.test-helper';
import { GameOverDialog } from './GameOverDialog';
import { LeagueResultDialog } from './LeagueResultDialog';

// Characterization: dialog DOM exactly as rendered today (R5 Overlay backdrop helper safety net).
const GOLDEN = new URL('./dialogs.golden.json', import.meta.url);

let doc: FakeDocument;
beforeEach(() => {
  vi.useFakeTimers();
  doc = installDom();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  uninstallDom();
});

/** The overlay's own line, every id'd leaf inside it, and what got focus. */
function view(id: string) {
  return { overlay: serialize(byId(id))[0], focus: doc.activeElement?.id ?? null, ...leafIds(id) };
}

const SUMMARY: CompletionSummary = {
  levelId: 3,
  levelCount: 30,
  arrows: 20,
  stars: 2,
  directClears: 14,
  autoClears: 4,
  bonusClears: 2,
  mistakes: 1,
  timeMs: 61_234,
  bestTimeMs: 58_000,
  newBestTime: false,
  newBestStars: true,
  unlocked: 4,
};

const CHALLENGE: ChallengeCompletion = {
  number: 2,
  stars: 3,
  timeMs: 45_678,
  mistakes: 0,
  collected: 3,
  perChallenge: 4,
  newPoints: 2,
  today: 7,
  maxToday: 12,
  leagueName: 'Gold',
  hasNext: true,
};

describe('dialogs render (golden)', () => {
  it('CompleteDialog: level, flawless, final, one star and challenge variants', () => {
    const out: Record<string, unknown> = {};
    const calls: string[] = [];
    const dialog = new CompleteDialog({
      onNext: () => calls.push('next'),
      onReplay: () => calls.push('replay'),
      onLevels: () => calls.push('levels'),
      onPlayFromStart: () => calls.push('from-start'),
    });
    out['complete: closed'] = view('complete-dialog');
    const cases: [string, () => void][] = [
      ['level', () => dialog.show(SUMMARY)],
      ['flawless, new time, nothing unlocked', () => dialog.show({ ...SUMMARY, stars: 3, mistakes: 0, autoClears: 0, bonusClears: 0, newBestTime: true, newBestStars: false, unlocked: null })],
      ['one star, chain only', () => dialog.show({ ...SUMMARY, stars: 1, mistakes: 2, bonusClears: 0 })],
      ['final level', () => dialog.show({ ...SUMMARY, levelId: 30, unlocked: null })],
      ['challenge, next', () => dialog.showChallenge(CHALLENGE)],
      ['challenge, last', () => dialog.showChallenge({ ...CHALLENGE, number: 3, stars: 1, mistakes: 2, hasNext: false, leagueName: 'Neon Elite' })],
      ['level after challenge', () => dialog.show(SUMMARY)],
    ];
    for (const [name, show] of cases) {
      show();
      out[`complete: ${name} (before frame)`] = serialize(byId('complete-dialog'))[0];
      flushFrames();
      out[`complete: ${name}`] = view('complete-dialog');
    }
    dialog.hide();
    out['complete: hiding'] = view('complete-dialog');
    vi.advanceTimersByTime(220);
    out['complete: hidden'] = view('complete-dialog');
    for (const id of ['btn-next', 'btn-play-from-start', 'btn-replay', 'btn-levels']) byId(id).click();
    expect(calls).toEqual(['next', 'from-start', 'replay', 'levels']);
    expectGolden(GOLDEN, out, 'CompleteDialog');
  });

  it('GameOverDialog: level and challenge', () => {
    const out: Record<string, unknown> = {};
    const calls: string[] = [];
    const dialog = new GameOverDialog({ onTryAgain: () => calls.push('again'), onLevels: () => calls.push('levels') });
    const cases = {
      'one arrow left': { levelId: 5, cleared: 19, total: 20, mistakes: 3 },
      'many arrows left': { levelId: 12, cleared: 4, total: 30, mistakes: 3 },
      challenge: { levelId: 7, cleared: 10, total: 25, mistakes: 3, challenge: { number: 1, today: 2, maxToday: 12 } },
      'level after challenge': { levelId: 5, cleared: 0, total: 20, mistakes: 3 },
    };
    for (const [name, summary] of Object.entries(cases)) {
      dialog.show(summary);
      flushFrames();
      out[`gameover: ${name}`] = view('gameover-dialog');
    }
    byId('btn-try-again').click();
    byId('btn-gameover-levels').click();
    expect(calls).toEqual(['again', 'levels']);
    expectGolden(GOLDEN, out, 'GameOverDialog');
  });

  it('LeagueResultDialog: every kind of notice, closed once by OK or the backdrop', () => {
    const out: Record<string, unknown> = {};
    const dialog = new LeagueResultDialog();
    const base: LeagueNotice = { fromTier: 1, toTier: 2, daysSettled: 1, promotions: 1, relegations: 0, lastPlayed: { date: '2026-03-09', points: 9, outcome: 'promoted' } };
    const cases: Record<string, LeagueNotice> = {
      promoted: base,
      'promoted over days, not played': { ...base, toTier: 3, daysSettled: 3, promotions: 2, lastPlayed: null },
      'relegated after playing': { ...base, fromTier: 2, toTier: 1, promotions: 0, relegations: 1, lastPlayed: { date: '2026-03-09', points: 1, outcome: 'relegated' } },
      'relegated while away': { ...base, fromTier: 3, toTier: 1, daysSettled: 4, promotions: 0, relegations: 2, lastPlayed: null },
      mixed: { ...base, fromTier: 2, toTier: 2, daysSettled: 2, promotions: 1, relegations: 1 },
      retained: { ...base, fromTier: 0, toTier: 0, promotions: 0, lastPlayed: { date: '2026-03-09', points: 1, outcome: 'retained' } },
    };
    let closes = 0;
    for (const [name, notice] of Object.entries(cases)) {
      dialog.show(notice, () => closes++);
      flushFrames();
      out[`league: ${name}`] = view('league-result');
      dialog.close();
    }
    expect(closes).toBe(6);
    dialog.show(base, () => closes++);
    byId('league-result-text').click(); // inside the card: not the backdrop
    expect(dialog.isOpen).toBe(true);
    byId('league-result').click();
    byId('btn-league-result-ok').click(); // already closing: ignored
    expect(closes).toBe(7);
    expectGolden(GOLDEN, out, 'LeagueResultDialog');
  });

  it('DailyDialog: pending, available, missed day, claimed, clock-back, day 7 and the claim animation', () => {
    const out: Record<string, unknown> = {};
    let claims = 0;
    const dialog = new DailyDialog(() => claims++);
    const today = '2026-03-10';
    const checked = (streak: number, claimedDays: string[], patch: Partial<DailyState> = {}): DailyState => ({
      ...createDaily(),
      lastCheckIn: today,
      streak,
      longestStreak: Math.max(streak, 1),
      daysPlayed: streak,
      claimedDays,
      claims: claimedDays.length,
      lastClaim: claimedDays[claimedDays.length - 1] ?? null,
      ...patch,
    });
    const cases: Record<string, DailyState> = {
      pending: createDaily(),
      'day 1 available': checked(1, []),
      'day 4, one missed': checked(4, ['2026-03-07', '2026-03-09']),
      'day 4 claimed': checked(4, ['2026-03-07', '2026-03-08', '2026-03-09', today]),
      'clock back': checked(2, [], { lastCheckIn: '2026-03-12' }),
      'day 7 available': checked(7, ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09']),
    };
    for (const [name, state] of Object.entries(cases)) {
      dialog.render(state, today, 130);
      dialog.open();
      flushFrames();
      out[`daily: ${name}`] = { ...view('daily-dialog'), 'daily-grid': serialize(byId('daily-grid')) };
    }
    byId('btn-daily-claim').click();
    expect(claims).toBe(1);
    vi.spyOn(performance, 'now').mockReturnValue(1_000); // the count-up start time
    dialog.celebrate({ date: today, day: 7, credits: 75, transactionId: `daily:${today}` }, 130, 205);
    out['daily: celebrate (start)'] = { ...view('daily-dialog'), 'daily-grid': serialize(byId('daily-grid')) };
    flushFrames(1_300);
    out['daily: celebrate (halfway)'] = byId('daily-balance').textContent;
    flushFrames(1_600);
    out['daily: celebrate (end)'] = byId('daily-balance').textContent;
    byId('daily-dialog').click(); // backdrop
    expect(dialog.isOpen).toBe(false);
    expectGolden(GOLDEN, out, 'DailyDialog');
  });

  it('ConfirmDialog: each question, answered by OK, cancel, backdrop or a new question', async () => {
    const out: Record<string, unknown> = {};
    const dialog = new ConfirmDialog();
    const answers: boolean[] = [];
    for (const [name, question] of Object.entries({ LEAVE_LEVEL, RESTART_LEVEL, RESET_SETTINGS })) {
      const answer = dialog.ask(question);
      flushFrames();
      out[`confirm: ${name}`] = view('confirm-dialog');
      byId('btn-confirm-ok').click();
      answers.push(await answer);
    }
    const cancelled = dialog.ask();
    byId('btn-confirm-cancel').click();
    answers.push(await cancelled);
    const backdrop = dialog.ask();
    byId('confirm-text').click(); // inside the card: ignored
    byId('confirm-dialog').click();
    answers.push(await backdrop);
    const replaced = dialog.ask(RESTART_LEVEL);
    const second = dialog.ask(RESET_SETTINGS);
    answers.push(await replaced);
    byId('btn-confirm-ok').click();
    answers.push(await second);
    expect(answers).toEqual([true, true, true, false, false, false, true]);
    expectGolden(GOLDEN, out, 'ConfirmDialog');
  });
});
