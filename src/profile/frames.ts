/*
 * Avatar frames (Shop cosmetics), drawn as SVG on the avatar's 64×64 canvas,
 * on top of its outer ring. Original, code-drawn art in the game's palette,
 * like the avatars. Fixed colours (as the avatars): each frame sits on the
 * avatar's own dark disc, so it reads the same in every theme.
 *
 * No gradients or filters, so no element ids that could clash when the same
 * frame is shown several times on a page, and nothing costly to draw. Any
 * motion is a slow CSS animation on one group (see `.avatar-frame` in
 * style.css), switched off with reduced motion or effects off.
 */
import type { CosmeticId } from '../shop/catalog';

const F = { cyan: '#27DDF5', purple: '#A855F7', pink: '#FF5C8A', gold: '#FFD23F', white: '#F4F7FC', orange: '#FF9F43', red: '#FF526B' };

/** Points `count` evenly spaced around the centre at `radius`, starting at the top. */
function around(count: number, radius: number, offset = 0): { x: number; y: number; angle: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = offset + (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: 32 + Math.cos(angle) * radius, y: 32 + Math.sin(angle) * radius, angle };
  });
}

const n = (v: number) => v.toFixed(2);

function cyber(): string {
  const ticks = around(4, 0)
    .map(({ angle }) => {
      const [c, s] = [Math.cos(angle), Math.sin(angle)];
      return `<path d="M${n(32 + c * 29)} ${n(32 + s * 29)}L${n(32 + c * 34)} ${n(32 + s * 34)}"/>`;
    })
    .join('');
  const nodes = around(4, 30.5, Math.PI / 4)
    .map(({ x, y }) => `<rect x="${n(x - 2.4)}" y="${n(y - 2.4)}" width="4.8" height="4.8" rx="1" fill="${F.cyan}"/>`)
    .join('');
  return `<circle cx="32" cy="32" r="30.5" fill="none" stroke="${F.cyan}" stroke-width="2.6"/>
    <circle cx="32" cy="32" r="27.4" fill="none" stroke="${F.cyan}" stroke-opacity="0.5" stroke-width="1"/>
    <g stroke="${F.cyan}" stroke-width="2.4" stroke-linecap="round">${ticks}</g>${nodes}`;
}

function plasma(): string {
  return `<circle cx="32" cy="32" r="30.5" fill="none" stroke="${F.purple}" stroke-opacity="0.3" stroke-width="6"/>
    <circle cx="32" cy="32" r="30.5" fill="none" stroke="${F.purple}" stroke-width="2.6"/>
    <g class="avatar-frame__spin">
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="${F.pink}" stroke-width="3" stroke-linecap="round" stroke-dasharray="11 13"/>
    </g>`;
}

function elite(): string {
  const studs = around(8, 30.5)
    .slice(1) // the crown takes the top
    .map(({ x, y }) => `<path d="M${n(x)} ${n(y - 3)}L${n(x + 3)} ${n(y)}L${n(x)} ${n(y + 3)}L${n(x - 3)} ${n(y)}Z" fill="${F.gold}" stroke="#171F30" stroke-width="0.8"/>`)
    .join('');
  return `<circle cx="32" cy="32" r="30.5" fill="none" stroke="${F.gold}" stroke-width="3"/>
    <circle cx="32" cy="32" r="27.3" fill="none" stroke="${F.white}" stroke-opacity="0.55" stroke-width="0.9"/>
    ${studs}
    <path d="M24 4.5L26 -2.5L29.3 1.8L32 -4L34.7 1.8L38 -2.5L40 4.5Z" fill="${F.gold}" stroke="#171F30" stroke-width="0.9" stroke-linejoin="round"/>`;
}

function inferno(): string {
  const flames = around(12, 0)
    .map(({ angle }, i) => {
      const at = (r: number, da = 0) => `${n(32 + Math.cos(angle + da) * r)} ${n(32 + Math.sin(angle + da) * r)}`;
      const tip = i % 2 === 0 ? 36.5 : 34.5;
      return `<path d="M${at(29.5, -0.2)}Q${at(33.5, -0.16)} ${at(tip)}Q${at(33.5, 0.16)} ${at(29.5, 0.2)}Z" fill="${i % 2 === 0 ? F.orange : F.gold}"/>`;
    })
    .join('');
  return `<g class="avatar-frame__flicker">${flames}</g>
    <circle cx="32" cy="32" r="30.2" fill="none" stroke="${F.red}" stroke-width="3"/>
    <circle cx="32" cy="32" r="27.5" fill="none" stroke="${F.orange}" stroke-opacity="0.55" stroke-width="1"/>`;
}

const FRAME_ART: Readonly<Record<CosmeticId, () => string>> = {
  'frame-cyber': cyber,
  'frame-plasma': plasma,
  'frame-elite': elite,
  'frame-inferno': inferno,
};

/** The frame's SVG elements, drawn over an avatar (see avatarSvg). Static, trusted markup. */
export function frameMarkup(frame: CosmeticId): string {
  const art = FRAME_ART[frame];
  return art ? `<g class="avatar-frame avatar-frame--${frame.replace('frame-', '')}">${art()}</g>` : '';
}
