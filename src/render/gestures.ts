import type { Point } from './layout';

/**
 * Turns raw pointer events into the game's touch gestures. Pure (no
 * Phaser), so the rules are testable:
 *
 * - One finger down starts a **press** on an arrow. Lifting it **releases**
 *   (the move happens), unless the press was cancelled.
 * - While the board is zoomed, dragging one finger past a small threshold
 *   turns the press into a **pan**: the press is cancelled, so panning never
 *   moves an arrow.
 * - A second finger cancels any press and starts a **pinch** (zoom + pan
 *   around the fingers' midpoint). After a pinch, nothing is pressed or
 *   released until every finger has left the screen, so two-finger gestures
 *   never select arrows.
 */
export type GestureEvent =
  | { readonly type: 'press'; readonly x: number; readonly y: number }
  /** The pressing finger moved (the scene may cancel the press if it slid off the arrow). */
  | { readonly type: 'drag'; readonly x: number; readonly y: number }
  | { readonly type: 'cancelPress' }
  | { readonly type: 'release'; readonly x: number; readonly y: number }
  | { readonly type: 'pan'; readonly dx: number; readonly dy: number }
  | { readonly type: 'pinch'; readonly centerX: number; readonly centerY: number; readonly scale: number };

type Mode = 'idle' | 'press' | 'pan' | 'pinch' | 'done';

export class GestureTracker {
  private readonly pointers = new Map<number, Point>();
  private mode: Mode = 'idle';
  private start: Point = { x: 0, y: 0 };
  private last: Point = { x: 0, y: 0 };
  private pinchDistance = 0;
  private pinchCenter: Point = { x: 0, y: 0 };

  constructor(
    /** Drag distance (screen pixels) after which a press becomes a pan. */
    private readonly panThreshold: number,
    /** Whether one-finger panning is possible right now (the board is zoomed). */
    private readonly canPan: () => boolean,
  ) {}

  get state(): Mode {
    return this.mode;
  }

  down(id: number, x: number, y: number): GestureEvent[] {
    this.pointers.set(id, { x, y });
    if (this.pointers.size === 1 && this.mode === 'idle') {
      this.mode = 'press';
      this.start = { x, y };
      this.last = { x, y };
      return [{ type: 'press', x, y }];
    }
    if (this.pointers.size === 2) {
      const events: GestureEvent[] = this.mode === 'press' ? [{ type: 'cancelPress' }] : [];
      this.mode = 'pinch';
      this.capturePinch();
      return events;
    }
    return [];
  }

  move(id: number, x: number, y: number): GestureEvent[] {
    if (!this.pointers.has(id)) return [];
    this.pointers.set(id, { x, y });
    switch (this.mode) {
      case 'press': {
        if (this.canPan() && Math.hypot(x - this.start.x, y - this.start.y) > this.panThreshold) {
          this.mode = 'pan';
          const events: GestureEvent[] = [{ type: 'cancelPress' }, { type: 'pan', dx: x - this.last.x, dy: y - this.last.y }];
          this.last = { x, y };
          return events;
        }
        this.last = { x, y };
        return [{ type: 'drag', x, y }];
      }
      case 'pan': {
        const event: GestureEvent = { type: 'pan', dx: x - this.last.x, dy: y - this.last.y };
        this.last = { x, y };
        return [event];
      }
      case 'pinch': {
        if (this.pointers.size < 2) return [];
        const [a, b] = [...this.pointers.values()];
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const events: GestureEvent[] = [
          { type: 'pan', dx: center.x - this.pinchCenter.x, dy: center.y - this.pinchCenter.y },
          { type: 'pinch', centerX: center.x, centerY: center.y, scale: distance / this.pinchDistance },
        ];
        this.pinchCenter = center;
        this.pinchDistance = distance;
        return events;
      }
      default:
        return [];
    }
  }

  up(id: number, x: number, y: number): GestureEvent[] {
    if (!this.pointers.delete(id)) return [];
    const events: GestureEvent[] = [];
    if (this.mode === 'press') events.push({ type: 'release', x, y });
    if (this.pointers.size === 0) this.mode = 'idle';
    else if (this.mode === 'pinch') this.mode = 'done'; // one finger left after a pinch: ignore it
    else if (this.mode === 'press') this.mode = 'done';
    return events;
  }

  /** Drops everything (pointer left the game, level changed, app backgrounded). */
  cancel(): GestureEvent[] {
    const events: GestureEvent[] = this.mode === 'press' ? [{ type: 'cancelPress' }] : [];
    this.pointers.clear();
    this.mode = 'idle';
    return events;
  }

  private capturePinch(): void {
    const [a, b] = [...this.pointers.values()];
    this.pinchCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinchDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  }
}
