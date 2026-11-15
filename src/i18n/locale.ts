/** The languages the game is translated into. English is the source language and the fallback. */
export type Locale = 'en' | 'es' | 'ro';
export const LOCALES: readonly Locale[] = ['en', 'es', 'ro'];

/** The Settings choice: `auto` follows the device language (English when it isn't one of ours). */
export type LanguageChoice = 'auto' | Locale;
export const LANGUAGE_CHOICES: readonly LanguageChoice[] = ['auto', 'en', 'es', 'ro'];

/** Each language's name in that language, as the Settings picker shows it. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', es: 'Español', ro: 'Română' };

/** BCP 47 tags for number and date formatting, and for `<html lang>`. */
const TAGS: Readonly<Record<Locale, string>> = { en: 'en-US', es: 'es-ES', ro: 'ro-RO' };

export function localeTag(locale: Locale): string {
  return TAGS[locale];
}

/**
 * The language to use: an explicit choice wins; `auto` takes the first
 * device language we have (by its primary subtag, so `es-MX` → Spanish,
 * `ro-MD` → Romanian), else English.
 */
export function resolveLocale(choice: LanguageChoice, preferred: readonly string[]): Locale {
  if (choice !== 'auto') return choice;
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split(/[-_]/)[0];
    if ((LOCALES as readonly string[]).includes(primary)) return primary as Locale;
  }
  return 'en';
}
