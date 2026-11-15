import game from './game';
import home from './home';
import html from './html';
import league from './league';
import profile from './profile';
import recap from './recap';
import rewards from './rewards';
import settings from './settings';

/**
 * Every area's messages. An area's English table is the source text; its
 * keys are written `area.key` (for example `t('home.play')`).
 *
 * html     static text in index.html (applied through data-i18n attributes)
 * home     Home screen, journey map, level select, chapters
 * game     HUD, boosters, level dialogs, toasts, tips, difficulty
 * settings Settings screen, quick settings, theme picker
 * recap    startup splash and player recap / insights
 * profile  profile, records, avatars, frames, countries, statistics
 * rewards  achievements, daily rewards, shop, credits, rewarded ads
 * league   Daily League screens, tiers and challenges
 */
export const MESSAGES = { game, home, html, league, profile, recap, rewards, settings } as const;

export type Area = keyof typeof MESSAGES;

/** Every valid message key, checked by the compiler: `t('home.nope')` does not build. */
export type MessageKey = { [A in Area]: `${A}.${Extract<keyof (typeof MESSAGES)[A]['en'], string>}` }[Area];
