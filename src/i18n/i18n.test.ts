import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Message, MessageTable } from './define';
import { LOCALES, resolveLocale } from './locale';
import { MESSAGES, type MessageKey } from './messages';
import { formatNumber, getLocale, setLocale, t, translate } from './translate';

const placeholders = (message: Message): string[] => {
  const texts = typeof message === 'string' ? [message] : Object.values(message).filter((v): v is string => typeof v === 'string');
  return [...new Set(texts.flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();
};

afterEach(() => setLocale('en'));

describe('language choice', () => {
  it('follows the first device language we have, by primary subtag', () => {
    expect(resolveLocale('auto', ['es-MX', 'en-US'])).toBe('es');
    expect(resolveLocale('auto', ['ro-RO'])).toBe('ro');
    expect(resolveLocale('auto', ['ro_MD'])).toBe('ro');
    expect(resolveLocale('auto', ['de-DE', 'ro-RO'])).toBe('ro');
  });

  it('falls back to English for other or missing languages', () => {
    expect(resolveLocale('auto', ['de-DE', 'fr'])).toBe('en');
    expect(resolveLocale('auto', [])).toBe('en');
  });

  it('an explicit choice wins over the device', () => {
    expect(resolveLocale('ro', ['es-ES'])).toBe('ro');
    expect(resolveLocale('en', ['es-ES'])).toBe('en');
  });
});

describe('t()', () => {
  it('is English until a language is set', () => {
    expect(getLocale()).toBe('en');
    expect(t('settings.language')).toBe('Language');
  });

  it('uses the language set, and fills placeholders', () => {
    setLocale('es');
    expect(t('settings.language')).toBe('Idioma');
    expect(t('settings.languageHintAuto', { language: 'Español' })).toBe('Sigue a tu dispositivo: ahora, Español.');
    setLocale('ro');
    expect(t('settings.language')).toBe('Limbă');
  });

  it('falls back to the key for an unknown key instead of an empty label', () => {
    expect(t('settings.nope' as MessageKey)).toBe('settings.nope');
  });

  it('formats numbers per language, keeping the English output unchanged', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(1234, 'es')).toBe('1.234');
    expect(formatNumber(1234, 'ro')).toBe('1.234');
    expect(formatNumber(7, 'ro')).toBe('7');
  });
});

describe('plural messages', () => {
  // Uses the real tables: any plural message in any area.
  const plural = (Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]).flatMap((area) =>
    Object.entries(MESSAGES[area].ro as MessageTable)
      .filter(([, m]) => typeof m !== 'string')
      .map(([key]) => `${area}.${key}` as MessageKey),
  );

  it.runIf(plural.length > 0)('Romanian picks one / few / other ("1", "3", "20 de")', () => {
    const key = plural[0];
    const forms = MESSAGES[key.split('.')[0] as keyof typeof MESSAGES].ro[key.split('.')[1] as never] as unknown as Record<string, string>;
    expect(translate('ro', key, { count: 1 })).toBe(forms.one.replace('{count}', '1'));
    expect(translate('ro', key, { count: 3 })).toBe((forms.few ?? forms.other).replace('{count}', '3'));
    expect(translate('ro', key, { count: 20 })).toBe(forms.other.replace('{count}', '20'));
  });
});

describe('message tables', () => {
  for (const area of Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]) {
    const en = MESSAGES[area].en as MessageTable;
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      const table = MESSAGES[area][locale] as MessageTable;

      it(`${area}: ${locale} has exactly the English keys`, () => {
        expect(Object.keys(table).sort()).toEqual(Object.keys(en).sort());
      });

      it(`${area}: ${locale} keeps every placeholder of the English text`, () => {
        for (const key of Object.keys(en)) {
          expect([key, placeholders(table[key])]).toEqual([key, placeholders(en[key])]);
        }
      });

      it(`${area}: ${locale} has no empty messages`, () => {
        for (const [key, message] of Object.entries(table)) {
          const texts = typeof message === 'string' ? [message] : Object.values(message);
          for (const text of texts) expect([key, String(text).trim() === '']).toEqual([key, false]);
        }
      });
    }

    it(`${area}: plural messages always have an "other" form`, () => {
      for (const locale of LOCALES) {
        for (const [key, message] of Object.entries(MESSAGES[area][locale] as MessageTable)) {
          if (typeof message !== 'string') expect([locale, key, typeof message.other]).toEqual([locale, key, 'string']);
        }
      }
    });
  }
});

describe('index.html static text', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

  it('every data-i18n key exists', () => {
    const keys = [...html.matchAll(/data-i18n(?:-aria|-title|-placeholder|-last)?="([^"]+)"/g)].map((m) => m[1]);
    for (const key of keys) expect([key, translate('en', key as MessageKey) !== key]).toEqual([key, true]);
  });

  it('the English message is the text written in index.html (so English pages are unchanged)', () => {
    const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
    // Attribute form: data-i18n-aria="key" and aria-label="text" on the same tag.
    for (const [tag] of html.matchAll(/<[a-z][^<>]*\sdata-i18n-(?:aria|title|placeholder)="[^"]+"[^<>]*>/g)) {
      for (const [, kind, key] of tag.matchAll(/data-i18n-(aria|title|placeholder)="([^"]+)"/g)) {
        const attr = kind === 'aria' ? 'aria-label' : kind;
        const value = tag.match(new RegExp(`\\s${attr}="([^"]*)"`))?.[1];
        expect([key, translate('en', key as MessageKey)]).toEqual([key, decode(value ?? '')]);
      }
    }
    // Text form: the element's direct text pieces (outside child elements), with the element matched
    // to its own closing tag (nested elements of the same tag are counted).
    const CUT = '\u0000';
    const directTexts = (start: number, tagName: string): string[] => {
      const open = html.indexOf('>', start) + 1;
      const re = new RegExp('<(/?)' + tagName + '\\b[^>]*>', 'g');
      re.lastIndex = open;
      let depth = 1;
      let close = html.length;
      for (let m = re.exec(html); m; m = re.exec(html)) {
        depth += m[1] ? -1 : m[0].endsWith('/>') ? 0 : 1;
        if (depth === 0) {
          close = m.index;
          break;
        }
      }
      let inner = html.slice(open, close).replace(/<svg[\s\S]*?<\/svg>/g, CUT);
      for (let prev = ''; prev !== inner; ) {
        prev = inner;
        inner = inner.replace(/<([a-z0-9]+)\b[^>]*>[^<]*<\/\1>/g, CUT);
      }
      return inner
        .replace(/<[^>]+>/g, CUT)
        .split(CUT)
        .map((piece) => piece.replace(/\s+/g, ' ').trim())
        .filter((piece) => piece !== '');
    };
    for (const m of html.matchAll(/<([a-z0-9]+)\b[^<>]*\sdata-i18n(-last)?="([^"]+)"/g)) {
      const [, tagName, last, key] = m;
      const pieces = directTexts(m.index, tagName);
      const text = last ? pieces.at(-1) : pieces[0];
      expect([tagName, key, translate('en', key as MessageKey)]).toEqual([tagName, key, decode(text ?? '')]);
    }
  });
});
