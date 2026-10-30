import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState';
import { levelFromMap } from '../levels/levelMap';
import { MoveSequencer, type SequenceStep } from './MoveSequencer';

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

  it('ignores new input while a sequence (e.g. a chain reaction) is playing', () => {
    const log: string[] = [];
    const a = manualStep(log, 'a');
    const sequencer = new MoveSequencer();
    expect(sequencer.run([a.step])).toBe(true);
    expect(sequencer.busy).toBe(true);
    expect(sequencer.run([manualStep(log, 'intruder').step])).toBe(false);
    expect(log).toEqual(['start a']);
    a.finish();
    expect(sequencer.busy).toBe(false);
  });

  it('cancel releases the lock, and stale callbacks never touch a newer sequence', () => {
    const log: string[] = [];
    const old1 = manualStep(log, 'old1');
    const old2 = manualStep(log, 'old2');
    const sequencer = new MoveSequencer();
    sequencer.run([old1.step, old2.step], () => log.push('old finished'));
    sequencer.cancel();
    expect(sequencer.busy).toBe(false);

    const fresh = manualStep(log, 'fresh');
    sequencer.run([fresh.step], () => log.push('fresh finished'));
    old1.finish(); // the cut-off animation reports done late
    expect(log).toEqual(['start old1', 'start fresh']);
    expect(sequencer.busy).toBe(true);
    fresh.finish();
    expect(log).toEqual(['start old1', 'start fresh', 'fresh finished']);
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
