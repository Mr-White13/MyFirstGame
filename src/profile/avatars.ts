/*
 * Original avatars for NEON ESCAPE, drawn as small inline SVGs (64×64) in the
 * game's palette. No external images or third-party artwork.
 *
 * The markup below is static and authored here, so inserting it with
 * innerHTML is safe; player input never ends up in these strings.
 */

const C = { cyan: '#27DDF5', purple: '#A855F7', orange: '#FF9F43', green: '#48F5A5', red: '#FF526B', text: '#F4F7FC' };
const stroke = (color: string, width = 3) =>
  `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

interface AvatarDef {
  readonly id: string;
  readonly name: string;
  /** Ring colour around the portrait. */
  readonly accent: string;
  /** Inner artwork, drawn on a 64×64 canvas. */
  readonly art: string;
}

const DEFS = [
  {
    id: 'bot',
    name: 'Neon Bot',
    accent: C.cyan,
    art: `<path d="M32 19v-6" ${stroke(C.cyan)}/><circle cx="32" cy="11" r="3" fill="${C.purple}"/>
      <rect x="16" y="19" width="32" height="26" rx="8" ${stroke(C.cyan)}/>
      <circle cx="25" cy="30" r="3.5" fill="${C.cyan}"/><circle cx="39" cy="30" r="3.5" fill="${C.cyan}"/>
      <path d="M25 38h14" ${stroke(C.purple)}/><path d="M12 28v8M52 28v8" ${stroke(C.cyan)}/>
      <path d="M24 45v5h16v-5" ${stroke(C.cyan, 2.5)}/>`,
  },
  {
    id: 'fox',
    name: 'Cyber Fox',
    accent: C.orange,
    art: `<path d="M14 15l11 12 7-2 7 2 11-12-2 20-16 15-16-15z" ${stroke(C.orange)}/>
      <path d="M22 34l6 2M42 34l-6 2" ${stroke(C.cyan)}/><circle cx="32" cy="43" r="2.2" fill="${C.orange}"/>
      <path d="M19 22l4 4M45 22l-4 4" ${stroke(C.orange, 2)}/>`,
  },
  {
    id: 'astro',
    name: 'Star Walker',
    accent: C.text,
    art: `<circle cx="32" cy="29" r="17" ${stroke(C.text)}/>
      <rect x="20" y="22" width="24" height="14" rx="7" fill="${C.cyan}" opacity="0.85"/>
      <path d="M25 26l4-1" ${stroke(C.text, 2)}/><path d="M17 50c3-4 9-5 15-5s12 1 15 5" ${stroke(C.text)}/>
      <circle cx="46" cy="14" r="1.5" fill="${C.purple}"/><circle cx="14" cy="18" r="1.2" fill="${C.cyan}"/>`,
  },
  {
    id: 'orb',
    name: 'Energy Orb',
    accent: C.purple,
    art: `<circle cx="32" cy="32" r="9" fill="${C.purple}"/><circle cx="32" cy="32" r="15" ${stroke(C.purple, 2)}/>
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(-25 32 32)" ${stroke(C.cyan, 2.5)}/>
      <circle cx="51" cy="24" r="2.5" fill="${C.cyan}"/><circle cx="29" cy="29" r="2.5" fill="${C.text}" opacity="0.8"/>`,
  },
  {
    id: 'visor',
    name: 'Grid Runner',
    accent: C.cyan,
    art: `<path d="M14 36c0-13 8-22 18-22s18 9 18 22v6H14z" ${stroke(C.cyan)}/>
      <path d="M18 31h28" ${stroke(C.cyan)}/><path d="M20 31h24v6H20z" fill="${C.orange}" opacity="0.9"/>
      <path d="M32 14v8" ${stroke(C.purple, 2.5)}/><path d="M18 48h28" ${stroke(C.cyan)}/>`,
  },
  {
    id: 'cat',
    name: 'Holo Cat',
    accent: C.purple,
    art: `<path d="M16 22l4-9 8 7h8l8-7 4 9v12c0 9-7 15-16 15s-16-6-16-15z" ${stroke(C.purple)}/>
      <path d="M24 33c1.5-2 4-2 5.5 0M34.5 33c1.5-2 4-2 5.5 0" ${stroke(C.cyan, 2.5)}/>
      <path d="M30 40l2 2 2-2" ${stroke(C.text, 2)}/><path d="M10 38l9 1M10 43l9-1M54 38l-9 1M54 43l-9-1" ${stroke(C.purple, 1.6)}/>`,
  },
  {
    id: 'dragon',
    name: 'Cyber Wyrm',
    accent: C.green,
    art: `<path d="M14 40l8-16 10-6 14 2 6 8-8 2 4 8-14 8z" ${stroke(C.green)}/>
      <path d="M22 24l-4-10 10 6M32 18l2-9 5 10" ${stroke(C.green, 2.5)}/>
      <circle cx="38" cy="27" r="2.6" fill="${C.orange}"/><path d="M34 42l6-2" ${stroke(C.cyan, 2)}/>`,
  },
  {
    id: 'core',
    name: 'AI Core',
    accent: C.cyan,
    art: `<path d="M32 12l17 10v20L32 52 15 42V22z" ${stroke(C.cyan)}/>
      <circle cx="32" cy="32" r="6" fill="${C.cyan}"/>
      <path d="M32 18v8M32 38v8M20 25l7 4M44 25l-7 4M20 39l7-4M44 39l-7-4" ${stroke(C.purple, 2)}/>`,
  },
  {
    id: 'glitch',
    name: 'Glitch',
    accent: C.red,
    art: `<path d="M18 46V28a14 14 0 0 1 28 0v18l-5-4-4 4-5-4-5 4-4-4z" ${stroke(C.red)}/>
      <rect x="23" y="27" width="5" height="6" fill="${C.cyan}"/><rect x="36" y="27" width="5" height="6" fill="${C.cyan}"/>
      <path d="M12 22h6M46 18h7M10 34h5" ${stroke(C.purple, 2)}/>`,
  },
  {
    id: 'arrow',
    name: 'Escape Artist',
    accent: C.green,
    art: `<path d="M16 46V28h22" ${stroke(C.cyan, 5)}/><path d="M34 18l12 10-12 10z" fill="${C.cyan}"/>
      <circle cx="16" cy="46" r="2" fill="#131A29"/><path d="M42 44h8M46 40v8" ${stroke(C.green, 2.5)}/>`,
  },
] as const satisfies readonly AvatarDef[];

export type AvatarId = (typeof DEFS)[number]['id'];

export const AVATARS: readonly { readonly id: AvatarId; readonly name: string }[] = DEFS.map(({ id, name }) => ({ id, name }));

export const DEFAULT_AVATAR: AvatarId = 'bot';

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && DEFS.some((d) => d.id === value);
}

/** Complete SVG markup for an avatar, framed in a ring of its accent colour. */
export function avatarSvg(id: AvatarId): string {
  const def = DEFS.find((d) => d.id === id) ?? DEFS[0];
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="30" fill="#171F30"/>
    <circle cx="32" cy="32" r="30" fill="none" stroke="${def.accent}" stroke-opacity="0.55" stroke-width="2"/>
    ${def.art}
  </svg>`;
}

export function avatarName(id: AvatarId): string {
  return (DEFS.find((d) => d.id === id) ?? DEFS[0]).name;
}
