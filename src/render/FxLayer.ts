import Phaser from 'phaser';
import { decorationScale } from './motion';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: number;
}

interface Ring {
  active: boolean;
  x: number;
  y: number;
  age: number;
  life: number;
  from: number;
  to: number;
  width: number;
  color: number;
}

const MAX_PARTICLES = 64;
const MAX_RINGS = 8;
/** Velocity kept per second (exponential drag), so sparks ease out instead of flying away. */
const DRAG_PER_SECOND = 0.04;

/**
 * Short-lived sparks and rings drawn on a single Graphics object.
 *
 * Everything comes from fixed-size pools, so effects never allocate during
 * play. The layer only redraws while something is alive; when idle it costs
 * nothing per frame.
 */
export class FxLayer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, color: 0,
  }));
  private readonly rings: Ring[] = Array.from({ length: MAX_RINGS }, () => ({
    active: false, x: 0, y: 0, age: 0, life: 1, from: 0, to: 0, width: 1, color: 0,
  }));
  private alive = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.graphics = scene.add.graphics().setDepth(depth);
  }

  /**
   * A cone of sparks around direction (dx, dy). `scale` is the cell size, so
   * effects look the same on every board size. The effects setting scales
   * the number of sparks (none with reduced motion or effects off).
   */
  burst(x: number, y: number, dx: number, dy: number, color: number, scale: number, count = 8, spread = 0.75): void {
    const amount = decorationScale();
    if (amount === 0) return;
    count = Math.max(1, Math.round(count * amount));
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((q) => !q.active);
      if (!p) return;
      const angle = base + (Math.random() - 0.5) * 2 * spread;
      const speed = scale * (3 + Math.random() * 5); // cells per second
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.age = 0;
      p.life = 220 + Math.random() * 180;
      p.size = scale * (0.035 + Math.random() * 0.04);
      p.color = color;
      this.alive++;
    }
  }

  /** An expanding, fading outline ring. */
  ring(x: number, y: number, color: number, scale: number, from = 0.15, to = 0.55, life = 280): void {
    if (decorationScale() === 0) return;
    const r = this.rings.find((q) => !q.active);
    if (!r) return;
    r.active = true;
    r.x = x;
    r.y = y;
    r.age = 0;
    r.life = life;
    r.from = from * scale;
    r.to = to * scale;
    r.width = Math.max(1, scale * 0.05);
    r.color = color;
    this.alive++;
  }

  /** Advances and redraws. Call from the scene's update(); returns immediately when idle. */
  update(deltaMs: number): void {
    if (this.alive === 0) return;
    const dt = Math.min(deltaMs, 50) / 1000; // clamp so a stalled frame doesn't teleport sparks
    const drag = Math.pow(DRAG_PER_SECOND, dt);
    const g = this.graphics.clear();

    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += deltaMs;
      if (p.age >= p.life) {
        p.active = false;
        this.alive--;
        continue;
      }
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.age / p.life;
      g.fillStyle(p.color, 1 - t * t);
      g.fillCircle(p.x, p.y, p.size * (1 - 0.5 * t));
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      r.age += deltaMs;
      if (r.age >= r.life) {
        r.active = false;
        this.alive--;
        continue;
      }
      const t = r.age / r.life;
      const eased = 1 - (1 - t) * (1 - t);
      g.lineStyle(r.width * (1 - 0.5 * t), r.color, 0.8 * (1 - t));
      g.strokeCircle(r.x, r.y, r.from + (r.to - r.from) * eased);
    }

    if (this.alive === 0) g.clear();
  }

  /** Drops every effect at once (restart, level change, resize). */
  clear(): void {
    this.particles.forEach((p) => (p.active = false));
    this.rings.forEach((r) => (r.active = false));
    this.alive = 0;
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
