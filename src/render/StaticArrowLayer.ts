import type Phaser from 'phaser';
import type { ArrowView } from './ArrowView';
import type { BoardLayout, Rect } from './layout';

/**
 * The cache is drawn at this multiple of the screen resolution and filtered
 * down when shown: drawing into a texture gets no multisampling, so this
 * supersampling is what gives resting arrows smooth edges (2 = 4 samples per
 * pixel, like the canvas's own 4× MSAA for moving arrows).
 */
const SUPERSAMPLE = 2;
/** Highest resolution multiplier for the cache: supersampling at every zoom up to 4×. */
const MAX_CACHE_SCALE = SUPERSAMPLE * 4;
/** Longest side of the cache texture for the whole board, in pixels (memory and GPU limits on phones). */
const MAX_CACHE_SIDE = 2048;
/**
 * Longest side of the cache texture while zoomed in. It then covers only the
 * visible part of the board (plus VIEW_MARGIN), so it can be much sharper
 * than a whole-board texture of the same size.
 */
const MAX_ZOOMED_SIDE = 3072;
/** While zoomed, the cache reaches this share of the visible size past each side, so panning rarely needs a rebuild. */
const VIEW_MARGIN = 0.25;
/** Wait this long after the zoom stops changing before re-rendering the cache at the new resolution. */
const ZOOM_SETTLE_MS = 150;

/**
 * Resting arrows, cached in one texture.
 *
 * Phaser re-tessellates every Graphics object on every frame, so 40 resting
 * arrows cost far more than the one arrow that is actually moving. This
 * layer draws all resting ("static", see ArrowView.isStatic) arrows into a
 * single render texture and hides their Graphics; the board then costs one
 * textured quad per frame. Arrows that move, flash, are pressed or tweened
 * stay live vector Graphics on top.
 *
 * The cache is rebuilt only when the set of resting arrows changes, when a
 * resting arrow is redrawn (theme, red state), when the board layout changes
 * and, after the zoom settles, at the new zoom's resolution, so arrows stay
 * crisp when zoomed in (up to MAX_CACHE_SCALE). While zoomed, it covers only
 * the visible part of the board plus a margin (see setView): a whole large
 * board at zoom resolution would not fit a phone texture, and would look
 * pixelated. Panning out of the cached part rebuilds it at once, before the
 * frame is drawn, so no arrow is ever missing. Rules, hit testing and exit
 * paths don't depend on any of this.
 */
export class StaticArrowLayer {
  private texture?: Phaser.GameObjects.RenderTexture;
  private readonly cached = new Set<ArrowView>();
  private dirty = true;
  /** The whole board plus a margin for heads and glow (world pixels). */
  private full: Rect = { x: 0, y: 0, width: 1, height: 1 };
  /** The part of the board the current texture covers (world pixels). */
  private region: Rect = { x: 0, y: 0, width: 1, height: 1 };
  /** Whether the texture covers only the visible part (zoomed), not the whole board. */
  private regionIsView = false;
  /** The part of the board on screen while zoomed in (world pixels), or undefined when not zoomed. */
  private visible?: Rect;
  /** Resolution of the current texture, and the one wanted for the current zoom. */
  private scale = SUPERSAMPLE;
  private wantedScale = SUPERSAMPLE;
  private zoomChangedAt = 0;
  private enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly parent: Phaser.GameObjects.Container,
  ) {}

  /** The board moved or changed size: the cache covers the board plus a margin for heads and glow. */
  setLayout(layout: BoardLayout): void {
    const margin = layout.cellSize;
    this.full = { x: layout.x - margin, y: layout.y - margin, width: layout.width + 2 * margin, height: layout.height + 2 * margin };
    this.region = this.full;
    this.regionIsView = false;
    this.texture?.destroy();
    this.texture = undefined;
    this.dirty = true;
  }

  /** The camera zoom changed; the cache follows once it settles. */
  setZoom(zoom: number): void {
    const wanted = Math.min(MAX_CACHE_SCALE, SUPERSAMPLE * Math.max(1, zoom));
    if (Math.abs(wanted - this.wantedScale) < 0.01) return;
    this.wantedScale = wanted;
    this.zoomChangedAt = this.scene.time.now;
  }

  /** The visible part of the board while zoomed in (world pixels), or undefined when not zoomed. */
  setView(visible: Rect | undefined): void {
    this.visible = visible;
  }

  /** A resting arrow looks different now (theme, red state): rebuild on the next frame. */
  invalidate(): void {
    this.dirty = true;
  }

  /**
   * Called every frame: a cheap membership check, and a rebuild only when
   * something changed. `views` are the arrows on the board.
   */
  update(views: ReadonlyMap<string, ArrowView>, now: number): void {
    if (!this.enabled) return;
    const settled = now - this.zoomChangedAt >= ZOOM_SETTLE_MS;
    const zoomSettled = settled && (this.wantedScale !== this.scale || this.wantsViewRegion() !== this.regionIsView);
    // What must be on screen is always in the texture: panning out of a zoomed region rebuilds now.
    let changed = this.dirty || zoomSettled || !contains(this.region, this.needed());
    // Cached arrows still on the board. Fewer than cached means one has left the
    // list (its exit started) and must be shown live. Live arrows are not counted:
    // they are not in the cache, so counting them would rebuild on every frame
    // while one is pressed, flashing or tweening.
    let stillCached = 0;
    for (const view of views.values()) {
      const isCached = this.cached.has(view);
      if (isCached) stillCached++;
      if (!changed && view.isStatic !== isCached) changed = true;
    }
    if (!changed && stillCached !== this.cached.size) changed = true;
    if (changed) this.rebuild(views.values(), settled);
  }

  /** Shows every arrow as live Graphics again and forgets the cache (level change, shutdown). */
  clear(): void {
    this.cached.forEach((view) => view.graphics.setVisible(true));
    this.cached.clear();
    this.texture?.destroy();
    this.texture = undefined;
    this.dirty = true;
  }

  /** Zoomed in enough that a whole-board texture would be soft: cache only the visible part. */
  private wantsViewRegion(): boolean {
    return this.visible !== undefined && this.wantedScale > SUPERSAMPLE;
  }

  /** The part of the board that is on screen now (the whole board when not zoomed). */
  private needed(): Rect {
    return this.visible ? intersect(this.visible, this.full) : this.full;
  }

  private rebuild(views: Iterable<ArrowView>, settled: boolean): void {
    this.dirty = false;
    this.scale = this.wantedScale;
    // Mid-pinch the whole board is cached (no rebuild every frame); once the zoom settles, only the visible part.
    this.regionIsView = settled && this.wantsViewRegion();
    if (this.regionIsView) {
      const v = this.visible!;
      const mx = v.width * VIEW_MARGIN;
      const my = v.height * VIEW_MARGIN;
      this.region = intersect({ x: v.x - mx, y: v.y - my, width: v.width + 2 * mx, height: v.height + 2 * my }, this.full);
    } else this.region = this.full;
    const r = this.region;
    const maxSide = this.regionIsView ? MAX_ZOOMED_SIDE : MAX_CACHE_SIDE;
    const scale = Math.min(this.scale, maxSide / Math.max(r.width, r.height));
    const width = Math.max(1, Math.ceil(r.width * scale));
    const height = Math.max(1, Math.ceil(r.height * scale));
    if (!this.texture || this.texture.width !== width || this.texture.height !== height) {
      this.texture?.destroy();
      try {
        this.texture = this.scene.add.renderTexture(r.x, r.y, width, height).setOrigin(0, 0);
      } catch {
        // No render textures here: fall back to live Graphics for every arrow.
        this.enabled = false;
        this.clear();
        return;
      }
      this.parent.addAt(this.texture, 0); // behind every live arrow
    }
    this.texture.setPosition(r.x, r.y).setScale(1 / scale);
    this.texture.clear();
    // Everything drawn from the old cache becomes live first, including arrows that
    // have just left the board's list to start their exit (chain or bonus releases,
    // which were never pressed): otherwise they would fly off invisibly.
    this.cached.forEach((view) => view.graphics.setVisible(true));
    this.cached.clear();
    this.texture.beginDraw();
    for (const view of views) {
      const g = view.graphics;
      if (!view.isStatic) {
        g.setVisible(true);
        continue;
      }
      g.setVisible(true).setScale(scale);
      this.texture.batchDraw(g, -r.x * scale, -r.y * scale);
      g.setScale(1);
      g.setVisible(false);
      this.cached.add(view);
    }
    this.texture.endDraw();
  }
}

/** The overlap of two rectangles (empty, with zero size, if they don't overlap). */
function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
}

/** True if `inner` lies inside `outer` (a pixel of slack for rounding). */
function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
}
