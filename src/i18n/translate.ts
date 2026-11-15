import type { Message, MessageTable } from './define';
import { localeTag, type Locale } from './locale';
import { MESSAGES, type Area, type MessageKey } from './messages';

export type { MessageKey } from './messages';

/** Values for `{name}` placeholders. A plural message picks its form from `count`. */
export type MessageParams = Readonly<Record<string, string | number>>;

let current: Locale = 'en';
const pluralRules = new Map<Locale, Intl.PluralRules>();

/** Sets the language for every later `t()` call. Set once at startup (see boot.ts); English until then. */
export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

function lookup(locale: Locale, key: string): Message | undefined {
  const dot = key.indexOf('.');
  const area = MESSAGES[key.slice(0, dot) as Area] as { readonly [L in Locale]: MessageTable } | undefined;
  return area?.[locale][key.slice(dot + 1)];
}

function pluralForm(locale: Locale, message: Exclude<Message, string>, count: number): string {
  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(localeTag(locale))));
  const category = rules.select(count) as keyof typeof message;
  return message[category] ?? message.other;
}

/**
 * Replaces `{name}` with the parameter's value. Numbers go in as plain
 * digits (what the English text always showed); pass `formatNumber(n)`
 * where a grouped number (`1,234` / `1.234`) is wanted.
 */
function fill(text: string, params: MessageParams | undefined): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * The text for `key` in the current language, with its placeholders filled.
 * Falls back to English, then to the key itself, so a gap never shows an
 * empty label.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(current, key, params);
}

/** `t()` for a given language (tests, and the language picker's own names). */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const message = lookup(locale, key) ?? lookup('en', key);
  if (message === undefined) return key;
  const text = typeof message === 'string' ? message : pluralForm(locale, message, Number(params?.count ?? 0));
  return fill(text, params);
}

/**
 * A number in the language's format. English keeps the exact output the
 * game always had (`1,234`); Spanish and Romanian group with dots (`1.234`).
 * Small whole numbers are plain digits in every language.
 */
export function formatNumber(value: number, locale: Locale = current): string {
  // es-ES leaves 4-digit numbers ungrouped by default; group them like Romanian.
  // (`'always'` is valid ES2023 Intl; this project's lib types still say boolean.)
  return value.toLocaleString(localeTag(locale), locale === 'es' ? ({ useGrouping: 'always' } as unknown as Intl.NumberFormatOptions) : undefined);
}

/**
 * The locale for `toLocaleDateString`: `undefined` (the device's own) in
 * English, as before; the chosen language otherwise, so dates match the text.
 */
export function dateLocale(): string | undefined {
  return current === 'en' ? undefined : localeTag(current);
}
