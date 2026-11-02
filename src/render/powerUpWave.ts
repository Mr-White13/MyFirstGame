import type { ArrowData } from '../core/types';

/**
 * Timing of the very hard levels' intro: a wave spreads out from the centre
 * of the grid and powers up each arrow as it reaches it (see
 * ArrowView.playPowerUp). Pure: no Phaser, so it can be tested on its own.
 */

/** The wave starts once the screen transition (TRANSITION_MS) is over. */
export const WAVE_START_MS = 240;
/** Time for the wave to travel from the centre to the farthest arrow. */
export const WAVE_SPREAD_MS = 720;
/** How long one arrow takes to go from dimmed to fully lit. */
export const POWER_UP_MS = 300;

export interface PowerUpWave {
  /** When each arrow (same order as the input) starts powering up, in ms. */
  readonly delays: number[];
  /** Distance in cells from the grid centre to the farthest arrow: how far the wave front travels. */
  readonly reach: number;
}

/**
 * Each arrow starts when the wave front reaches the centre of its cells. The
 * front slows as it spreads, like the effects ring drawn for it (FxLayer.ring
 * eases out: r = 1 - (1 - t)²), and reaches the farthest arrow after exactly
 * WAVE_SPREAD_MS whatever the board size.
 */
export function powerUpWave(arrows: readonly ArrowData[], rows: number, cols: number): PowerUpWave {
  const centreRow = (rows - 1) / 2;
  const centreCol = (cols - 1) / 2;
  const distances = arrows.map((a) => {
    const row = a.cells.reduce((sum, c) => sum + c.row, 0) / a.cells.length;
    const col = a.cells.reduce((sum, c) => sum + c.col, 0) / a.cells.length;
    return Math.hypot(row - centreRow, col - centreCol);
  });
  const reach = Math.max(0, ...distances);
  return {
    delays: distances.map((d) => WAVE_START_MS + (reach === 0 ? 0 : (1 - Math.sqrt(1 - d / reach)) * WAVE_SPREAD_MS)),
    reach,
  };
}
