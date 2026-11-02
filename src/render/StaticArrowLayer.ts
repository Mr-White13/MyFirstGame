import type Phaser from 'phaser';
import type { ArrowView } from './ArrowView';
import type { BoardLayout } from './layout';

/**
 * The cache is drawn at this multiple of the screen resolution and filtered
 * down when shown: drawing into a texture gets no multisampling, so this
 * supersampling is what gives resting arrows smooth edges (2 = 4 samples per
 * pixel, like the canvas's own 4× MSAA for moving arrows).
 */
const SUPERSAMPLE = 2;
/** Highest resolution multiplier for the cache (supersampling times zoom, up to this; then a little soft). */
const MAX_CACHE_SCALE = 3;
/** Longest side of the cache texture, in pixels (memory and GPU limits on phones). */
const MAX_CACHE_SIDE = 2048;
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
 * crisp when zoomed in (up to MAX_CACHE_SCALE). Rules, hit testing and exit
 * paths don't depend on any of this.
 */
export class StaticArrowLayer {
  private texture?: Phaser.GameObjects.RenderTexture;
  private readonly cached = new Set<ArrowView>();
  private dirty = true;
  private origin = { x: 0, y: 0 };
  private size = { width: 1, height: 1 };
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
    this.origin = { x: layout.x - margin, y: layout.y - margin };
    this.size = { width: layout.width + 2 * margin, height: layout.height + 2 * margin };
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
    const zoomSettled = this.wantedScale !== this.scale && now - this.zoomChangedAt >= ZOOM_SETTLE_MS;
    let changed = this.dirty || zoomSettled;
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
    if (changed) this.rebuild(views.values());
  }

  /** Shows every arrow as live Graphics again and forgets the cache (level change, shutdown). */
  clear(): void {
    this.cached.forEach((view) => view.graphics.setVisible(true));
    this.cached.clear();
    this.texture?.destroy();
    this.texture = undefined;
    this.dirty = true;
  }

  private rebuild(views: Iterable<ArrowView>): void {
    this.dirty = false;
    this.scale = this.wantedScale;
    const scale = Math.min(this.scale, MAX_CACHE_SIDE / Math.max(this.size.width, this.size.height));
    const width = Math.max(1, Math.ceil(this.size.width * scale));
    const height = Math.max(1, Math.ceil(this.size.height * scale));
    if (!this.texture || this.texture.width !== width || this.texture.height !== height) {
      this.texture?.destroy();
      try {
        this.texture = this.scene.add.renderTexture(this.origin.x, this.origin.y, width, height).setOrigin(0, 0);
      } catch {
        // No render textures here: fall back to live Graphics for every arrow.
        this.enabled = false;
        this.clear();
        return;
      }
      this.parent.addAt(this.texture, 0); // behind every live arrow
    }
    this.texture.setPosition(this.origin.x, this.origin.y).setScale(1 / scale);
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
      this.texture.batchDraw(g, -this.origin.x * scale, -this.origin.y * scale);
      g.setScale(1);
      g.setVisible(false);
      this.cached.add(view);
    }
    this.texture.endDraw();
  }
}
