/*
 * Countries for the cosmetic profile field. Stored as ISO 3166-1 alpha-2
 * codes; names come from the platform (Intl.DisplayNames) so no translations
 * table has to be shipped. Nothing here ever looks at the player's location.
 */

const CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW ' +
  'BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI ' +
  'FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN ' +
  'IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME ' +
  'MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF ' +
  'PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV ' +
  'SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE ' +
  'YT ZA ZM ZW'
).split(' ');

export interface Country {
  /** ISO 3166-1 alpha-2, upper case. */
  readonly code: string;
  readonly name: string;
  /** Regional-indicator emoji; shown as a flag where the platform supports it. */
  readonly flag: string;
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && CODES.includes(value);
}

export function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let names: Intl.DisplayNames | null | undefined;

export function countryName(code: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      names = null; // very old engines: fall back to the code
    }
  }
  return names?.of(code) ?? code;
}

let cache: readonly Country[] | null = null;

/** All countries, sorted by name. */
export function allCountries(): readonly Country[] {
  cache ??= CODES.map((code) => ({ code, name: countryName(code), flag: flagEmoji(code) })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  );
  return cache;
}

/** Case- and accent-insensitive search on name or code. */
export function searchCountries(query: string): readonly Country[] {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const q = fold(query.trim());
  if (q === '') return allCountries();
  return allCountries().filter((c) => fold(c.name).includes(q) || c.code.toLowerCase() === q);
}
