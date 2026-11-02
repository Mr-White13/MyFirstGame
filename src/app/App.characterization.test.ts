import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArrowData, GameSnapshot, LevelData } from '../core/types';
import { createDaily } from '../daily/Daily';
import type { DailyChallenge } from '../league/challenges';
import { createLeague, type LeagueNotice, type LeagueState } from '../league/League';
import { createProfile } from '../profile/Profile';
import { addPlayTime, createStats } from '../profile/Stats';
import { createProgress, type LevelRecord, type Progress } from '../progress/Progress';
import { addDayPlayTime, createDailyLog, recordDayAttempt } from '../recap/DailyLog';
import type { Insight } from '../recap/insights';
import type { AchievementDefinition } from '../rewards/Achievements';
import { RESET_SETTINGS, RESTART_LEVEL } from '../ui/ConfirmDialog';
import { App, type AppParts } from './App';
import { applyAttempt, type AttemptSummary } from './AttemptTracker';
import { runIntro } from './Intro';
import type { ScreenName } from './Navigation';

/**
 * Characterization tests for App: they record what the app does TODAY (call
 * order, saved payloads, which dialog Back closes), known bugs included, so the
 * coming split of App.ts can be checked against them. A deliberate behaviour
 * change should show up here as a deliberate test change.
 *
 * Every part is a hand-written fake that appends to one shared, ordered log.
 * The tests run in Node: `document`, `window` and `performance.now` are faked.
 */

// App only needs Phaser for two event names; the real module needs a browser.
vi.mock('phaser', () => ({ default: { Core: { Events: { POST_RENDER: 'postrender', VISIBLE: 'visible' } } } }));

const TODAY = '2026-10-31';
const LEVEL_COUNT = 12;
const LEVELS: LevelData[] = Array.from({ length: LEVEL_COUNT }, (_, i) => ({ id: i + 1, revision: 1, rows: 5 + (i % 3), cols: 5, arrows: [] }));

const PROMOTED: LeagueNotice = { fromTier: 0, toTier: 1, daysSettled: 1, promotions: 1, relegations: 0, lastPlayed: null };
const RETAINED: LeagueNotice = { fromTier: 1, toTier: 1, daysSettled: 1, promotions: 0, relegations: 0, lastPlayed: null };

const RECORD: LevelRecord = { bestMoves: 5, revision: 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 1_000 };
/** Levels 1..n completed, the next one unlocked. */
function progressThrough(n: number): Progress {
  const completed: Record<number, LevelRecord> = {};
  for (let id = 1; id <= n; id++) completed[id] = RECORD;
  return { highestUnlocked: n + 1, completed };
}

const CHALLENGE: DailyChallenge = {
  id: `${TODAY}:1:L3`,
  date: TODAY,
  number: 1,
  sourceLevelId: 3,
  energyArrowIds: ['a1'],
  level: { id: 3, revision: 1, rows: 7, cols: 7, arrows: [] },
};

const ACHIEVEMENT = { id: 'first', title: 'First Escape', reward: 50 } as AchievementDefinition;

function snapshotFor(levelId: number): GameSnapshot {
  return {
    levelId, status: 'playing', moves: 0, directClears: 0, autoClears: 0, bonusClears: 0, streak: 0, streakAt: null,
    bonusCooldown: 0, longestChain: 0, mistakes: 0, lives: 3, remaining: 10, total: 10, activated: 0, won: false, stars: 0,
  };
}

interface Call {
  readonly name: string;
  readonly args: readonly unknown[];
}

/** Render refreshes run on nearly every change; `effects()` leaves them out. `home.render` stays as the marker of renderAll(). */
const NOISE = new Set([
  'home.renderRewards', 'home.renderLeague', 'levelSelect.render', 'profileScreen.render', 'profileScreen.renderRewards',
  'profileScreen.renderLeague', 'recordsScreen.render', 'achievementsScreen.render', 'leagueScreen.render', 'hud.setChallenge',
  'dayClock.refresh', 'body.add', 'body.remove',
]);

interface Options {
  progress?: Progress;
  hidden?: boolean;
  /** A notice already in the saved league record. */
  notice?: LeagueNotice | null;
  /** A notice the next league.settle() produces. */
  noticeOnSettle?: LeagueNotice | null;
  /** Achievements the next rewards.afterAttempt() unlocks. */
  unlocks?: AchievementDefinition[];
  challenges?: DailyChallenge[];
  confirmRestart?: boolean;
  /** Whether the first-time booster tip was already shown (default true, so older tests see no tip). */
  boosterTipSeen?: boolean;
  /** Energy Credits in the wallet (default 100). */
  credits?: number;
  /** A fake rewarded-ads service (default: none, as in browsers). */
  ads?: { result?: { kind: string; credits?: number; saved?: boolean }; canOffer?: boolean };
  /** Lifetime play time in the statistics (default 0: inside the ad-free start). */
  playTimeMs?: number;
  /** Whether the one-time rule tips were already shown (default true, so older tests see none). */
  tipsSeen?: boolean;
}

function createHarness(options: Options = {}) {
  const log: Call[] = [];
  const rec = (name: string, ...args: unknown[]) => void log.push({ name, args });
  /** Every view the booster toolbar was asked to show (not logged as effects). */
  const boosterViews: unknown[] = [];
  /** Every view the Shop screen was asked to show (not logged as effects). */
  const shopViews: unknown[] = [];
  const initial = { progress: options.progress ?? createProgress(), stats: { ...createStats(new Date(0)), playTimeMs: options.playTimeMs ?? 0 }, dailyLog: createDailyLog(TODAY), profile: createProfile() };

  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);

  const bodyClasses = new Set<string>();
  const doc = {
    hidden: options.hidden ?? false,
    listeners: new Map<string, ((event: unknown) => void)[]>(),
    body: {
      classList: {
        add: (c: string) => (bodyClasses.add(c), rec('body.add', c)),
        remove: (c: string) => (bodyClasses.delete(c), rec('body.remove', c)),
      },
    },
    addEventListener(type: string, fn: (event: unknown) => void) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
    },
    dispatch(type: string, event: unknown = {}) {
      for (const fn of this.listeners.get(type) ?? []) fn(event);
    },
  };
  const g = globalThis as unknown as { document?: unknown; window?: unknown };
  g.document = doc;
  g.window = {
    setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
    clearInterval: (id: number) => clearInterval(id),
  };

  const state = {
    levelId: 1,
    snap: snapshotFor(1),
    removeListeners: [] as ((arrow: ArrowData) => void)[],
    get isPlaying() {
      return this.snap.status === 'playing';
    },
    snapshot() {
      return this.snap;
    },
    onRemove(fn: (arrow: ArrowData) => void) {
      this.removeListeners.push(fn);
    },
    // Booster queries (BoosterController); silent, so the recorded effects stay as before.
    subscribe: () => () => {},
    get lives() {
      return this.snap.lives;
    },
    maxLives: 3,
    escapableArrows: () => [] as ArrowData[],
    getArrows: () => [] as ArrowData[],
    blockerOf: () => null,
    restoreLife: () => false,
    revive() {
      if (this.snap.status !== 'failed') return false;
      this.snap = { ...this.snap, status: 'playing', lives: 1 };
      return true;
    },
    /** The rules moved on: patch the live snapshot. */
    set(patch: Partial<GameSnapshot>) {
      this.snap = { ...this.snap, ...patch };
    },
    reset(levelId: number) {
      this.levelId = levelId;
      this.snap = snapshotFor(levelId);
    },
  };
  const scene = {
    loadLevel: (level: LevelData) => (rec('scene.loadLevel', level.id), state.reset(level.id)),
    restartLevel: () => (rec('scene.restartLevel'), state.reset(state.levelId)),
    resetView: () => rec('scene.resetView'),
    hintShowing: false,
    revealShowing: false,
    showHint: (id: string) => (rec('scene.showHint', id), true),
    showReveal: (ids: readonly string[]) => (rec('scene.showReveal', ids.length), true),
    continueAfterFailure: () => rec('scene.continueAfterFailure'),
  };
  const gameEvents = new Map<string, { fn: () => void; once: boolean }[]>();
  const game = {
    events: {
      once: (event: string, fn: () => void) => void gameEvents.set(event, [...(gameEvents.get(event) ?? []), { fn, once: true }]),
      on: (event: string, fn: () => void) => void gameEvents.set(event, [...(gameEvents.get(event) ?? []), { fn, once: false }]),
    },
    loop: { started: true, wake: () => rec('loop.wake'), sleep: () => rec('loop.sleep') },
    emit(event: string) {
      const handlers = gameEvents.get(event) ?? [];
      gameEvents.set(event, handlers.filter((h) => !h.once));
      handlers.forEach((h) => h.fn());
    },
  };
  const screens = {
    active: null as ScreenName | null,
    /** Transitions wait for release() (to observe the navigation lock). */
    hold: false,
    fail: null as Error | null,
    pending: [] as (() => void)[],
    show(name: ScreenName): Promise<void> {
      rec('screens.show', name);
      if (this.active === name) return Promise.resolve();
      this.active = name;
      if (this.fail) return Promise.reject(this.fail);
      if (!this.hold) return Promise.resolve();
      return new Promise<void>((resolve) => this.pending.push(resolve));
    },
    release() {
      this.pending.splice(0).forEach((resolve) => resolve());
    },
  };
  const dialog = (name: string) => ({
    isOpen: false,
    open(...args: unknown[]) {
      rec(`${name}.open`, ...args);
      this.isOpen = true;
    },
    close(...args: unknown[]) {
      rec(`${name}.close`, ...args);
      this.isOpen = false;
    },
    show(...args: unknown[]) {
      rec(`${name}.show`, ...args);
      this.isOpen = true;
    },
    showChallenge(...args: unknown[]) {
      rec(`${name}.showChallenge`, ...args);
      this.isOpen = true;
    },
    hide() {
      rec(`${name}.hide`);
      this.isOpen = false;
    },
    render: (...args: unknown[]) => rec(`${name}.render`, ...args),
    celebrate: (...args: unknown[]) => rec(`${name}.celebrate`, ...args),
  });
  const confirmDialog = {
    isOpen: false,
    answer: null as ((confirmed: boolean) => void) | null,
    ask(question?: { title: string }): Promise<boolean> {
      rec('confirmDialog.ask', question?.title ?? 'default');
      this.isOpen = true;
      return new Promise<boolean>((resolve) => (this.answer = resolve));
    },
    close(confirmed: boolean) {
      rec('confirmDialog.close', confirmed);
      this.isOpen = false;
      const answer = this.answer;
      this.answer = null;
      answer?.(confirmed);
    },
  };
  const leagueResult = {
    isOpen: false,
    onClose: undefined as (() => void) | undefined,
    show(notice: LeagueNotice, onClose: () => void) {
      rec('leagueResult.show', notice);
      this.isOpen = true;
      this.onClose = onClose;
    },
    close() {
      rec('leagueResult.close');
      this.isOpen = false;
      const done = this.onClose;
      this.onClose = undefined;
      done?.();
    },
  };
  const hud = {
    backCb: () => {},
    restartCb: () => {},
    onBack(fn: () => void) {
      this.backCb = fn;
    },
    onRestart(fn: () => void) {
      this.restartCb = fn;
    },
    setTime: (ms: number) => rec('hud.setTime', ms),
    setChallenge: (challenge: unknown) => rec('hud.setChallenge', challenge),
  };
  const levelSelect = {
    onSelect: () => {},
    onBack: () => {},
    render: () => rec('levelSelect.render'),
    focusLevel: (id: number) => rec('levelSelect.focusLevel', id),
  };
  const profileScreen = {
    isEditing: false,
    cancelEditing: () => rec('profileScreen.cancelEditing'),
    render: () => rec('profileScreen.render'),
    renderRewards: () => rec('profileScreen.renderRewards'),
    renderLeague: () => rec('profileScreen.renderLeague'),
  };
  const rewards = {
    current: {
      daily: createDaily(),
      boosters: { used: { hint: 0, reveal: 0, heart: 0 }, introduced: options.boosterTipSeen ?? true },
      cosmetics: { owned: [] as string[], equipped: { frame: null as string | null } },
      tips: options.tipsSeen === false ? ([] as string[]) : ['tap', 'blocked', 'chain', 'streak'],
    },
    markTipSeen(today: string, id: string) {
      rec('rewards.markTipSeen', today, id);
      this.current = { ...this.current, tips: [...this.current.tips, id] };
    },
    credits: options.credits ?? 100,
    spendBooster: (today: string, id: string) => (rec('rewards.spendBooster', today, id), true),
    /** Shop purchase: logs, charges and unlocks unless `failSave` (then nothing changes, like a failed write). */
    failSave: false,
    buyCosmetic(id: string) {
      rec('rewards.buyCosmetic', id);
      if (this.failSave) return { ok: false, reason: 'not-saved' };
      const price = ({ 'frame-cyber': 150, 'frame-plasma': 250, 'frame-elite': 400, 'frame-inferno': 500 } as Record<string, number>)[id];
      this.credits -= price;
      this.current = { ...this.current, cosmetics: { owned: [...this.current.cosmetics.owned, id], equipped: { frame: id } } };
      return { ok: true, item: { id } };
    },
    equipCosmetic(today: string, slot: string, id: string | null) {
      rec('rewards.equipCosmetic', today, slot, id);
      this.current = { ...this.current, cosmetics: { ...this.current.cosmetics, equipped: { frame: id } } };
      return true;
    },
    markBoostersIntroduced(today: string) {
      rec('rewards.markBoostersIntroduced', today);
      this.current = { ...this.current, boosters: { ...this.current.boosters, introduced: true } };
    },
    unlockListeners: [] as ((unlocked: readonly AchievementDefinition[]) => void)[],
    pendingUnlocks: options.unlocks ?? [],
    claimResult: null as { reward: { date: string; day: number; credits: number; transactionId: string }; unlocked: [] } | null,
    onUnlock(fn: (unlocked: readonly AchievementDefinition[]) => void) {
      this.unlockListeners.push(fn);
    },
    subscribe: () => () => {},
    checkIn: (today: string) => (rec('rewards.checkIn', today), 'same'),
    claimDaily(today: string) {
      rec('rewards.claimDaily', today);
      const result = this.claimResult;
      this.claimResult = null;
      if (result) this.credits += result.reward.credits;
      return result;
    },
    afterAttempt(today: string, longestChain: number) {
      rec('rewards.afterAttempt', today, longestChain);
      const unlocked = this.pendingUnlocks;
      this.pendingUnlocks = [];
      if (unlocked.length) this.unlockListeners.forEach((fn) => fn(unlocked));
      return unlocked;
    },
    achievements: () => [],
  };
  const dayClock = {
    today: TODAY,
    listeners: [] as ((day: string, previous: string) => void)[],
    onChange(fn: (day: string, previous: string) => void) {
      this.listeners.push(fn);
      return () => {};
    },
    start: () => rec('dayClock.start'),
    refresh() {
      rec('dayClock.refresh');
      return this.today;
    },
    /** The date changes (midnight, or noticed on return). */
    advanceTo(day: string) {
      const previous = this.today;
      this.today = day;
      this.listeners.forEach((fn) => fn(day, previous));
    },
  };
  const league = {
    current: { ...createLeague(), notice: options.notice ?? null } as LeagueState,
    next: options.noticeOnSettle ?? null,
    subscribe: () => () => {},
    settle(today: string, unlocked: boolean) {
      rec('league.settle', today, unlocked);
      if (this.next) this.current = { ...this.current, notice: this.next };
      this.next = null;
      return 'unchanged';
    },
    acknowledge() {
      rec('league.acknowledge');
      this.current = { ...this.current, notice: null };
    },
    challenges: () => options.challenges ?? [],
    complete: (today: string, challenge: DailyChallenge) => (rec('league.complete', today, challenge.number), true),
    collect: (today: string, challenge: DailyChallenge, arrowId: string) => (rec('league.collect', today, challenge.number, arrowId), 'awarded'),
  };

  const parts = {
    levels: LEVELS,
    storage: { load: () => initial.progress, save: (p: unknown) => rec('progress.save', p) },
    profileStorage: { load: () => initial.profile, save: (p: unknown) => rec('profile.save', p) },
    statsStorage: { load: () => initial.stats, save: (s: unknown) => rec('stats.save', s) },
    dailyLogStorage: { load: () => initial.dailyLog, save: (l: unknown) => rec('dailyLog.save', l) },
    state,
    scene,
    game,
    screens,
    home: { render: () => rec('home.render'), renderRewards: () => rec('home.renderRewards'), renderLeague: () => rec('home.renderLeague') },
    levelSelect,
    profileScreen,
    recordsScreen: { reset: () => rec('recordsScreen.reset'), render: () => rec('recordsScreen.render') },
    hud,
    themePicker: dialog('themePicker'),
    gameLayout: { setGrid: (rows: number, cols: number) => rec('gameLayout.setGrid', rows, cols) },
    completeDialog: dialog('completeDialog'),
    confirmDialog,
    gameOverDialog: dialog('gameOverDialog'),
    avatarPicker: dialog('avatarPicker'),
    countryPicker: dialog('countryPicker'),
    toast: { show: (...args: unknown[]) => rec('toast.show', ...args) },
    settings: { current: { confirmRestart: options.confirmRestart ?? true }, reset: () => (rec('settings.reset'), true) },
    feedback: (event: { type: string }) => rec('feedback', event.type, event),
    rewards,
    dayClock,
    dailyDialog: dialog('dailyDialog'),
    achievementsScreen: { render: () => rec('achievementsScreen.render') },
    league,
    leagueScreen: { render: () => rec('leagueScreen.render') },
    leagueResult,
    boosterBar: { render: (view: unknown) => (boosterViews.push(view), undefined), flash: (id: string) => rec('boosterBar.flash', id) },
    shopScreen: {
      render: (view: unknown) => (shopViews.push(view), undefined),
      celebrate: (id: string) => rec('shopScreen.celebrate', id),
      celebrateEarn: () => rec('shopScreen.celebrateEarn'),
    },
    ads: options.ads && {
      state: 'ready',
      remainingToday: 4,
      dailyLimit: 5,
      credits: 30,
      canOffer: options.ads.canOffer ?? true,
      canOfferContinue: options.ads.canOffer ?? true,
      supported: true,
      privacyOptionsRequired: false,
      start: async () => rec('ads.start'),
      watch: async () => (rec('ads.watch'), options.ads!.result ?? { kind: 'rewarded', credits: 30, saved: true }),
      watchForContinue: async () => (rec('ads.watchForContinue'), options.ads!.result ?? { kind: 'rewarded', credits: 0, saved: true }),
      showPrivacyOptions: async () => rec('ads.showPrivacyOptions'),
    },
  };
  const app = new App(parts as unknown as AppParts);

  return {
    app,
    parts,
    doc,
    state,
    screens,
    game,
    hud,
    league,
    rewards,
    scene,
    boosterViews,
    shopViews,
    dayClock,
    confirmDialog,
    leagueResult,
    profileScreen,
    initial,
    bodyClasses,
    rec,
    /** Moves the monotonic clock behind the level timer. */
    advance(ms: number) {
      now += ms;
    },
    clear() {
      log.length = 0;
    },
    /** The ordered log without render noise; primitive arguments are appended for readability. */
    effects(): string[] {
      return log
        .filter((c) => !NOISE.has(c.name))
        .map((c) => [c.name, ...c.args.filter((a) => a === null || ['string', 'number', 'boolean'].includes(typeof a)).map(String)].join(' '));
    },
    /** Arguments of every call with this name, in order. */
    calls(name: string): unknown[][] {
      return log.filter((c) => c.name === name).map((c) => [...c.args]);
    },
  };
}

type Harness = ReturnType<typeof createHarness>;

/** Lets pending promise continuations and queued microtasks run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/** Starts the app, opens a level from Home and clears the log. */
async function enterLevel(h: Harness, levelId: number): Promise<void> {
  h.app.start();
  await h.app.openLevel(levelId);
  await flush();
  h.clear();
}

function summary(patch: Partial<AttemptSummary> & Pick<AttemptSummary, 'levelId' | 'outcome' | 'timeMs'>): AttemptSummary {
  return {
    revision: 1, uncountedTimeMs: patch.timeMs, moves: 0, stars: 0, directClears: 0, autoClears: 0, bonusClears: 0,
    longestChain: 0, mistakes: 0, ...patch,
  };
}

/** The menu-screen transition, as showMenuScreen() runs it after an attempt was ended. */
const MENU_TRANSITION = ['scene.resetView', 'themePicker.close', 'completeDialog.hide', 'gameOverDialog.hide', 'home.render'];
const END_DIALOGS = ['themePicker.close', 'completeDialog.hide', 'gameOverDialog.hide'];
const ABANDON_SAVES = ['stats.save', 'dailyLog.save', `rewards.afterAttempt ${TODAY} 0`];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});

afterEach(() => {
  const g = globalThis as unknown as { document?: unknown; window?: unknown };
  delete g.document;
  delete g.window;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('App.start()', () => {
  it('checks in, settles the league, pins the daily log, renders and shows Home, in this order', () => {
    const h = createHarness();
    h.app.start();
    expect(h.effects()).toEqual([
      'dayClock.start',
      `rewards.checkIn ${TODAY}`,
      `league.settle ${TODAY} false`,
      'dailyLog.save',
      'home.render',
      'screens.show home',
    ]);
    expect(h.calls('dailyLog.save')[0][0]).toBe(h.initial.dailyLog);
    expect(h.app.screen).toBe('home');
  });

  it('sleeps the game loop after the first frame on a menu, and wakes it when Phaser becomes visible in a level', async () => {
    const h = createHarness();
    h.app.start();
    h.clear();
    h.game.emit('postrender');
    h.game.emit('postrender'); // once only
    expect(h.effects()).toEqual(['loop.sleep']);
    await h.app.openLevel(1);
    h.clear();
    h.game.emit('visible');
    expect(h.effects()).toEqual(['loop.wake']);
  });
});

describe('level completion (win)', () => {
  it('saves progress, then stats, then the daily log, then rewards (achievement toast), then shows time and feedback', async () => {
    const h = createHarness({ unlocks: [ACHIEVEMENT] });
    await enterLevel(h, 1);
    h.advance(12_000);
    h.state.set({ status: 'won', won: true, remaining: 0, moves: 5, directClears: 8, autoClears: 2, longestChain: 3, mistakes: 1, stars: 2 });
    h.app.handleLevelSolved();

    expect(h.effects()).toEqual([
      'progress.save',
      'stats.save',
      'dailyLog.save',
      `rewards.afterAttempt ${TODAY} 3`,
      'toast.show Achievement unlocked: First Escape · +50 2600 achievement',
      'feedback achievement',
      'hud.setTime 12000',
      'home.render',
      'feedback complete',
    ]);

    const won = summary({ levelId: 1, outcome: 'won', timeMs: 12_000, moves: 5, stars: 2, directClears: 8, autoClears: 2, longestChain: 3, mistakes: 1 });
    const expected = applyAttempt({ progress: h.initial.progress, stats: h.initial.stats }, won, LEVEL_COUNT);
    expect(h.calls('progress.save')[0][0]).toEqual(expected.records.progress);
    expect(h.calls('stats.save')[0][0]).toEqual(expected.records.stats);
    expect(h.calls('dailyLog.save')[0][0]).toEqual(recordDayAttempt(h.initial.dailyLog, TODAY, won));
    expect(h.app.currentProgress).toEqual(expected.records.progress);
    expect(h.app.currentStats).toEqual(expected.records.stats);
  });

  it('the celebration end shows the completion dialog with the recorded result, then the stars feedback', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(12_000);
    h.state.set({ status: 'won', won: true, remaining: 0, moves: 5, directClears: 8, autoClears: 2, mistakes: 1, stars: 2 });
    h.app.handleLevelSolved();
    h.clear();
    h.app.handleCelebrationEnd();
    expect(h.effects()).toEqual(['completeDialog.show', 'feedback stars']);
    expect(h.calls('completeDialog.show')[0][0]).toEqual({
      levelId: 1, levelCount: LEVEL_COUNT, arrows: 10, stars: 2, directClears: 8, autoClears: 2, bonusClears: 0, mistakes: 1,
      timeMs: 12_000, bestTimeMs: 12_000, newBestTime: true, newBestStars: true, unlocked: 2,
    });
    expect(h.calls('feedback')[0][1]).toEqual({ type: 'stars', stars: 2, unlocked: true, reduced: false });
  });

  it('a win is recorded once: a second solve and the following Next record nothing more', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(1_000);
    h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
    h.app.handleLevelSolved();
    h.clear();
    h.app.handleLevelSolved();
    expect(h.effects()).toEqual([]);
    h.app.nextLevel();
    await flush();
    expect(h.effects()).toEqual([...END_DIALOGS, 'confirmDialog.close false', 'gameLayout.setGrid 6 5', 'scene.loadLevel 2', 'hud.setTime 0', 'loop.wake', 'screens.show game']);
  });

  it('a test play (level open only through the testing flag) saves nothing and says so', async () => {
    const h = createHarness(); // fresh progress: only Level 1 is really unlocked
    await enterLevel(h, 5);
    h.advance(4_000);
    h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
    h.app.handleLevelSolved();
    expect(h.effects()).toEqual(['hud.setTime 4000', 'toast.show Test play: this result is not saved 2200', 'feedback complete']);
  });

  it('completing Level 10 settles the league after the saves; its notice waits because the game screen is active', async () => {
    const h = createHarness({ progress: progressThrough(9) });
    await enterLevel(h, 10);
    h.league.next = PROMOTED; // the settle that unlocks the league produces a notice
    h.advance(2_000);
    h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
    h.app.handleLevelSolved();
    expect(h.effects()).toEqual([
      'progress.save', 'stats.save', 'dailyLog.save', `rewards.afterAttempt ${TODAY} 0`, 'hud.setTime 2000',
      `league.settle ${TODAY} true`, 'home.render', 'feedback complete',
    ]);
    expect(h.app.leagueUnlocked).toBe(true);
  });

  /**
   * Finding: showMenuScreen() queues showLeagueNotice() as a microtask inside
   * navigate(), so it runs before navigate()'s finally clears the lock and
   * always returns early. A notice settled during play is not shown on the next
   * menu screen; it waits for the next settle (Back to app, new day, League, endIntro).
   */
  it('the queued notice after a menu transition does not show (navigation lock still held); the next settle shows it', async () => {
    const h = createHarness({ progress: progressThrough(9) });
    await enterLevel(h, 10);
    h.league.next = PROMOTED; // the settle that unlocks the league produces a notice
    h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
    h.app.handleLevelSolved();
    await h.app.showLevelsOrLeague();
    await flush();
    await h.app.showHome();
    await flush();
    expect(h.calls('leagueResult.show')).toEqual([]);
    expect(h.league.current.notice).toEqual(PROMOTED);
    h.clear();
    await h.app.showLeague();
    expect(h.effects().slice(0, 3)).toEqual([`league.settle ${TODAY} true`, 'leagueResult.show', 'feedback promoted']);
  });
});

describe('level failure', () => {
  it('stops the clock and plays Game Over; the failed attempt is saved (stats, daily log, rewards, never progress) once the player chooses', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(7_000);
    h.state.set({ status: 'failed', lives: 0, moves: 4, directClears: 3, mistakes: 3, remaining: 7 });
    h.app.handleLevelLost();
    // Nothing is recorded yet: Continue could still bring this run back.
    expect(h.effects()).toEqual(['hud.setTime 7000', 'feedback gameOver']);
    h.advance(30_000); // the Game Over screen isn't play time
    h.clear();
    h.app.restartLevel(); // Try again
    expect(h.effects().slice(0, 3)).toEqual(['stats.save', 'dailyLog.save', `rewards.afterAttempt ${TODAY} 0`]);
    const failed = summary({ levelId: 1, outcome: 'failed', timeMs: 7_000, moves: 4, directClears: 3, mistakes: 3 });
    const expected = applyAttempt({ progress: h.initial.progress, stats: h.initial.stats }, failed, LEVEL_COUNT);
    expect(expected.completion).toBeNull();
    expect(h.calls('stats.save')[0][0]).toEqual(expected.records.stats);
    expect(h.calls('dailyLog.save')[0][0]).toEqual(recordDayAttempt(h.initial.dailyLog, TODAY, failed));
    expect(h.app.currentProgress).toBe(h.initial.progress);
  });

  it('then shows Game Over; Try Again restarts without recording the failed attempt twice', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.state.set({ status: 'failed', lives: 0, mistakes: 3, remaining: 7 });
    h.app.handleLevelLost();
    h.clear();
    h.app.handleLevelFailed();
    expect(h.effects()).toEqual(['gameOverDialog.show']);
    expect(h.calls('gameOverDialog.show')[0][0]).toEqual({ levelId: 1, cleared: 3, total: 10, mistakes: 3, challenge: undefined, canContinue: false });
    h.clear();
    h.app.restartLevel();
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...END_DIALOGS, 'scene.restartLevel', 'hud.setTime 0']);
    expect(h.calls('stats.save')[0][0]).toMatchObject({ failedRuns: 1, successfulRuns: 0 });
    h.clear();
    h.app.restartLevel(); // the new attempt ends untouched: abandoned, the failure isn't counted twice
    expect(h.calls('stats.save')[0][0]).toMatchObject({ failedRuns: 1 });
  });

  it('Game Over is not shown once the player has left the game screen', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    await h.app.showHome();
    h.clear();
    h.app.handleLevelFailed();
    h.app.handleCelebrationEnd();
    expect(h.effects()).toEqual([]);
  });
});

describe('abandoning an attempt', () => {
  it('restart mid-level records the attempt as abandoned (stats + daily log, progress untouched) before reloading', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(4_000);
    h.state.set({ moves: 2, directClears: 2 });
    h.app.restartLevel();
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...END_DIALOGS, 'scene.restartLevel', 'hud.setTime 0']);
    const abandoned = summary({ levelId: 1, outcome: 'abandoned', timeMs: 4_000, moves: 2, directClears: 2 });
    expect(h.calls('stats.save')[0][0]).toEqual(applyAttempt({ progress: h.initial.progress, stats: h.initial.stats }, abandoned, LEVEL_COUNT).records.stats);
    expect(h.calls('dailyLog.save')[0][0]).toEqual(recordDayAttempt(h.initial.dailyLog, TODAY, abandoned));
    // The new attempt counts from zero at once (the board is already on screen).
    h.advance(1_500);
    expect(h.app.timer.elapsed()).toBe(1_500);
  });

  it('leaving an untouched level still records an abandoned attempt (a daily-log run), then shows Home', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(800);
    h.hud.backCb();
    await flush();
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...MENU_TRANSITION, 'screens.show home', 'loop.sleep']);
    const abandoned = summary({ levelId: 1, outcome: 'abandoned', timeMs: 800 });
    expect(h.calls('dailyLog.save')[0][0]).toEqual(recordDayAttempt(h.initial.dailyLog, TODAY, abandoned));
    expect(h.calls('progress.save')).toEqual([]);
  });

  it('opening another level while one is open abandons the first', async () => {
    const h = createHarness({ progress: progressThrough(3) });
    await enterLevel(h, 1);
    h.advance(500);
    await h.app.openLevel(2);
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...END_DIALOGS, 'confirmDialog.close false', 'gameLayout.setGrid 6 5', 'scene.loadLevel 2', 'hud.setTime 0', 'loop.wake', 'screens.show game']);
  });
});

describe('Daily League challenges', () => {
  it('play, collect and win without touching progress, statistics or the daily log', async () => {
    const h = createHarness({ progress: progressThrough(10), challenges: [CHALLENGE] });
    h.app.start();
    h.clear();
    await h.app.openChallenge(1);
    expect(h.effects()).toEqual([
      `league.settle ${TODAY} true`, ...END_DIALOGS, 'confirmDialog.close false', 'gameLayout.setGrid 7 7', 'scene.loadLevel 3', 'hud.setTime 0', 'loop.wake', 'screens.show game',
    ]);
    h.clear();
    h.state.removeListeners.forEach((fn) => fn({ id: 'b2' } as ArrowData));
    h.state.removeListeners.forEach((fn) => fn({ id: 'a1', energy: true } as ArrowData));
    h.advance(3_000);
    h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
    h.app.handleLevelSolved();
    expect(h.effects()).toEqual([`league.collect ${TODAY} 1 a1`, 'feedback energy', `league.complete ${TODAY} 1`, 'hud.setTime 3000', 'home.render', 'feedback complete']);
    h.clear();
    h.app.handleCelebrationEnd();
    expect(h.effects()).toEqual(['completeDialog.showChallenge', 'feedback stars']);
  });

  it('leaving a challenge records nothing; "Levels" in its dialogs goes to the League (settling first)', async () => {
    const h = createHarness({ progress: progressThrough(10), challenges: [CHALLENGE] });
    h.app.start();
    await h.app.openChallenge(1);
    h.advance(3_000);
    h.state.set({ status: 'failed', lives: 0 });
    h.app.handleLevelLost();
    h.clear();
    await h.app.showLevelsOrLeague();
    expect(h.effects()).toEqual([`league.settle ${TODAY} true`, ...MENU_TRANSITION, 'screens.show league', 'loop.sleep']);
  });
});

describe('daily rewards', () => {
  it('openDaily checks in (refreshing the day) before rendering and opening the calendar', () => {
    const h = createHarness();
    h.app.start();
    h.clear();
    h.app.openDaily();
    expect(h.effects()).toEqual([`rewards.checkIn ${TODAY}`, `dailyDialog.render ${TODAY} 100`, 'dailyDialog.open']);
  });

  it('claimDaily saves through rewards first, then re-renders, celebrates (before → after credits) and plays feedback', () => {
    const h = createHarness();
    h.app.start();
    h.rewards.claimResult = { reward: { date: TODAY, day: 1, credits: 10, transactionId: `daily:${TODAY}` }, unlocked: [] };
    h.clear();
    h.app.claimDaily();
    expect(h.effects()).toEqual([`rewards.checkIn ${TODAY}`, `rewards.claimDaily ${TODAY}`, `dailyDialog.render ${TODAY} 110`, 'dailyDialog.celebrate 100 110', 'feedback claim']);
    h.clear();
    h.app.claimDaily(); // double tap: nothing to claim
    expect(h.effects()).toEqual([`rewards.checkIn ${TODAY}`, `rewards.claimDaily ${TODAY}`]);
  });

  it('a new day checks in (only while visible) and then settles the league', () => {
    const h = createHarness();
    h.app.start();
    h.clear();
    h.dayClock.advanceTo('2026-11-01');
    expect(h.effects()).toEqual(['rewards.checkIn 2026-11-01', 'league.settle 2026-11-01 false']);
    h.clear();
    h.doc.hidden = true;
    h.dayClock.advanceTo('2026-11-02');
    expect(h.effects()).toEqual(['league.settle 2026-11-02 false']);
  });
});

describe('league notices', () => {
  it('a retained notice is a toast and is acknowledged at once', () => {
    const h = createHarness({ noticeOnSettle: RETAINED });
    h.app.start();
    expect(h.effects().slice(2, 5)).toEqual([`league.settle ${TODAY} false`, 'toast.show You stay in Silver. 3200', 'league.acknowledge']);
  });

  it('a promotion opens the result dialog; closing it acknowledges', () => {
    const h = createHarness({ noticeOnSettle: PROMOTED });
    h.app.start();
    expect(h.effects().slice(2, 5)).toEqual([`league.settle ${TODAY} false`, 'leagueResult.show', 'feedback promoted']);
    h.clear();
    h.leagueResult.close();
    expect(h.effects()).toEqual(['leagueResult.close', 'league.acknowledge']);
  });

  it('is never shown during play: a settle on return from the background waits', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.league.next = PROMOTED;
    h.app.setBackground(true);
    h.app.setBackground(false);
    expect(h.calls('leagueResult.show')).toEqual([]);
  });

  it('a notice settled at launch waits for the startup intro (B3) and shows when it ends', () => {
    const h = createHarness({ noticeOnSettle: PROMOTED });
    h.app.start(() => h.rec('intro.back')); // as main.ts starts it: the splash already covers Home
    expect(h.effects()).toEqual(['dayClock.start', `rewards.checkIn ${TODAY}`, `league.settle ${TODAY} false`, 'dailyLog.save', 'home.render', 'screens.show home']);
    expect(h.leagueResult.isOpen).toBe(false);
    // While the intro runs, Back goes to the intro.
    h.clear();
    expect(h.app.handleBack()).toBe(true);
    expect(h.effects()).toEqual(['intro.back']);
    h.clear();
    h.app.endIntro();
    expect(h.effects()).toEqual(['leagueResult.show', 'feedback promoted']);
  });

  it('a "retained" result at launch is toasted (and acknowledged) only after the intro (B3)', () => {
    const h = createHarness({ noticeOnSettle: RETAINED });
    h.app.start(() => h.rec('intro.back'));
    expect(h.calls('toast.show')).toEqual([]);
    expect(h.calls('league.acknowledge')).toEqual([]);
    h.clear();
    h.app.endIntro();
    expect(h.effects()).toEqual(['toast.show You stay in Silver. 3200', 'league.acknowledge']);
  });

  it('a notice that arrives during the intro waits for endIntro()', () => {
    const h = createHarness();
    h.app.start();
    h.app.beginIntro(() => {});
    h.league.next = PROMOTED;
    h.app.setBackground(true);
    h.app.setBackground(false);
    expect(h.calls('leagueResult.show')).toEqual([]);
    h.clear();
    h.app.endIntro();
    expect(h.effects()).toEqual(['leagueResult.show', 'feedback promoted']);
  });
});

describe('intro (runIntro wired as in main.ts)', () => {
  function introParts(h: Harness, opts: { shown?: boolean; recapEnabled?: boolean; insight?: Insight | null } = {}) {
    let answerRecap: (answer: 'continue' | 'skip') => void = () => {};
    const parts = {
      splash: {
        run: async (onLeaving?: () => void) => {
          h.rec('splash.run');
          if (opts.shown ?? true) onLeaving?.();
          await Promise.resolve();
          h.rec('splash.done');
          return opts.shown ?? true;
        },
      },
      recap: {
        show: () => {
          h.rec('recap.show');
          return new Promise<'continue' | 'skip'>((resolve) => (answerRecap = resolve));
        },
      },
      recapEnabled: () => opts.recapEnabled ?? true,
      nextInsight: () => (h.rec('nextInsight'), opts.insight === undefined ? ({ id: 'streak', title: 'T', text: 'x' } as unknown as Insight) : opts.insight),
    };
    return { parts, answer: (a: 'continue' | 'skip') => answerRecap(a) };
  }

  it('splash → recap (opened as the splash leaves) → endIntro; Back during the recap reaches the intro callback (skip)', async () => {
    const h = createHarness();
    h.app.start();
    const intro = introParts(h);
    h.app.beginIntro(() => (h.rec('intro.back'), intro.answer('skip')));
    h.clear();
    let result: string | undefined;
    const done = runIntro(intro.parts).then((r) => (result = r)).finally(() => (h.rec('endIntro'), h.app.endIntro()));
    await flush();
    expect(h.effects()).toEqual(['splash.run', 'nextInsight', 'recap.show', 'splash.done']);
    h.league.next = PROMOTED;
    h.app.setBackground(true);
    h.app.setBackground(false); // settles during the recap: the notice waits
    expect(h.app.handleBack()).toBe(true);
    await done;
    expect(result).toBe('recap');
    expect(h.effects().slice(-4)).toEqual(['intro.back', 'endIntro', 'leagueResult.show', 'feedback promoted']);
  });

  it('a skipped splash (no cold launch) never opens the recap; recap off or no insight ends after the splash', async () => {
    const h = createHarness();
    expect(await runIntro(introParts(h, { shown: false }).parts)).toBe('skipped');
    expect(await runIntro(introParts(h, { recapEnabled: false }).parts)).toBe('splash');
    expect(await runIntro(introParts(h, { insight: null }).parts)).toBe('splash');
    expect(h.effects()).toEqual(['splash.run', 'splash.done', 'splash.run', 'splash.done', 'splash.run', 'nextInsight', 'splash.done']);
  });
});

describe('Level Select focus', () => {
  it('Level Select focuses the next level to play in a fresh session (B2), then the level opened last', async () => {
    const h = createHarness({ progress: progressThrough(2) });
    h.app.start();
    await h.app.showLevelSelect();
    expect(h.calls('levelSelect.focusLevel')).toEqual([[3]]); // Levels 1–2 done: Level 3 is next
    await h.app.openLevel(7); // a test play, far ahead of the player's Level 3
    await h.app.goBack();
    await h.app.showHome();
    h.clear();
    await h.app.showLevelSelect();
    expect(h.effects()).toEqual([...MENU_TRANSITION, 'screens.show levels', 'loop.sleep', 'levelSelect.focusLevel 7']);
  });

  it('a Daily League challenge is not a level opened from Level Select: focus stays on the next level to play', async () => {
    const h = createHarness({ progress: progressThrough(10), challenges: [CHALLENGE] });
    h.app.start();
    await h.app.openChallenge(1); // reuses Level 3's layout
    await h.app.showHome();
    h.clear();
    await h.app.showLevelSelect();
    expect(h.calls('levelSelect.focusLevel')).toEqual([[11]]); // Levels 1–10 done: Level 11 is next
  });
});

describe('handleBack priority', () => {
  /** From the topmost down: what Back closes when that layer (and every lower one) is open. */
  const layers: { name: string; open: (h: Harness) => void; system: string[]; escape: string[] }[] = [
    { name: 'intro', open: (h) => h.app.beginIntro(() => h.rec('intro.back')), system: ['intro.back'], escape: ['intro.back'] },
    { name: 'theme picker', open: (h) => (h.parts.themePicker.isOpen = true), system: ['themePicker.close'], escape: ['themePicker.close'] },
    { name: 'confirm dialog', open: (h) => (h.confirmDialog.isOpen = true), system: ['confirmDialog.close false'], escape: ['confirmDialog.close false'] },
    { name: 'daily dialog', open: (h) => (h.parts.dailyDialog.isOpen = true), system: ['dailyDialog.close'], escape: ['dailyDialog.close'] },
    { name: 'league result', open: (h) => (h.leagueResult.isOpen = true), system: ['leagueResult.close'], escape: ['leagueResult.close'] },
    { name: 'avatar picker', open: (h) => (h.parts.avatarPicker.isOpen = true), system: ['avatarPicker.close'], escape: ['avatarPicker.close'] },
    { name: 'country picker', open: (h) => (h.parts.countryPicker.isOpen = true), system: ['countryPicker.close'], escape: ['countryPicker.close'] },
    // Escape leaves nickname editing to its own buttons.
    { name: 'nickname editing', open: (h) => (h.profileScreen.isEditing = true), system: ['profileScreen.cancelEditing'], escape: [] },
  ];

  for (const [index, layer] of layers.entries()) {
    for (const system of [true, false]) {
      it(`${system ? 'Android Back' : 'Escape'} with the ${layer.name} open (and everything below) closes only the ${layer.name}`, async () => {
        const h = createHarness();
        await enterLevel(h, 1);
        h.parts.completeDialog.isOpen = true;
        h.parts.gameOverDialog.isOpen = true;
        for (const lower of layers.slice(index)) lower.open(h);
        h.clear();
        const handled = system ? h.app.handleBack(true) : (h.doc.dispatch('keydown', { key: 'Escape' }), true);
        await flush();
        expect(handled).toBe(true);
        expect(h.effects()).toEqual(system ? layer.system : layer.escape);
      });
    }
  }

  it('Android Back on an end-of-level dialog acts as "Levels"; Escape does nothing (and does not leave the level)', async () => {
    for (const dialog of ['completeDialog', 'gameOverDialog'] as const) {
      const h = createHarness();
      await enterLevel(h, 1);
      h.state.set({ status: 'won', won: true, remaining: 0, stars: 3 });
      h.app.handleLevelSolved();
      h.parts[dialog].isOpen = true;
      h.clear();
      h.doc.dispatch('keydown', { key: 'Escape' });
      await flush();
      expect(h.effects()).toEqual([]);
      expect(h.app.handleBack(true)).toBe(true);
      await flush();
      expect(h.effects()).toEqual([...MENU_TRANSITION, 'screens.show levels', 'loop.sleep', 'levelSelect.focusLevel 1']);
    }
  });

  it('other keys are ignored', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.doc.dispatch('keydown', { key: 'Enter' });
    await flush();
    expect(h.effects()).toEqual([]);
  });

  it('in an untouched level, Back leaves at once (abandoned) to the screen it came from', async () => {
    const h = createHarness();
    h.app.start();
    await h.app.showLevelSelect();
    await h.app.openLevel(1);
    h.clear();
    expect(h.app.handleBack()).toBe(true);
    await flush();
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...MENU_TRANSITION, 'screens.show levels', 'loop.sleep', 'levelSelect.focusLevel 1']);
  });

  it('with moves made, Back asks first; Back again cancels the question and the level carries on', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.state.set({ moves: 1 });
    h.app.handleBack();
    expect(h.effects()).toEqual(['confirmDialog.ask default']);
    h.app.handleBack();
    await flush();
    expect(h.effects()).toEqual(['confirmDialog.ask default', 'confirmDialog.close false']);
    expect(h.app.screen).toBe('game');
  });

  it('menu screens go back through the history; Home returns false (Android then backgrounds the app)', async () => {
    const h = createHarness();
    h.app.start();
    await h.app.showProfile();
    await h.app.showRecords();
    h.clear();
    expect(h.app.handleBack()).toBe(true);
    await flush();
    expect(h.app.screen).toBe('profile');
    expect(h.app.handleBack()).toBe(true);
    await flush();
    expect(h.app.screen).toBe('home');
    expect(h.effects().filter((e) => e.startsWith('screens.show'))).toEqual(['screens.show profile', 'screens.show home']);
    h.clear();
    expect(h.app.handleBack()).toBe(false);
    expect(h.effects()).toEqual([]);
  });

  it('before start() (no screen yet) Back is not handled', () => {
    const h = createHarness();
    expect(h.app.handleBack()).toBe(false);
  });
});

describe('navigation lock', () => {
  it('while a transition runs, other navigations, restart and Back are ignored (Back still reports handled)', async () => {
    const h = createHarness({ progress: progressThrough(3) });
    h.app.start();
    h.screens.hold = true;
    h.clear();
    const first = h.app.openLevel(1);
    expect(h.bodyClasses.has('is-navigating')).toBe(true);
    const effectsSoFar = h.effects();
    await h.app.openLevel(2);
    await h.app.showProfile();
    await h.app.goBack();
    h.app.restartLevel();
    expect(h.app.handleBack()).toBe(true);
    expect(h.effects()).toEqual(effectsSoFar);
    h.screens.release();
    await first;
    expect(h.bodyClasses.has('is-navigating')).toBe(false);
    expect(h.calls('scene.loadLevel')).toEqual([[1]]);
    // The level starts counting only once the transition has finished.
    h.advance(1_000);
    expect(h.app.timer.elapsed()).toBe(1_000);
  });

  it('the attempt is not interactive during the transition', async () => {
    const h = createHarness();
    h.app.start();
    h.screens.hold = true;
    const opening = h.app.openLevel(1);
    h.advance(5_000);
    expect(h.app.timer.elapsed()).toBe(0);
    h.screens.release();
    await opening;
    expect(h.app.timer.elapsed()).toBe(0);
  });

  it('a failing transition still releases the lock (try/finally) and rejects to the caller', async () => {
    const h = createHarness();
    h.app.start();
    h.screens.fail = new Error('boom');
    await expect(h.app.openLevel(1)).rejects.toThrow('boom');
    expect(h.bodyClasses.has('is-navigating')).toBe(false);
    h.screens.fail = null;
    await h.app.showProfile();
    expect(h.app.screen).toBe('profile');
  });
});

describe('confirm dialogs', () => {
  it('leaving with moves: the clock pauses while asking; Leave records the abandoned attempt and goes back', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(3_000);
    h.state.set({ moves: 2, directClears: 2 });
    const leaving = h.app.leaveLevel();
    h.advance(10_000); // answering isn't play time
    expect(h.app.timer.elapsed()).toBe(3_000);
    h.confirmDialog.close(true);
    await leaving;
    await flush();
    expect(h.effects()).toEqual(['confirmDialog.ask default', 'confirmDialog.close true', ...ABANDON_SAVES, ...MENU_TRANSITION, 'screens.show home', 'loop.sleep']);
    expect(h.calls('stats.save')[0][0]).toEqual(
      applyAttempt({ progress: h.initial.progress, stats: h.initial.stats }, summary({ levelId: 1, outcome: 'abandoned', timeMs: 3_000, moves: 2, directClears: 2 }), LEVEL_COUNT).records.stats,
    );
  });

  it('leaving with moves: Keep playing resumes the clock and records nothing', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(3_000);
    h.state.set({ moves: 2 });
    const leaving = h.app.leaveLevel();
    h.advance(10_000);
    h.confirmDialog.close(false);
    await leaving;
    h.advance(1_000);
    expect(h.app.timer.elapsed()).toBe(4_000);
    expect(h.effects()).toEqual(['confirmDialog.ask default', 'confirmDialog.close false']);
  });

  it('restart with moves and "Confirm restart" on asks the restart question first', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.state.set({ mistakes: 1 });
    const restarting = h.app.requestRestart();
    h.confirmDialog.close(true);
    await restarting;
    expect(h.effects()).toEqual([`confirmDialog.ask ${RESTART_LEVEL.title}`, 'confirmDialog.close true', ...ABANDON_SAVES, ...END_DIALOGS, 'scene.restartLevel', 'hud.setTime 0']);
  });

  it('restart without "Confirm restart", or on an untouched level, restarts at once', async () => {
    const h = createHarness({ confirmRestart: false });
    await enterLevel(h, 1);
    h.state.set({ moves: 3 });
    await h.app.requestRestart();
    expect(h.effects()).toEqual([...ABANDON_SAVES, ...END_DIALOGS, 'scene.restartLevel', 'hud.setTime 0']);
  });

  it('restart is dropped if the level changed while the question was open', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.state.set({ moves: 3 });
    const restarting = h.app.requestRestart();
    h.state.levelId = 2;
    h.confirmDialog.close(true);
    await restarting;
    expect(h.effects()).toEqual([`confirmDialog.ask ${RESTART_LEVEL.title}`, 'confirmDialog.close true']);
  });

  it('reset settings asks only on the Settings screen', async () => {
    const h = createHarness();
    h.app.start();
    await h.app.resetSettings();
    await h.app.showSettings();
    h.clear();
    const resetting = h.app.resetSettings();
    h.confirmDialog.close(true);
    await resetting;
    expect(h.effects()).toEqual([`confirmDialog.ask ${RESET_SETTINGS.title}`, 'confirmDialog.close true', 'settings.reset', 'toast.show Settings reset']);
  });
});

describe('background and resume', () => {
  it('hiding mid-level pauses the clock and checkpoints play time into stats and the daily log', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(5_000);
    h.doc.hidden = true;
    h.doc.dispatch('visibilitychange');
    expect(h.effects()).toEqual(['stats.save', 'dailyLog.save']);
    const stats = addPlayTime(h.initial.stats, 5_000);
    const dailyLog = addDayPlayTime(h.initial.dailyLog, TODAY, 5_000);
    expect(h.calls('stats.save')[0][0]).toEqual(stats);
    expect(h.calls('dailyLog.save')[0][0]).toEqual(dailyLog);

    // Repeats (main.ts and the Android bridge also report it) change nothing.
    h.app.setBackground(true);
    h.advance(60_000);
    expect(h.app.timer.elapsed()).toBe(5_000);

    h.clear();
    h.doc.hidden = false;
    h.doc.dispatch('visibilitychange');
    expect(h.effects()).toEqual([`rewards.checkIn ${TODAY}`, `league.settle ${TODAY} false`]);
    h.advance(2_000);
    expect(h.app.timer.elapsed()).toBe(7_000);

    // The finished attempt adds only the time the checkpoint did not.
    h.clear();
    h.state.set({ status: 'failed', lives: 0, mistakes: 3 });
    h.app.handleLevelLost();
    h.app.restartLevel(); // the player chooses Try again: now the failure is saved
    const failed = summary({ levelId: 1, outcome: 'failed', timeMs: 7_000, uncountedTimeMs: 2_000, mistakes: 3 });
    expect(h.calls('stats.save')[0][0]).toEqual(applyAttempt({ progress: h.initial.progress, stats }, failed, LEVEL_COUNT).records.stats);
    expect(h.calls('dailyLog.save')[0][0]).toEqual(recordDayAttempt(dailyLog, TODAY, failed));
  });

  it('hiding on a menu or in a test play saves nothing', async () => {
    const h = createHarness();
    h.app.start();
    h.clear();
    h.app.setBackground(true);
    h.app.setBackground(false);
    expect(h.effects()).toEqual([`rewards.checkIn ${TODAY}`, `league.settle ${TODAY} false`]);

    await h.app.openLevel(5); // test play
    h.advance(5_000);
    h.clear();
    h.app.setBackground(true);
    expect(h.effects()).toEqual([]);
  });

  it('starting hidden keeps the level clock paused until the app is visible', async () => {
    const h = createHarness({ hidden: true });
    h.app.start();
    await h.app.openLevel(1);
    h.advance(5_000);
    expect(h.app.timer.elapsed()).toBe(0);
    h.doc.hidden = false;
    h.doc.dispatch('visibilitychange');
    h.advance(1_000);
    expect(h.app.timer.elapsed()).toBe(1_000);
  });

  it('the theme picker pauses the clock while open', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(1_000);
    h.app.themePickerOpened();
    h.advance(9_000);
    h.app.themePickerClosed();
    h.advance(1_000);
    expect(h.app.timer.elapsed()).toBe(2_000);
  });

  it('the HUD clock refreshes every 250 ms during play and stops on leaving', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    h.advance(300);
    vi.advanceTimersByTime(250);
    expect(h.effects()).toEqual(['hud.setTime 300']);
    await h.app.showHome();
    h.clear();
    vi.advanceTimersByTime(1_000);
    expect(h.effects()).toEqual([]);
  });
});

describe('boosters', () => {
  const freeArrow = { id: 'a1', direction: 'right', cells: [{ row: 0, col: 0 }] } as ArrowData;

  it('shows the first-time tip once, from Level 4 on (not on the tutorial Levels 1–3, not in a challenge)', async () => {
    const h = createHarness({ progress: progressThrough(10), boosterTipSeen: false, challenges: [CHALLENGE] });
    await enterLevel(h, 1);
    for (const id of [2, 3]) {
      await h.app.openLevel(id);
      await flush();
    }
    expect(h.rewards.current.boosters.introduced).toBe(false);
    await h.app.openChallenge(1);
    await flush();
    expect(h.rewards.current.boosters.introduced).toBe(false);
    h.clear();
    await h.app.openLevel(4);
    await flush();
    expect(h.effects().filter((e) => e.startsWith('toast.show') || e.startsWith('rewards.mark'))).toEqual([
      'toast.show Stuck? Boosters: Hint 20 · Reveal 40 credits 5000',
      `rewards.markBoostersIntroduced ${TODAY}`,
    ]);
    h.clear();
    await h.app.openLevel(5);
    await flush();
    expect(h.effects().filter((e) => e.startsWith('toast.show'))).toEqual([]);
  });

  it('the tutorial Levels 1–3 have no booster row, and booster taps there do nothing', async () => {
    const h = createHarness({ progress: progressThrough(3) });
    await enterLevel(h, 3);
    expect(h.boosterViews.at(-1)).toMatchObject({ visible: false });
    h.state.escapableArrows = () => [freeArrow];
    h.app.useBooster('hint');
    expect(h.effects()).toEqual([]);
    await h.app.openLevel(4);
    await flush();
    expect(h.boosterViews.at(-1)).toMatchObject({ visible: true });
  });

  it('a Hint on a level the player really unlocked is paid from the wallet, then shown', async () => {
    const h = createHarness({ progress: progressThrough(3) });
    await enterLevel(h, 4);
    h.state.escapableArrows = () => [freeArrow];
    h.state.getArrows = () => [freeArrow];
    h.app.useBooster('hint');
    expect(h.effects()).toEqual([`rewards.spendBooster ${TODAY} hint`, 'scene.showHint a1', 'boosterBar.flash hint', 'feedback booster']);
    expect(h.boosterViews.at(-1)).toMatchObject({ visible: true, free: false });
  });

  it('a test play gets boosters free: the real wallet is never charged', async () => {
    const h = createHarness(); // fresh progress: Level 5 is open only through the testing flag
    await enterLevel(h, 5);
    expect(h.boosterViews.at(-1)).toMatchObject({ visible: true, free: true });
    h.state.escapableArrows = () => [freeArrow];
    h.state.getArrows = () => [freeArrow];
    h.app.useBooster('hint');
    expect(h.effects()).toEqual(['scene.showHint a1', 'boosterBar.flash hint', 'feedback booster']);
  });

  it('Daily League challenges hide the toolbar and refuse boosters without charging', async () => {
    const h = createHarness({ progress: progressThrough(10), challenges: [CHALLENGE] });
    h.app.start();
    await h.app.openChallenge(1);
    await flush();
    expect(h.boosterViews.at(-1)).toMatchObject({ visible: false });
    h.clear();
    h.state.escapableArrows = () => [freeArrow];
    h.app.useBooster('hint');
    expect(h.effects()).toEqual(['toast.show Boosters are off in Daily League challenges. 2600']);
  });

  it('after leaving the level, booster taps do nothing', async () => {
    const h = createHarness();
    await enterLevel(h, 1);
    await h.app.showHome();
    await flush();
    h.clear();
    h.state.escapableArrows = () => [freeArrow];
    h.app.useBooster('hint');
    expect(h.effects()).toEqual([]);
  });
});

describe('shop', () => {
  async function enterShop(options: Options = {}) {
    const h = createHarness(options);
    h.app.start();
    await h.app.showShop();
    await flush();
    h.clear();
    return h;
  }

  it('opens from Home, showing the balance, the avatar and the cosmetics owned', async () => {
    const h = await enterShop({ credits: 320 });
    expect(h.app.screen).toBe('shop');
    expect(h.shopViews.at(-1)).toMatchObject({ credits: 320, avatar: 'bot', cosmetics: { owned: [], equipped: { frame: null } } });
  });

  it('asks before buying, then buys once through the wallet, celebrates and plays feedback', async () => {
    const h = await enterShop({ credits: 320 });
    const buying = h.app.buyCosmetic('frame-cyber');
    expect(h.effects()).toEqual(['confirmDialog.ask Buy Cyber Frame?']);
    h.clear();
    h.parts.confirmDialog.close(true);
    await buying;
    expect(h.effects()).toEqual([
      'confirmDialog.close true',
      'rewards.buyCosmetic frame-cyber',
      'shopScreen.celebrate frame-cyber',
      'toast.show Cyber Frame unlocked and equipped · −150 2600 achievement',
      'feedback purchase',
    ]);
    expect(h.rewards.credits).toBe(170);
  });

  it('cancelling the confirmation buys nothing', async () => {
    const h = await enterShop({ credits: 320 });
    const buying = h.app.buyCosmetic('frame-plasma');
    h.parts.confirmDialog.close(false);
    await buying;
    expect(h.effects().filter((e) => e.startsWith('rewards.'))).toEqual([]);
    expect(h.rewards.credits).toBe(320);
  });

  it('too few credits: explains the price without asking or charging', async () => {
    const h = await enterShop({ credits: 120 });
    await h.app.buyCosmetic('frame-elite');
    expect(h.effects()).toEqual(['toast.show Elite Frame costs 400 Energy Credits; you have 120. Earn more from daily rewards and achievements. 3200']);
  });

  it('rapid Buy taps open one confirmation and buy once', async () => {
    const h = await enterShop({ credits: 1000 });
    const first = h.app.buyCosmetic('frame-inferno');
    const second = h.app.buyCosmetic('frame-inferno');
    const other = h.app.buyCosmetic('frame-cyber');
    h.parts.confirmDialog.close(true);
    await Promise.all([first, second, other]);
    expect(h.effects().filter((e) => e.startsWith('confirmDialog.ask') || e.startsWith('rewards.buy'))).toEqual(['confirmDialog.ask Buy Inferno Frame?', 'rewards.buyCosmetic frame-inferno']);
    expect(h.rewards.credits).toBe(500);
    h.clear();
    await h.app.buyCosmetic('frame-inferno'); // already owned: just equips, never pays again
    expect(h.effects()).toEqual([`rewards.equipCosmetic ${TODAY} frame frame-inferno`]);
  });

  it('a purchase that could not be saved says nothing was charged', async () => {
    const h = await enterShop({ credits: 500 });
    h.rewards.failSave = true;
    const buying = h.app.buyCosmetic('frame-plasma');
    h.parts.confirmDialog.close(true);
    await buying;
    expect(h.effects().slice(-1)).toEqual(["toast.show The purchase couldn't be saved on this device, so nothing was charged. Try again. 3200"]);
    expect(h.rewards.credits).toBe(500);
  });

  it('equips and unequips (free), only from the Shop screen', async () => {
    const h = await enterShop({ credits: 500 });
    h.app.equipCosmetic('frame', null);
    expect(h.effects()).toEqual([`rewards.equipCosmetic ${TODAY} frame null`]);
    await h.app.showHome();
    await flush();
    h.clear();
    h.app.equipCosmetic('frame', null);
    await h.app.buyCosmetic('frame-cyber');
    expect(h.effects()).toEqual([]);
  });

  it('"Continue playing" opens the next level, like Home\'s Play', async () => {
    const h = await enterShop({ progress: progressThrough(3) });
    await h.app.continueFromShop();
    expect(h.effects()).toContain('scene.loadLevel 4');
  });
});

describe('rule tips', () => {
  it('Level 1 explains tapping once; the first lost heart, chain and streak bonus each explain their rule once', async () => {
    const h = createHarness({ tipsSeen: false });
    await enterLevel(h, 1);
    h.clear();
    await h.app.openLevel(1); // reopened: no tap tip again
    await flush();
    expect(h.effects().filter((e) => e.startsWith('toast.show'))).toEqual([]);
    expect(h.rewards.current.tips).toEqual(['tap']);
    h.clear();
    h.app.handleGameEvent({ type: 'blocked', lifeLost: false }); // a free nudge teaches nothing
    h.app.handleGameEvent({ type: 'release' });
    h.app.handleGameEvent({ type: 'blocked', lifeLost: true });
    h.app.handleGameEvent({ type: 'chain', index: 1 }); // only the first release of a chain counts
    h.app.handleGameEvent({ type: 'chain', index: 0 });
    h.app.handleGameEvent({ type: 'bonus', index: 0 });
    h.app.handleGameEvent({ type: 'blocked', lifeLost: true }); // already explained
    expect(h.effects().filter((e) => e.startsWith('toast.show'))).toEqual([
      'toast.show Blocked! That cost a heart. The arrow turns red and leaves by itself once its path is clear. 4500',
      'toast.show Chain reaction: freeing a path released a red arrow, at no cost. 4500',
      'toast.show Streak bonus! 5 quick clears in a row sent 2 free arrows off the board. 4500',
    ]);
    expect(h.rewards.current.tips).toEqual(['tap', 'blocked', 'chain', 'streak']);
  });

  it('players who already completed 5 levels get no tips', async () => {
    const h = createHarness({ tipsSeen: false, progress: progressThrough(5) });
    await enterLevel(h, 1);
    h.app.handleGameEvent({ type: 'blocked', lifeLost: true });
    expect(h.effects().filter((e) => e.startsWith('toast.show') || e.startsWith('rewards.markTip'))).toEqual([]);
  });

  it('tips only show during a level', async () => {
    const h = createHarness({ tipsSeen: false });
    h.app.start();
    h.clear();
    h.app.handleGameEvent({ type: 'blocked', lifeLost: true });
    expect(h.effects()).toEqual([]);
  });
});

/** Lifetime play time past the 30-minute ad-free start. */
const PLAYED = 30 * 60_000;

describe('rewarded ads', () => {
  const blocked = { id: 'a1', direction: 'right', cells: [{ row: 0, col: 0 }] } as ArrowData;

  it('Shop: a rewarded ad celebrates, plays feedback and says what was earned', async () => {
    const h = createHarness({ ads: {}, playTimeMs: PLAYED });
    h.app.start();
    await h.app.showShop();
    await flush();
    expect(h.shopViews.at(-1)).toMatchObject({ earn: { state: 'ready', remaining: 4, limit: 5, credits: 30 } });
    h.clear();
    await h.app.watchAd();
    expect(h.effects()).toEqual(['ads.watch', 'shopScreen.celebrateEarn', 'feedback claim', 'toast.show +30 Energy Credits 2600 achievement']);
  });

  it('an ad closed early, unavailable or over the limit pays nothing and explains', async () => {
    for (const [kind, text] of [
      ['dismissed', 'The ad was closed before the end, so no credits this time.'],
      ['unavailable', 'No ad is available right now. Check your connection and try again later.'],
      ['limit', 'Daily ad limit reached. Come back tomorrow for more.'],
    ] as const) {
      const h = createHarness({ ads: { result: { kind } }, playTimeMs: PLAYED });
      h.app.start();
      h.clear();
      await h.app.watchAd();
      expect(h.effects()).toEqual(['ads.watch', `toast.show ${text} 3200`]);
    }
  });

  it('without an ad service (browsers) the Shop shows no Earn section and watching does nothing', async () => {
    const h = createHarness();
    h.app.start();
    await h.app.showShop();
    await flush();
    expect(h.shopViews.at(-1)).toMatchObject({ earn: undefined });
    h.clear();
    await h.app.watchAd();
    expect(h.effects()).toEqual([]);
  });

  it('a booster without enough credits keeps its explanation, then offers an ad; the booster is never used by itself', async () => {
    const h = createHarness({ ads: {}, credits: 5, progress: progressThrough(3), playTimeMs: PLAYED });
    await enterLevel(h, 4);
    h.state.escapableArrows = () => [blocked];
    h.state.getArrows = () => [blocked];
    h.rewards.credits = 5;
    h.app.useBooster('hint');
    await flush();
    expect(h.effects()).toEqual([
      'toast.show Hint costs 20 Energy Credits; you have 5. Earn more from daily rewards and achievements. 2600',
      'confirmDialog.ask Need more credits?',
    ]);
    h.clear();
    h.parts.confirmDialog.close(true);
    await flush();
    expect(h.effects()).toEqual(['confirmDialog.close true', 'ads.watch', 'shopScreen.celebrateEarn', 'feedback claim', 'toast.show +30 Energy Credits 2600 achievement']);
    expect(h.effects()).not.toContain(`rewards.spendBooster ${TODAY} hint`);
  });

  it('"Not now" carries on without an ad; with no ad possible, only the explanation shows', async () => {
    const h = createHarness({ ads: {}, credits: 5, progress: progressThrough(3), playTimeMs: PLAYED });
    await enterLevel(h, 4);
    h.state.escapableArrows = () => [blocked];
    h.rewards.credits = 5;
    h.app.useBooster('reveal');
    await flush();
    h.clear();
    h.parts.confirmDialog.close(false);
    await flush();
    expect(h.effects()).toEqual(['confirmDialog.close false']);

    const none = createHarness({ ads: { canOffer: false }, credits: 5, progress: progressThrough(3), playTimeMs: PLAYED });
    await enterLevel(none, 4);
    none.state.escapableArrows = () => [blocked];
    none.rewards.credits = 5;
    none.app.useBooster('reveal');
    await flush();
    expect(none.effects()).toEqual(['toast.show Reveal costs 40 Energy Credits; you have 5. Earn more from daily rewards and achievements. 2600']);
  });

  it('while an ad covers the game the level clock pauses and Back is ignored; both resume afterwards', async () => {
    const h = createHarness({ ads: {}, playTimeMs: PLAYED });
    await enterLevel(h, 1);
    h.advance(1_000);
    h.app.setAdShowing(true);
    h.app.setAdShowing(true); // repeated: no double pause
    h.advance(5_000);
    expect(h.app.handleBack(true)).toBe(true);
    expect(h.effects()).toEqual([]);
    h.app.setAdShowing(false);
    h.advance(500);
    expect(h.app.timer.elapsed()).toBe(1_500);
  });
});

describe('Game Over: Continue with a rewarded ad', () => {
  /** Level 2 (really unlocked, so it is recorded), lost after 5 s; returns what the Game Over dialog was given. */
  async function lose(options: Options = {}) {
    const h = createHarness({ ads: {}, playTimeMs: PLAYED, progress: progressThrough(1), ...options });
    await enterLevel(h, 2);
    h.advance(5_000);
    h.state.set({ status: 'failed', lives: 0, mistakes: 3, remaining: 4 });
    h.app.handleLevelLost();
    h.app.handleLevelFailed();
    const shown = h.calls('gameOverDialog.show').at(-1)?.[0];
    h.clear();
    return Object.assign(h, { shown });
  }

  it('is offered on Game Over; after the ad the same run continues with one heart, the clock running again', async () => {
    const h = await lose();
    expect(h.shown).toMatchObject({ canContinue: true });
    await h.app.continueWithAd();
    expect(h.effects()).toEqual(['ads.watchForContinue', 'gameOverDialog.hide', 'scene.continueAfterFailure', 'feedback claim', 'toast.show +1 heart: keep going! 2200 achievement']);
    expect(h.state.snap).toMatchObject({ status: 'playing', lives: 1 });
    h.advance(1_000);
    expect(h.app.timer.elapsed()).toBe(6_000); // 5 s before + 1 s after (the Game Over screen didn't count)
  });

  it('once per attempt: a second loss offers only Try again; the run is then saved as one failed attempt', async () => {
    const h = await lose();
    await h.app.continueWithAd();
    h.state.set({ status: 'failed', lives: 0, mistakes: 4 });
    h.app.handleLevelLost();
    h.app.handleLevelFailed();
    expect(h.calls('gameOverDialog.show').at(-1)![0]).toMatchObject({ canContinue: false });
    h.clear();
    await h.app.continueWithAd();
    expect(h.effects()).toEqual([]);
    h.app.restartLevel();
    expect(h.calls('stats.save')).toHaveLength(1);
    expect(h.calls('stats.save')[0][0]).toMatchObject({ failedRuns: 1 });
  });

  it('an ad closed early (or unavailable) brings nothing back; the dialog stays for Try again or Levels', async () => {
    const h = await lose({ ads: { result: { kind: 'dismissed' } } });
    await h.app.continueWithAd();
    expect(h.effects()).toEqual(['ads.watchForContinue', 'toast.show The ad was closed before the end, so no extra heart this time. 3200']);
    expect(h.state.snap.status).toBe('failed');
    h.clear();
    await h.app.showLevelsOrLeague();
    await flush();
    expect(h.calls('stats.save')[0][0]).toMatchObject({ failedRuns: 1 }); // leaving saves the loss
  });

  it('not offered without ads (browser), or in Daily League challenges', async () => {
    const browser = await lose({ ads: undefined });
    expect(browser.shown).toMatchObject({ canContinue: false });
    expect(browser.app.canContinue).toBe(false);

    const h = createHarness({ ads: {}, playTimeMs: PLAYED, progress: progressThrough(10), challenges: [CHALLENGE] });
    h.app.start();
    await h.app.openChallenge(1);
    await flush();
    h.state.set({ status: 'failed', lives: 0, mistakes: 3 });
    h.app.handleLevelLost();
    expect(h.app.canContinue).toBe(false);
  });
});

describe('ad-free start (first 30 minutes of play)', () => {
  it('ads start after the intro; the player can watch them from the start (Shop, Continue), but the booster offer waits', async () => {
    const h = createHarness({ ads: {}, playTimeMs: 12 * 60_000, credits: 5, progress: progressThrough(3) });
    h.app.start();
    h.clear();
    h.app.startAds();
    expect(h.effects()).toEqual(['ads.start']);
    await h.app.showShop();
    await flush();
    expect(h.shopViews.at(-1)).toMatchObject({ earn: { state: expect.any(String) } });
    h.clear();
    await h.app.watchAd();
    expect(h.effects()).toContain('ads.watch');
    await h.app.openLevel(4);
    await flush();
    h.clear();
    h.state.escapableArrows = () => [{ id: 'a1', direction: 'right', cells: [{ row: 0, col: 0 }] } as ArrowData];
    h.rewards.credits = 5;
    h.app.useBooster('hint');
    await flush();
    expect(h.effects().filter((e) => e.startsWith('confirmDialog.ask'))).toEqual([]); // no ad offer, only the explanation
  });

  it('Continue is offered on Game Over during the ad-free start', async () => {
    const h = createHarness({ ads: {}, playTimeMs: 0, progress: progressThrough(1) });
    await enterLevel(h, 2);
    h.advance(5_000);
    h.state.set({ status: 'failed', lives: 0, mistakes: 3, remaining: 4 });
    h.app.handleLevelLost();
    h.app.handleLevelFailed();
    expect(h.calls('gameOverDialog.show').at(-1)![0]).toMatchObject({ canContinue: true });
  });
});
