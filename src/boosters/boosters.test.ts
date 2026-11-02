import { describe, expect, it, vi } from 'vitest';
import { BoosterController, type BoosterDeps } from '../app/BoosterController';
import { AttemptTracker } from '../app/AttemptTracker';
import { GameState } from '../core/GameState';
import { LEVELS } from '../levels';
import { createProgress, type Progress } from '../progress/Progress';
import { createStats, type PlayerStats } from '../profile/Stats';
import { boosterTransactionId, readRewards, REWARDS_KEY, Rewards, serializeRewards, createRewards } from '../rewards/Rewards';
import { createWallet, earn, spend } from '../rewards/Wallet';
import { MemoryStore } from '../testing/memoryStore';
import { BOOSTER_LOCK_MS, BOOSTERS, BOOSTERS_FROM_LEVEL, checkBooster, hintTarget, REVEAL_MS, type BoosterContext, type BoosterId } from './Boosters';

const DAY = '2026-11-02';
const level = (id: number) => LEVELS[id - 1];

/** An arrow on the board that is blocked right now (tapping it costs a heart). */
function blockedArrow(state: GameState): string {
  const free = new Set(state.escapableArrows().map((a) => a.id));
  const arrow = state.getArrows().find((a) => !free.has(a.id) && !state.isActivated(a.id));
  if (!arrow) throw new Error('no blocked arrow');
  return arrow.id;
}

describe('safe arrows (the rules boosters use)', () => {
  it('escapableArrows is exactly the arrows a tap clears without losing a heart, on the current board', () => {
    for (const id of [1, 2, 3, 4, 10, 20, 31, 94]) {
      const state = new GameState(level(id), { validate: false });
      // Check every arrow against a fresh copy, then clear a few and check again (the current board, not the layout).
      for (let round = 0; round < 3 && state.isPlaying; round++) {
        const free = new Set(state.escapableArrows().map((a) => a.id));
        expect(free.size).toBeGreaterThan(0);
        for (const arrow of state.getArrows()) {
          const probe = new GameState(level(id), { validate: false });
          for (const gone of level(id).arrows.filter((a) => !state.has(a.id))) probe.tryMove(gone.id); // replay the clears so far
          const result = probe.tryMove(arrow.id);
          expect(result.kind === 'cleared', `level ${id}, arrow ${arrow.id}`).toBe(free.has(arrow.id));
        }
        state.tryMove([...free][0]);
      }
    }
  });

  it('a level can always be finished by following hints only, without losing a heart', () => {
    for (const id of [1, 5, 12, 20, 47, 100]) {
      const state = new GameState(level(id), { validate: false });
      let taps = 0;
      while (state.isPlaying) {
        const target = hintTarget(state);
        expect(target).not.toBeNull();
        const result = state.tryMove(target!);
        expect(result.kind).toBe('cleared');
        taps++;
      }
      expect(state.isWon).toBe(true);
      expect(state.snapshot()).toMatchObject({ mistakes: 0, lives: 3, stars: 3 });
      expect(taps).toBeLessThanOrEqual(level(id).arrows.length);
    }
  });

  it('a hint is deterministic and prefers the free arrow that blocks the most others', () => {
    const state = new GameState(level(20), { validate: false });
    const target = hintTarget(state)!;
    expect(hintTarget(state)).toBe(target);
    const blocking = (id: string) => state.getArrows().filter((a) => state.blockerOf(a.id) === id).length;
    for (const free of state.escapableArrows()) expect(blocking(target)).toBeGreaterThanOrEqual(blocking(free.id));
  });

  it('nothing can escape once the level is over', () => {
    const state = new GameState(level(1), { validate: false });
    while (state.isPlaying) state.tryMove(state.escapableArrows()[0].id);
    expect(state.escapableArrows()).toEqual([]);
    expect(hintTarget(state)).toBeNull();
  });
});

describe('Extra Heart (GameState.restoreLife)', () => {
  it('does nothing at full hearts', () => {
    const state = new GameState(level(4), { validate: false });
    expect(state.restoreLife()).toBe(false);
    expect(state.lives).toBe(3);
  });

  it('gives back exactly one heart after a mistake, never above three; the mistake still counts', () => {
    const state = new GameState(level(4), { validate: false });
    state.tryMove(blockedArrow(state));
    state.tryMove(blockedArrow(state));
    expect(state.lives).toBe(1);
    expect(state.restoreLife()).toBe(true);
    expect(state.lives).toBe(2);
    expect(state.restoreLife()).toBe(true);
    expect(state.restoreLife()).toBe(false);
    expect(state.snapshot()).toMatchObject({ lives: 3, mistakes: 2, status: 'playing' });
  });

  it('never raises the star rating: stars count mistakes, not restored hearts', () => {
    const state = new GameState(level(4), { validate: false });
    state.tryMove(blockedArrow(state));
    state.restoreLife();
    while (state.isPlaying) state.tryMove(state.escapableArrows()[0].id);
    expect(state.snapshot()).toMatchObject({ won: true, lives: 3, mistakes: 1, stars: 2 });
  });

  it('a restored heart lets a fourth mistake be survived; a win then still rates at least one star', () => {
    const state = new GameState(level(10), { validate: false });
    state.tryMove(blockedArrow(state));
    state.tryMove(blockedArrow(state));
    state.restoreLife();
    state.tryMove(blockedArrow(state));
    expect(state.snapshot()).toMatchObject({ status: 'playing', lives: 1, mistakes: 3 });
    while (state.isPlaying) state.tryMove(state.escapableArrows()[0].id);
    expect(state.snapshot()).toMatchObject({ won: true, stars: 1 });
  });

  it('is refused after Game Over and after the level is won, and a restart clears it', () => {
    const lost = new GameState(level(10), { validate: false });
    for (let i = 0; i < 3; i++) lost.tryMove(blockedArrow(lost));
    expect(lost.isFailed).toBe(true);
    expect(lost.restoreLife()).toBe(false);
    expect(lost.lives).toBe(0);

    const won = new GameState(level(1), { validate: false });
    won.tryMove(blockedArrow(won));
    while (won.isPlaying) won.tryMove(won.escapableArrows()[0].id);
    expect(won.restoreLife()).toBe(false);

    const restarted = new GameState(level(4), { validate: false });
    restarted.tryMove(blockedArrow(restarted));
    restarted.restoreLife();
    restarted.reset();
    expect(restarted.snapshot()).toMatchObject({ lives: 3, mistakes: 0 });
    expect(restarted.restoreLife()).toBe(false);
  });

  it('runs without a heart lost behave exactly as before (stars equal lives)', () => {
    const state = new GameState(level(4), { validate: false });
    state.tryMove(blockedArrow(state));
    while (state.isPlaying) state.tryMove(state.escapableArrows()[0].id);
    const snap = state.snapshot();
    expect(snap.stars).toBe(snap.lives);
  });
});

describe('checkBooster', () => {
  const ctx: BoosterContext = { playing: true, challenge: false, testPlay: false, credits: 100, lives: 2, maxLives: 3, escapable: 4, hintShowing: false, revealShowing: false, locked: false };

  it('charges each booster its cost when it can do something', () => {
    for (const id of ['hint', 'reveal', 'heart'] as BoosterId[]) {
      expect(checkBooster(id, ctx)).toEqual({ ok: true, payment: { kind: 'credits', cost: BOOSTERS[id].cost } });
    }
    expect([BOOSTERS.hint.cost, BOOSTERS.reveal.cost, BOOSTERS.heart.cost]).toEqual([20, 40, 80]);
  });

  it('refuses with the most useful reason, before asking for credits', () => {
    const poor = { ...ctx, credits: 0 };
    expect(checkBooster('heart', { ...poor, lives: 3 })).toEqual({ ok: false, reason: 'full-hearts' });
    expect(checkBooster('hint', { ...poor, escapable: 0 })).toEqual({ ok: false, reason: 'no-target' });
    expect(checkBooster('reveal', { ...poor, escapable: 0 })).toEqual({ ok: false, reason: 'no-target' });
    expect(checkBooster('hint', poor)).toEqual({ ok: false, reason: 'insufficient' });
    expect(checkBooster('heart', { ...ctx, credits: 79 })).toEqual({ ok: false, reason: 'insufficient' });
    expect(checkBooster('heart', { ...ctx, credits: 80 }).ok).toBe(true);
    expect(checkBooster('hint', { ...ctx, playing: false })).toEqual({ ok: false, reason: 'not-playing' });
    expect(checkBooster('hint', { ...ctx, challenge: true })).toEqual({ ok: false, reason: 'challenge' });
    expect(checkBooster('hint', { ...ctx, hintShowing: true })).toEqual({ ok: false, reason: 'active' });
    expect(checkBooster('reveal', { ...ctx, revealShowing: true })).toEqual({ ok: false, reason: 'active' });
    expect(checkBooster('hint', { ...ctx, locked: true })).toEqual({ ok: false, reason: 'locked' });
  });

  it('test plays are free, even with no credits', () => {
    expect(checkBooster('heart', { ...ctx, testPlay: true, credits: 0 })).toEqual({ ok: true, payment: { kind: 'free', reason: 'test-play' } });
  });
});

/** A controller over a real GameState and the real Rewards wallet, with a fake scene and toolbar. */
function setup(options: { credits?: number; levelId?: number; challenge?: boolean; testPlay?: boolean; store?: MemoryStore | null } = {}) {
  const store = options.store === undefined ? new MemoryStore() : options.store;
  const records = { progress: createProgress() as Progress, stats: createStats(new Date(Date.UTC(2026, 0, 1))) as PlayerStats };
  const rewards = new Rewards({ levels: LEVELS, records: () => records }, store);
  if (options.credits) rewards.grant(DAY, { id: 'test:seed', amount: options.credits });
  const state = new GameState(level(options.levelId ?? 10), { validate: false });
  const attempt = new AttemptTracker(() => 0);
  attempt.begin(state.levelId, 1);
  let now = 0;
  const scene = {
    hinted: null as string | null,
    revealed: [] as readonly string[],
    revealUntil: -1,
    get hintShowing() {
      return this.hinted !== null && state.has(this.hinted);
    },
    get revealShowing() {
      return now < this.revealUntil;
    },
    showHint(id: string) {
      this.hinted = id;
      return true;
    },
    showReveal(ids: readonly string[], ms: number) {
      this.revealed = ids;
      this.revealUntil = now + ms;
      return true;
    },
  };
  const notes: string[] = [];
  const bar = { views: [] as unknown[], flashes: [] as BoosterId[], render: vi.fn(), flash: (id: BoosterId) => void bar.flashes.push(id) };
  const mode = { challenge: options.challenge ?? false, testPlay: options.testPlay ?? false };
  const deps: BoosterDeps = {
    state,
    scene,
    wallet: { get credits() { return rewards.credits; }, spend: (id) => rewards.spendBooster(DAY, id) },
    attempt,
    bar,
    mode: () => mode,
    notify: (m) => void notes.push(m),
    now: () => now,
  };
  const controller = new BoosterController(deps);
  const advance = (ms: number) => (now += ms);
  return { controller, rewards, state, scene, attempt, notes, bar, store, advance, mode };
}

describe('BoosterController', () => {
  it('Hint: charges 20 once, points at a safe arrow, and changes nothing on the board', () => {
    const { controller, rewards, state, scene, attempt } = setup({ credits: 100 });
    const before = state.snapshot();
    expect(controller.use('hint')).toEqual({ used: true, charged: 20 });
    expect(rewards.credits).toBe(80);
    expect(state.escapableArrows().map((a) => a.id)).toContain(scene.hinted);
    expect(state.snapshot()).toEqual(before); // lives, arrows, streak: untouched
    expect(attempt.boostersUsed).toMatchObject({ hint: 1 });
  });

  it('Reveal: charges 40 and shows every free arrow for about 3 seconds', () => {
    const { controller, rewards, state, scene } = setup({ credits: 100 });
    expect(controller.use('reveal')).toEqual({ used: true, charged: 40 });
    expect(rewards.credits).toBe(60);
    expect([...scene.revealed].sort()).toEqual(state.escapableArrows().map((a) => a.id).sort());
    expect(scene.revealUntil).toBe(REVEAL_MS);
  });

  it('Extra Heart: refused at full hearts (no charge), then charges 80 for one heart after a mistake', () => {
    const { controller, rewards, state, notes } = setup({ credits: 200 });
    expect(controller.use('heart')).toEqual({ used: false, reason: 'full-hearts' });
    expect(rewards.credits).toBe(200);
    expect(notes.at(-1)).toMatch(/already full/);
    state.tryMove(blockedArrow(state));
    expect(controller.use('heart')).toEqual({ used: true, charged: 80 });
    expect(rewards.credits).toBe(120);
    expect(state.lives).toBe(3);
  });

  it('insufficient credits: nothing is charged or shown, and the message explains', () => {
    const { controller, rewards, scene, notes, store } = setup({ credits: 30 });
    const saved = store!.getItem(REWARDS_KEY);
    expect(controller.use('reveal')).toEqual({ used: false, reason: 'insufficient' });
    expect(rewards.credits).toBe(30);
    expect(scene.revealed).toEqual([]);
    expect(store!.getItem(REWARDS_KEY)).toBe(saved);
    expect(notes.at(-1)).toBe('Reveal costs 40 Energy Credits; you have 30. Earn more from daily rewards and achievements.');
  });

  it('rapid repeated taps are charged once', () => {
    const { controller, rewards, state, advance } = setup({ credits: 500 });
    state.tryMove(blockedArrow(state));
    state.tryMove(blockedArrow(state));
    const results = [controller.use('heart'), controller.use('heart'), controller.use('hint'), controller.use('hint')];
    expect(results.filter((r) => r.used)).toHaveLength(1);
    expect(rewards.credits).toBe(420);
    expect(state.lives).toBe(2);
    advance(BOOSTER_LOCK_MS);
    expect(controller.use('heart').used).toBe(true); // a deliberate second use later is fine
    expect(rewards.credits).toBe(340);
  });

  it('a Hint still waiting is not bought again; once its arrow is tapped, a new one can be', () => {
    const { controller, rewards, state, scene, advance } = setup({ credits: 100 });
    controller.use('hint');
    advance(BOOSTER_LOCK_MS);
    expect(controller.use('hint')).toEqual({ used: false, reason: 'active' });
    expect(rewards.credits).toBe(80);
    state.tryMove(scene.hinted!);
    expect(controller.use('hint').used).toBe(true);
    expect(rewards.credits).toBe(60);
  });

  it('Hint and Reveal without a valid target charge nothing', () => {
    // A board where nothing can escape can't happen while a valid level is being played
    // (a free red arrow is released at once), so this uses a stand-in state.
    const { rewards, notes } = setup({ credits: 100 });
    const empty = new BoosterController({
      state: { isPlaying: true, lives: 3, maxLives: 3, escapableArrows: () => [], getArrows: () => [], blockerOf: () => null, restoreLife: () => false },
      scene: { hintShowing: false, revealShowing: false, showHint: () => true, showReveal: () => true },
      wallet: { get credits() { return rewards.credits; }, spend: (id) => rewards.spendBooster(DAY, id) },
      attempt: { isOpen: true, useBooster: () => {} },
      bar: { render: () => {}, flash: () => {} },
      mode: () => ({ challenge: false, testPlay: false }),
      notify: (m) => void notes.push(m),
    });
    expect(empty.use('hint')).toEqual({ used: false, reason: 'no-target' });
    expect(empty.use('reveal')).toEqual({ used: false, reason: 'no-target' });
    expect(rewards.credits).toBe(100);
    expect(notes.at(-1)).toBe('No arrow can escape right now.');
  });

  it('nothing works after Game Over, after a win, or once the attempt has ended (left or restarted)', () => {
    const lost = setup({ credits: 500 });
    for (let i = 0; i < 3; i++) lost.state.tryMove(blockedArrow(lost.state));
    for (const id of ['hint', 'reveal', 'heart'] as BoosterId[]) expect(lost.controller.use(id)).toEqual({ used: false, reason: 'not-playing' });
    expect(lost.rewards.credits).toBe(500);

    const won = setup({ credits: 500, levelId: 1 });
    won.state.tryMove(blockedArrow(won.state));
    while (won.state.isPlaying) won.state.tryMove(won.state.escapableArrows()[0].id);
    expect(won.controller.use('heart')).toEqual({ used: false, reason: 'not-playing' });

    const left = setup({ credits: 500 });
    left.attempt.finish('abandoned', left.state.snapshot());
    expect(left.controller.use('hint')).toEqual({ used: false, reason: 'not-playing' });
    expect(left.rewards.credits).toBe(500);
  });

  it('restart starts a fresh count of boosters for the new attempt', () => {
    const { controller, state, attempt } = setup({ credits: 500 });
    controller.use('hint');
    const summary = attempt.finish('abandoned', state.snapshot());
    expect(summary?.boosters).toEqual({ hint: 1, reveal: 0, heart: 0 });
    state.reset();
    attempt.begin(state.levelId, 1);
    expect(attempt.boostersUsed).toEqual({ hint: 0, reveal: 0, heart: 0 });
  });

  it('test plays get boosters free and never touch the real wallet or its counts', () => {
    const { controller, rewards, state, store, attempt } = setup({ credits: 0, testPlay: true });
    const saved = store!.getItem(REWARDS_KEY);
    state.tryMove(blockedArrow(state));
    expect(controller.use('hint')).toEqual({ used: true, charged: 0 });
    expect(controller.use('heart').used).toBe(false); // locked: rapid tap
    expect(rewards.credits).toBe(0);
    expect(rewards.current.boosters.used).toEqual({ hint: 0, reveal: 0, heart: 0 });
    expect(store!.getItem(REWARDS_KEY)).toBe(saved);
    expect(attempt.boostersUsed.hint).toBe(1); // still counted for the attempt
  });

  it('Daily League challenges have no boosters: the toolbar is hidden and taps are refused', () => {
    const { controller, rewards, bar } = setup({ credits: 500, challenge: true });
    expect(controller.use('hint')).toEqual({ used: false, reason: 'challenge' });
    expect(rewards.credits).toBe(500);
    controller.render();
    expect(bar.render).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
  });

  it('the toolbar shows the balance and marks what would work now', () => {
    const { controller, bar, state } = setup({ credits: 50 });
    controller.render();
    expect(bar.render).toHaveBeenLastCalledWith({ visible: true, credits: 50, free: false, available: { hint: true, reveal: true, heart: false } });
    state.tryMove(blockedArrow(state));
    controller.render();
    expect(bar.render).toHaveBeenLastCalledWith(expect.objectContaining({ available: { hint: true, reveal: true, heart: false } })); // 50 < 80
  });
});

describe('booster spending and saved data', () => {
  it('a paid use and its count are saved in one write, and survive a reload', () => {
    const store = new MemoryStore();
    const records = { progress: createProgress(), stats: createStats() };
    const rewards = new Rewards({ levels: LEVELS, records: () => records }, store);
    rewards.grant(DAY, { id: 'test:seed', amount: 100 });
    store.writes = [];
    expect(rewards.spendBooster(DAY, 'reveal')).toBe(true);
    expect(store.writes).toEqual([REWARDS_KEY]);
    const reloaded = readRewards(store.getItem(REWARDS_KEY)).value;
    expect(reloaded.wallet).toMatchObject({ credits: 60, earned: 100 });
    expect(reloaded.boosters.used).toEqual({ hint: 0, reveal: 1, heart: 0 });
    expect(reloaded.wallet.applied).toContain(boosterTransactionId('reveal', 1));
  });

  it('never goes negative, and a refused spend changes nothing', () => {
    const rewards = new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, new MemoryStore());
    rewards.grant(DAY, { id: 'test:seed', amount: 79 });
    expect(rewards.spendBooster(DAY, 'heart')).toBe(false);
    expect(rewards.credits).toBe(79);
    expect(rewards.current.boosters.used.heart).toBe(0);
    for (let i = 0; i < 10; i++) rewards.spendBooster(DAY, 'hint');
    expect(rewards.credits).toBe(19);
    expect(rewards.current.boosters.used.hint).toBe(3);
  });

  it('saves from before boosters read as no uses and the tip not shown, keeping every other field', () => {
    const old = { version: 1, daily: createRewards().daily, wallet: { credits: 120, earned: 150, applied: ['daily:2026-10-30'] }, achievements: {}, bestChain: 4 };
    const { value, status } = readRewards(JSON.stringify(old));
    expect(status).toBe('current');
    expect(value).toMatchObject({ wallet: old.wallet, bestChain: 4, boosters: { used: { hint: 0, reveal: 0, heart: 0 }, introduced: false } });
    expect(readRewards(serializeRewards(value)).value).toEqual(value);
    const messy = readRewards(JSON.stringify({ ...old, boosters: { used: { hint: -2, reveal: 'x', heart: 3 }, introduced: 'yes' } })).value.boosters;
    expect(messy).toEqual({ used: { hint: 0, reveal: 0, heart: 3 }, introduced: false });
  });

  it('booster ids are trimmed to the most recent ones, so the wallet record stays small', () => {
    let wallet = { ...createWallet() };
    const credited = earn(wallet, { id: 'achievement:first-escape', amount: 1000 });
    if (!credited.ok) throw new Error('earn failed');
    wallet = credited.wallet;
    for (let n = 1; n <= 60; n++) {
      const paid = spend(wallet, { id: boosterTransactionId('hint', n), amount: 1 });
      if (!paid.ok) throw new Error('spend failed');
      wallet = paid.wallet;
    }
    expect(wallet.applied.filter((t) => t.startsWith('booster:'))).toHaveLength(50);
    expect(wallet.applied).toContain('achievement:first-escape');
    expect(wallet.credits).toBe(940);
  });

  it('the first-time tip is remembered', () => {
    const store = new MemoryStore();
    const make = () => new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store);
    const rewards = make();
    expect(rewards.current.boosters.introduced).toBe(false);
    rewards.markBoostersIntroduced(DAY);
    expect(make().current.boosters.introduced).toBe(true);
  });
});

describe('boosters in the tutorial levels', () => {
  it('Levels 1–3 hide the toolbar and ignore booster taps without charging', () => {
    const { controller, rewards, bar, mode } = setup({ credits: 500, levelId: 2 });
    (mode as { tutorial?: boolean }).tutorial = true;
    expect(controller.use('hint')).toEqual({ used: false, reason: 'not-playing' });
    expect(rewards.credits).toBe(500);
    controller.render();
    expect(bar.render).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    expect(BOOSTERS_FROM_LEVEL).toBe(4);
  });
});

describe('rule tips (saved data)', () => {
  it('a tip shown is remembered across reloads; unknown or repeated ids in a save are dropped', () => {
    const store = new MemoryStore();
    const make = () => new Rewards({ levels: LEVELS, records: () => ({ progress: createProgress(), stats: createStats() }) }, store);
    const rewards = make();
    expect(rewards.current.tips).toEqual([]);
    rewards.markTipSeen(DAY, 'blocked');
    rewards.markTipSeen(DAY, 'blocked');
    expect(make().current.tips).toEqual(['blocked']);
    const raw = { ...JSON.parse(store.getItem(REWARDS_KEY)!), tips: ['tap', 'tap', 'sing-a-song', 7, 'chain'] };
    expect(readRewards(JSON.stringify(raw)).value.tips).toEqual(['tap', 'chain']);
    const { tips: _, ...older } = raw;
    expect(readRewards(JSON.stringify(older)).value.tips).toEqual([]); // saves from before tips: none shown yet
  });
});
