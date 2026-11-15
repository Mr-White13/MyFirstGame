import { readSettings, SETTINGS_KEY } from '../settings/Settings';
import { translateDom } from './dom';
import { localeTag, resolveLocale } from './locale';
import { setLocale, t } from './translate';

/**
 * Picks the language before anything else runs. main.ts imports this module
 * first, so every screen, and any text built while modules load, is already
 * in the right language. Reads the saved setting the same safe way the
 * settings store does (never throws), and the device's languages.
 */
export function deviceLanguages(): readonly string[] {
  try {
    return navigator.languages?.length ? navigator.languages : [navigator.language];
  } catch {
    return [];
  }
}

function savedSettingsRaw(): string | null {
  try {
    return localStorage.getItem(SETTINGS_KEY);
  } catch {
    return null;
  }
}

const locale = resolveLocale(readSettings(savedSettingsRaw()).value.language, deviceLanguages());
setLocale(locale);
document.documentElement.lang = localeTag(locale).slice(0, 2);
// index.html is written in English; only other languages need its static text replaced.
if (locale !== 'en') translateDom(document, t);
