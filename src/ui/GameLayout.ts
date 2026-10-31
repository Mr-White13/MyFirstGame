import { fitBoardSlot } from '../render/boardFit';
import { LANDSCAPE_QUERY } from './dom';

/**
 * Sizes the board slot in the space the HUD leaves.
 *
 * In portrait the HUD sits at the top and the board gets all the height
 * below it: tall grids grow to fill it, square ones take the full width. In
 * landscape it takes the height left of the HUD column. The board keeps its true aspect (rows × cols plus padding),
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

    const { width, height } = fitBoardSlot(availableWidth, availableHeight, this.rows, this.cols);
    if (width === this.width && height === this.height) return;

    this.width = width;
    this.height = height;
    this.slot.style.width = `${width}px`;
    this.slot.style.height = `${height}px`;
    this.ui.style.setProperty('--board-width', `${width}px`);
    this.onChange();
  }
}
