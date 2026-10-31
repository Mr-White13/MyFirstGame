/** Frames slower than this count as dropped (a 60 Hz frame is 16.7 ms). */
const SLOW_FRAME_MS = 20;

/** Frame statistics over the last reporting window (pure, for tests). */
export class FrameStats {
  private intervals: number[] = [];
  private work: number[] = [];

  /** `interval`: time since the previous frame; `work`: CPU time spent on this frame (update + render). */
  add(interval: number, work: number): void {
    this.intervals.push(interval);
    this.work.push(work);
  }

  /** Average and worst frame interval, share of slow frames and average CPU work; then starts a new window. */
  take(): { avg: number; worst: number; slowShare: number; work: number; frames: number } | null {
    const n = this.intervals.length;
    if (n === 0) return null;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const result = {
      avg: sum(this.intervals) / n,
      worst: Math.max(...this.intervals),
      slowShare: this.intervals.filter((t) => t > SLOW_FRAME_MS).length / n,
      work: sum(this.work) / n,
      frames: n,
    };
    this.intervals = [];
    this.work = [];
    return result;
  }
}
