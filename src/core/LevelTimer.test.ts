import { describe, expect, it } from 'vitest';
import { LevelTimer } from './LevelTimer';
import { formatClock, formatPrecise, formatTotal } from './time';

/** A controllable monotonic clock. */
function fakeClock(start = 1000) {
  let now = start;
  return { clock: () => now, advance: (ms: number) => (now += ms) };
}

describe('LevelTimer', () => {
  it('does not count before gameplay becomes interactive', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    t.advance(800); // loading, entrance animation
    expect(timer.elapsed()).toBe(0);
    expect(timer.running).toBe(false);
    timer.start();
    t.advance(1500);
    expect(timer.elapsed()).toBe(1500);
    expect(timer.running).toBe(true);
  });

  it('pauses while the page is hidden', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(1000);
    timer.pause('hidden');
    t.advance(60_000);
    expect(timer.elapsed()).toBe(1000);
    timer.resume('hidden');
    t.advance(500);
    expect(timer.elapsed()).toBe(1500);
  });

  it('never double-counts repeated pause or resume events', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(1000);
    timer.pause('hidden');
    timer.pause('hidden');
    t.advance(5000);
    timer.resume('hidden');
    timer.resume('hidden');
    timer.resume('hidden');
    t.advance(1000);
    expect(timer.elapsed()).toBe(2000);
    timer.start(); // a stray second start changes nothing either
    t.advance(1000);
    expect(timer.elapsed()).toBe(3000);
  });

  it('pauses for a confirmation dialog, and stays paused until every reason is gone', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(1000);
    timer.pause('confirm');
    t.advance(3000);
    timer.pause('hidden'); // app backgrounded while the dialog is open
    t.advance(3000);
    timer.resume('confirm');
    t.advance(3000);
    expect(timer.elapsed()).toBe(1000); // still hidden
    timer.resume('hidden');
    t.advance(250);
    expect(timer.elapsed()).toBe(1250);
  });

  it('resets to zero on restart and only counts again after start', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(4000);
    timer.reset();
    expect(timer.elapsed()).toBe(0);
    t.advance(1000);
    expect(timer.elapsed()).toBe(0);
    timer.start();
    t.advance(700);
    expect(timer.elapsed()).toBe(700);
  });

  it('keeps a page-level pause across a reset', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.pause('hidden');
    timer.reset();
    timer.start();
    t.advance(1000);
    expect(timer.elapsed()).toBe(0);
    timer.resume('hidden');
    t.advance(1000);
    expect(timer.elapsed()).toBe(1000);
  });

  it('stops for good on completion or Game Over', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(2500);
    timer.stop();
    t.advance(10_000);
    timer.resume('hidden');
    timer.start();
    expect(timer.elapsed()).toBe(2500);
    expect(timer.stopped).toBe(true);
    expect(timer.running).toBe(false);
  });

  it('stopping while paused keeps the paused total', () => {
    const t = fakeClock();
    const timer = new LevelTimer(t.clock);
    timer.start();
    t.advance(1000);
    timer.pause('confirm');
    t.advance(1000);
    timer.stop(); // player confirmed leaving
    expect(timer.elapsed()).toBe(1000);
  });
});

describe('time formatting', () => {
  it('formats the HUD clock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(24_900)).toBe('00:24');
    expect(formatClock(95_000)).toBe('01:35');
    expect(formatClock(768_000)).toBe('12:48');
    expect(formatClock(3_735_000)).toBe('01:02:15');
  });

  it('formats precise results without rounding up', () => {
    expect(formatPrecise(24_640)).toBe('24.6 s');
    expect(formatPrecise(59_990)).toBe('59.9 s');
    expect(formatPrecise(95_250)).toBe('1:35.2');
    expect(formatPrecise(605_000)).toBe('10:05.0');
    expect(formatPrecise(3_735_000)).toBe('01:02:15');
  });

  it('formats totals', () => {
    expect(formatTotal(0)).toBe('0 s');
    expect(formatTotal(29_900)).toBe('29 s');
    expect(formatTotal(42 * 60_000)).toBe('42 min');
    expect(formatTotal(185 * 60_000)).toBe('3 h 05 min');
  });
});
