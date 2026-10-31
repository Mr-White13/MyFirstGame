import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState';
import { levelFromMap } from '../levels/levelMap';
import type { MoveResult } from '../core/types';
import { MoveSequencer, StepOwners, type SequenceStep } from './MoveSequencer';

/** A step whose `done` the test triggers by hand, like an animation that finishes later. */
function manualStep(log: string[], name: string) {
  let finish: (() => void) | null = null;
  const step: SequenceStep = {
    run: (done) => {
      log.push(`start ${name}`);
      finish = done;
    },
  };
  return { step, finish: () => finish?.() };
}

describe('MoveSequencer', () => {
  it('plays steps one after another and finishes once', () => {
    const log: string[] = [];
    const a = manualStep(log, 'a');
    const b = manualStep(log, 'b');
    const sequencer = new MoveSequencer();
    sequencer.run([a.step, b.step], () => log.push('finished'));
    expect(log).toEqual(['start a']);
    a.finish();
    expect(log).toEqual(['start a', 'start b']);
    b.finish();
    b.finish(); // a duplicate done is ignored
    expect(log).toEqual(['start a', 'start b', 'finished']);
    expect(sequencer.busy).toBe(false);
  });

  it('plays a new sequence at once, alongside one still playing (rapid taps are not held back)', () => {
    const log: string[] = [];
    const first = manualStep(log, 'first');
    const second = manualStep(log, 'second');
    const sequencer = new MoveSequencer();
    sequencer.run([first.step], () => log.push('first finished'));
    sequencer.run([second.step], () => log.push('second finished'));
    expect(log).toEqual(['start first', 'start second']);
    expect(sequencer.running).toBe(2);
    second.finish();
    expect(sequencer.busy).toBe(true); // the first is still playing
    first.finish();
    expect(sequencer.busy).toBe(false);
    expect(log).toEqual(['start first', 'start second', 'second finished', 'first finished']);
  });

  it('cancel stops every sequence, and stale callbacks never touch a newer one', () => {
    const log: string[] = [];
    const old1 = manualStep(log, 'old1');
    const old2 = manualStep(log, 'old2');
    const other = manualStep(log, 'other');
    const sequencer = new MoveSequencer();
    sequencer.run([old1.step, old2.step], () => log.push('old finished'));
    sequencer.run([other.step], () => log.push('other finished'));
    sequencer.cancel();
    expect(sequencer.busy).toBe(false);

    const fresh = manualStep(log, 'fresh');
    sequencer.run([fresh.step], () => log.push('fresh finished'));
    old1.finish(); // cut-off animations report done late
    other.finish();
    expect(log).toEqual(['start old1', 'start other', 'start fresh']);
    expect(sequencer.running).toBe(1);
    fresh.finish();
    expect(log).toEqual(['start old1', 'start other', 'start fresh', 'fresh finished']);
  });
});

describe('StepOwners: one step per arrow', () => {
  it('a new step on a busy arrow settles the interrupted one, so its sequence still finishes', () => {
    const owners = new StepOwners<string>();
    const sequencer = new MoveSequencer();
    const log: string[] = [];
    // A blocked bounce that would be cut off (its animation never reports done)...
    sequencer.run([owners.step('a', () => log.push('bounce'))], () => log.push('bounce sequence done'));
    // ...because a chain releases the same arrow.
    let exitDone = () => {};
    sequencer.run([owners.step('a', (done) => ((exitDone = done), log.push('exit')))], () => log.push('exit sequence done'));
    expect(log).toEqual(['bounce', 'bounce sequence done', 'exit']);
    exitDone();
    expect(sequencer.busy).toBe(false);
  });

  it('different arrows animate independently, and clear() forgets pending steps', () => {
    const owners = new StepOwners<string>();
    const sequencer = new MoveSequencer();
    let finished = 0;
    sequencer.run([owners.step('a', () => {})], () => finished++);
    sequencer.run([owners.step('b', () => {})], () => finished++);
    expect(finished).toBe(0);
    owners.clear();
    sequencer.cancel();
    sequencer.run([owners.step('a', (done) => done())], () => finished++);
    expect(finished).toBe(1); // nothing from before the cancel was settled
  });
});

/*
 * The scene's tap policy without Phaser: each released tap goes to GameState
 * at once (only arrows still on the board can be picked), and its animation
 * plays as its own sequence, one step per arrow.
 */
class TapHarness {
  readonly sequencer = new MoveSequencer();
  readonly owners = new StepOwners<string>();
  /** Running animations by arrow id: call to finish (the tail has left the board). */
  readonly animating = new Map<string, () => void>();
  readonly results: MoveResult[] = [];
  ended: 'won' | 'failed' | null = null;

  constructor(readonly state: GameState) {}

  tap(id: string, at: number): void {
    if (this.ended || !this.state.isPlaying || !this.state.has(id)) return; // stale or duplicate: never reaches the rules
    const result = this.state.tryMove(id, at);
    this.results.push(result);
    const step = (arrowId: string) => this.owners.step(arrowId, (done) => this.animating.set(arrowId, done));
    const steps =
      result.kind === 'cleared'
        ? [result.arrowId, ...result.chain.map((r) => r.arrowId), ...result.cascade.map((r) => r.arrowId), ...result.cascadeChain.map((r) => r.arrowId)].map(step)
        : result.kind === 'blocked'
          ? [step(result.arrowId)]
          : [];
    if (steps.length > 0) this.sequencer.run(steps, () => this.afterSequence());
  }

  finish(id: string): void {
    const done = this.animating.get(id);
    this.animating.delete(id);
    done?.();
  }

  cancel(): void {
    this.sequencer.cancel();
    this.owners.clear();
    this.animating.clear();
  }

  private afterSequence(): void {
    if (this.ended || this.sequencer.busy) return;
    if (this.state.isWon) this.ended = 'won';
    else if (this.state.isFailed) this.ended = 'failed';
  }
}

describe('rapid taps', () => {
  // a, b, c and d are free; e (up) is blocked only by a; f (up) by d, c, b and a.
  const level = levelFromMap(2, [
    'a  a> .  .  .',
    'b> .  .  .  .',
    'c> .  .  .  .',
    'd> .  .  .  .',
    'f^ e^ .  .  .',
  ]);
  const slow = (i: number) => i * 2000; // no streak bonus: each arrow is the player's own tap

  it('taps made while earlier arrows are still leaving are all applied, in tap order', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('a', slow(0));
    h.tap('b', slow(1)); // a is still animating
    h.tap('c', slow(2));
    expect(h.results.map((r) => r.kind)).toEqual(['cleared', 'cleared', 'cleared']);
    expect(h.sequencer.running).toBe(3); // three arrows leaving at once
    expect(h.state.snapshot()).toMatchObject({ directClears: 3, remaining: 3, lives: 3 });
  });

  it('a tap on an arrow freed by an arrow that is still leaving succeeds (no false penalty)', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('a', slow(0)); // e's blocker leaves, visually still on its way out
    h.tap('e', slow(1));
    expect(h.results[1]).toMatchObject({ kind: 'cleared', arrowId: 'e' });
    expect(h.state.snapshot().mistakes).toBe(0);
  });

  it('a duplicate tap on an arrow that already left never reaches the rules', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('a', slow(0));
    h.tap('a', slow(0) + 40); // double tap while it slides away
    expect(h.results).toHaveLength(1);
    expect(h.state.snapshot()).toMatchObject({ directClears: 1, mistakes: 0, lives: 3 });
  });

  it('a double tap on a blocked arrow costs one life, not two', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('e', slow(0));
    h.tap('e', slow(0) + 60); // the bounce is still playing: the second tap is a repeat on a red arrow
    expect(h.state.snapshot()).toMatchObject({ mistakes: 1, lives: 2 });
    expect(h.results[1]).toMatchObject({ kind: 'blocked', lifeLost: false });
    h.finish('e');
    expect(h.sequencer.busy).toBe(false); // the interrupted bounce was settled
  });

  it('red arrows released by a chain while being animated still finish their sequences', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('e', slow(0)); // e turns red; its bounce is playing
    h.tap('a', slow(1)); // frees e: the chain releases it while the bounce is still running
    expect(h.results[1]).toMatchObject({ kind: 'cleared', chain: [{ arrowId: 'e' }] });
    h.finish('a');
    h.finish('e');
    expect(h.sequencer.busy).toBe(false);
  });

  it('the level ends only after every animation has finished', () => {
    const h = new TapHarness(new GameState(level));
    for (const [i, id] of ['a', 'b', 'c', 'd', 'e', 'f'].entries()) h.tap(id, slow(i));
    expect(h.state.isWon).toBe(true);
    expect(h.ended).toBeNull(); // arrows are still leaving
    for (const id of ['f', 'e', 'd', 'c', 'b']) h.finish(id);
    expect(h.ended).toBeNull();
    h.finish('a');
    expect(h.ended).toBe('won');
    h.tap('a', slow(9)); // after the end nothing is accepted
    expect(h.results).toHaveLength(6);
  });

  it('quick taps still earn the streak bonus, and bonus arrows can no longer be tapped', () => {
    // Eight free arrows in a column, z behind them.
    const column = levelFromMap(3, ['a> .', 'b> .', 'c> .', 'd> .', 'e> .', 'f> .', 'g> .', 'h> .', 'z^ .']);
    const h = new TapHarness(new GameState(column));
    ['a', 'b', 'c', 'd', 'e'].forEach((id, i) => h.tap(id, i * 300)); // 5 taps within 4 s
    const bonus = h.results[4];
    expect(bonus.kind === 'cleared' && bonus.cascade.map((r) => r.arrowId)).toEqual(['f', 'g']);
    h.tap('f', 1300); // already cleared by the bonus, still animating: ignored, no penalty
    expect(h.results).toHaveLength(5);
    expect(h.state.snapshot()).toMatchObject({ mistakes: 0, cascadeClears: 2, remaining: 2 });
  });

  it('restart mid-animation drops every pending animation; new taps start clean', () => {
    const h = new TapHarness(new GameState(level));
    h.tap('a', slow(0));
    h.tap('e', slow(1));
    h.cancel();
    h.state.reset();
    h.finish('a'); // late callbacks from the old session do nothing
    expect(h.sequencer.busy).toBe(false);
    h.tap('b', slow(2));
    expect(h.state.snapshot()).toMatchObject({ directClears: 1, mistakes: 0, lives: 3, remaining: 5 });
    expect(h.sequencer.running).toBe(1);
  });
});

describe('restarting during a chain reaction', () => {
  // a and b are blocked by c; tapping both, then c, triggers a two-arrow chain.
  const fork = levelFromMap(1, [
    '.  .  .  .  .',
    'a  a> c  .  .',
    '.  .  c  .  .',
    'b  b> cv .  .',
    '.  .  .  .  .',
  ]);

  it('cannot corrupt the next game session', () => {
    const state = new GameState(fork);
    const sequencer = new MoveSequencer();
    const pending: (() => void)[] = [];
    const animate = (): SequenceStep => ({ run: (done) => pending.push(done) });
    let ended = 0;

    state.tryMove('a');
    state.tryMove('b');
    const move = state.tryMove('c');
    if (move.kind !== 'cleared') throw new Error('expected clear');
    sequencer.run([animate(), ...move.chain.map(animate)], () => ended++);
    pending[0](); // c has left; a's automatic release is now animating

    // Restart mid-chain, as the scene does.
    sequencer.cancel();
    state.reset();

    // A new session starts a sequence of its own.
    const tap = state.tryMove('c');
    expect(tap.kind).toBe('cleared');
    const newPending: (() => void)[] = [];
    sequencer.run([{ run: (done) => newPending.push(done) }], () => ended++);

    // Late callbacks from the old chain fire now: nothing may happen.
    pending.slice(1).forEach((done) => done());
    expect(ended).toBe(0);
    expect(sequencer.busy).toBe(true);
    expect(state.snapshot()).toMatchObject({ lives: 3, mistakes: 0, autoClears: 0, directClears: 1, remaining: 2 });

    newPending[0]();
    expect(ended).toBe(1);
    expect(sequencer.busy).toBe(false);
  });
});

describe('streak bonus exits: together, staggered', () => {
  /** A manual timer: scheduled starts run when the test advances time. */
  function timer() {
    let now = 0;
    const queue: { at: number; start: () => void }[] = [];
    return {
      schedule: (start: () => void, ms: number) => void queue.push({ at: now + ms, start }),
      advance(ms: number) {
        now += ms;
        for (const item of queue.filter((q) => q.at <= now).sort((a, b) => a.at - b.at)) {
          queue.splice(queue.indexOf(item), 1);
          item.start();
        }
      },
    };
  }

  it('starts every bonus arrow a short stagger apart, each with its own exit, and waits for all', () => {
    const log: string[] = [];
    const t = timer();
    const sequencer = new MoveSequencer();
    const exits = ['d', 'e', 'f'].map((id) => manualStep(log, id));
    const tapped = manualStep(log, 'tap');
    sequencer.run([tapped.step, sequencer.together(exits.map((e) => e.step), 90, t.schedule), manualStep(log, 'red').step], () => log.push('done'));
    tapped.finish();
    expect(log).toEqual(['start tap', 'start d']); // the first bonus arrow leaves at once
    t.advance(90);
    expect(log).toEqual(['start tap', 'start d', 'start e']); // not waiting for d to leave
    t.advance(90);
    expect(log).toContain('start f');
    exits[2].finish();
    exits[0].finish();
    expect(log).not.toContain('start red'); // e is still on its way out
    exits[1].finish();
    expect(log.at(-1)).toBe('start red'); // red arrows freed by the bonus come after it
  });

  it('a bonus with a single arrow plays as a plain exit; an empty one is a no-op', () => {
    const log: string[] = [];
    const t = timer();
    const sequencer = new MoveSequencer();
    const only = manualStep(log, 'only');
    sequencer.run([sequencer.together([only.step], 90, t.schedule)], () => log.push('done'));
    only.finish();
    sequencer.run([sequencer.together([], 90, t.schedule)], () => log.push('empty done'));
    expect(log).toEqual(['start only', 'done', 'empty done']);
  });

  it('restart during a staggered bonus: arrows not yet started never start, late callbacks do nothing', () => {
    const log: string[] = [];
    const t = timer();
    const sequencer = new MoveSequencer();
    const exits = ['d', 'e', 'f'].map((id) => manualStep(log, id));
    let finished = 0;
    sequencer.run([sequencer.together(exits.map((e) => e.step), 90, t.schedule)], () => finished++);
    sequencer.cancel(); // restart while d is leaving
    t.advance(500);
    exits[0].finish();
    expect(log).toEqual(['start d']);
    expect(finished).toBe(0);
    expect(sequencer.busy).toBe(false);
  });

  it('overlaps naturally with a manual exit started meanwhile', () => {
    const log: string[] = [];
    const t = timer();
    const sequencer = new MoveSequencer();
    const owners = new StepOwners<string>();
    const pending = new Map<string, () => void>();
    const exit = (id: string) => owners.step(id, (done) => (log.push(`exit ${id}`), pending.set(id, done)));
    sequencer.run([exit('a'), sequencer.together([exit('d'), exit('e')], 90, t.schedule)]);
    pending.get('a')!();
    sequencer.run([exit('x')]); // the player taps another arrow while the bonus is flying
    t.advance(90);
    expect(log).toEqual(['exit a', 'exit d', 'exit x', 'exit e']);
    expect(sequencer.running).toBe(2);
    for (const id of ['d', 'x', 'e']) pending.get(id)!();
    expect(sequencer.busy).toBe(false);
  });
});
