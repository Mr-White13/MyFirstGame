/**
 * League tiers and every balancing number of the offline league, in one
 * place. Thresholds are **personal daily targets**: they compare the
 * player's own score with fixed numbers, never with other players (there
 * are none yet).
 */

export type LeagueId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'neon-elite';

export interface LeagueTier {
  readonly id: LeagueId;
  readonly name: string;
  /** 0 = Bronze … 5 = Neon Elite. */
  readonly order: number;
  /** Badge colours (art, the same in every theme). */
  readonly color: string;
  readonly accent: string;
  /** Promote with a daily score at or above this; null at the top. */
  readonly promoteAt: number | null;
  /** Relegate with a participating score below this; null at the bottom. */
  readonly relegateBelow: number | null;
}

export const LEAGUES: readonly LeagueTier[] = [
  { id: 'bronze', name: 'Bronze', order: 0, color: '#d98f52', accent: '#ffc58f', promoteAt: 5, relegateBelow: null },
  { id: 'silver', name: 'Silver', order: 1, color: '#aab8c9', accent: '#eef3fa', promoteAt: 7, relegateBelow: 2 },
  { id: 'gold', name: 'Gold', order: 2, color: '#f2b51d', accent: '#ffe58a', promoteAt: 9, relegateBelow: 3 },
  { id: 'platinum', name: 'Platinum', order: 3, color: '#45d6c4', accent: '#c4fff5', promoteAt: 10, relegateBelow: 4 },
  { id: 'diamond', name: 'Diamond', order: 4, color: '#5c9dff', accent: '#cfe2ff', promoteAt: 11, relegateBelow: 5 },
  { id: 'neon-elite', name: 'Neon Elite', order: 5, color: '#a855f7', accent: '#27ddf5', promoteAt: null, relegateBelow: 6 },
];

export const BRONZE = 0;
export const TOP_TIER = LEAGUES.length - 1;

export function league(order: number): LeagueTier {
  return LEAGUES[Math.min(TOP_TIER, Math.max(BRONZE, Math.round(order) || 0))];
}

/**
 * Inactive days (no Energy Point earned) right after an active day that are
 * forgiven. Each consecutive inactive day after these relegates one tier.
 */
export const PROTECTED_INACTIVE_DAYS = 1;

/** Energy Credits for league milestones. Each id is paid once ever (or once per date). */
export const LEAGUE_REWARDS = {
  /** The very first promotion. */
  firstPromotion: 25,
  /** First time reaching each league; dropping and climbing back never pays again. */
  newHighest: { silver: 20, gold: 30, platinum: 40, diamond: 50, 'neon-elite': 75 } as Readonly<Partial<Record<LeagueId, number>>>,
  /** All three challenges of a day completed (once per date). */
  dailySweep: 15,
} as const;

export const leagueTransactionIds = {
  firstPromotion: 'league:first-promotion',
  newHighest: (id: LeagueId) => `league:highest:${id}`,
  // The `daily:` prefix lets the wallet trim these like daily claims; the league also records each sweep itself.
  dailySweep: (day: string) => `daily:league-sweep:${day}`,
};

/** Original vector badge: a hexagonal crest in the tier's colours with one chevron per tier above Bronze. */
export function leagueBadgeSvg(order: number, size = 64): string {
  const t = league(order);
  const id = `lg-${t.id}-${size}`;
  const chevrons = Array.from({ length: t.order }, (_, i) => {
    const y = 40 - i * 5.2;
    return `<path d="M22 ${y}l10-5.5 10 5.5" fill="none" stroke="${t.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`;
  }).join('');
  const core =
    t.order === 0
      ? `<circle cx="32" cy="30" r="6.5" fill="none" stroke="${t.accent}" stroke-width="2.6"/>`
      : t.order === TOP_TIER
        ? `<path d="M33.5 17l-7.5 11h6l-1.5 9 7.5-11h-6z" fill="${t.accent}"/>`
        : '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.55"/><stop offset="0.55" stop-color="${t.color}"/><stop offset="1" stop-color="${t.color}" stop-opacity="0.75"/></linearGradient></defs>
    <path d="M32 4l24 13.5v29L32 60 8 46.5v-29z" fill="#0d1220" stroke="url(#${id})" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M32 11l18 10.2v21.6L32 53 14 42.8V21.2z" fill="url(#${id})" opacity="0.28"/>
    ${core}${t.order > 0 && t.order < TOP_TIER ? chevrons : ''}
  </svg>`;
}
