import { PADDING_IN_CELLS } from '../render/layout';
import { LANDSCAPE_QUERY } from './dom';

/** Boards never grow beyond this on large screens (CSS px); they'd just look stretched. */
const MAX_BOARD = 620;

/**
 * Sizes the board slot so the HUD and board form one compact, centred group.
 *
 * In portrait the board takes the full content width unless that would push
 * the group past the screen height; in landscape it takes the height left of
 * the HUD column. The board keeps its true aspect (rows × cols plus padding),
 * so 7×7, 8×8 and 9×9 all fit without stretching. The slot's size is also
 * published as `--board-width` so the HUD can line up with the board's edges.
 */
export class GameLayout {
  private rows = 7;
  private cols = 7;
  private width = 0;
  private height = 0;
  private readonly landscape = window.matchMedia(LANDSCAPE_QUERY);

  constructor(
    private readonly ui: HTMLElement,
    private readonly hud: HTMLElement,
    private readonly slot: HTMLElement,
    private readonly onChange: () => void,
  ) {
    const observer = new ResizeObserver(() => this.update());
    observer.observe(ui);
    observer.observe(hud);
    this.landscape.addEventListener('change', () => this.update());
  }

  setGrid(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    this.update();
  }

  update(): void {
    const style = getComputedStyle(this.ui);
    const px = (value: string) => parseFloat(value) || 0;
    const innerWidth = this.ui.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
    const innerHeight = this.ui.clientHeight - px(style.paddingTop) - px(style.paddingBottom);
    if (innerWidth <= 0 || innerHeight <= 0) return;

    const sideways = this.landscape.matches;
    const availableWidth = sideways ? innerWidth - this.hud.offsetWidth - px(style.columnGap) : innerWidth;
    const availableHeight = sideways ? innerHeight : innerHeight - this.hud.offsetHeight - px(style.rowGap);

    const aspect = (this.cols + 2 * PADDING_IN_CELLS) / (this.rows + 2 * PADDING_IN_CELLS);
    const width = Math.floor(Math.max(120, Math.min(availableWidth, availableHeight * aspect, MAX_BOARD)));
    const height = Math.floor(width / aspect);
    if (width === this.width && height === this.height) return;

    this.width = width;
    this.height = height;
    this.slot.style.width = `${width}px`;
    this.slot.style.height = `${height}px`;
    this.ui.style.setProperty('--board-width', `${width}px`);
    this.onChange();
  }
}
