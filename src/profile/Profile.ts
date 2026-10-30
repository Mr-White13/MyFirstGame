import { browserStorage, parseObject, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
import { DEFAULT_AVATAR, isAvatarId, type AvatarId } from './avatars';
import { isCountryCode } from './countries';

/** The player's local, cosmetic identity. No account, nothing leaves the device. */
export interface PlayerProfile {
  readonly nickname: string;
  readonly avatar: AvatarId;
  /** ISO 3166-1 alpha-2 code, or null for "prefer not to say" (the default). */
  readonly country: string | null;
}

export const DEFAULT_NICKNAME = 'Player';
/** Longest nickname, in user-perceived characters. */
export const NICKNAME_MAX = 16;

export function createProfile(): PlayerProfile {
  return { nickname: DEFAULT_NICKNAME, avatar: DEFAULT_AVATAR, country: null };
}

/** Splits into user-perceived characters (so an emoji counts as one), where supported. */
function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Cleans a typed nickname: Unicode-normalised, control and invisible
 * formatting characters removed (they could break layout or spoof text),
 * whitespace collapsed and trimmed. Rendering always uses textContent, so
 * the name is never interpreted as HTML.
 */
export function normalizeNickname(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export type NicknameCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: 'empty' | 'too-long'; readonly message: string };

export function validateNickname(input: string): NicknameCheck {
  const value = normalizeNickname(input);
  if (value === '') return { ok: false, reason: 'empty', message: 'Enter a nickname.' };
  if (graphemes(value).length > NICKNAME_MAX) {
    return { ok: false, reason: 'too-long', message: `Use at most ${NICKNAME_MAX} characters.` };
  }
  return { ok: true, value };
}

export function withNickname(profile: PlayerProfile, input: string): PlayerProfile {
  const check = validateNickname(input);
  return check.ok ? { ...profile, nickname: check.value } : profile;
}

export function withAvatar(profile: PlayerProfile, avatar: string): PlayerProfile {
  return isAvatarId(avatar) ? { ...profile, avatar } : profile;
}

/** null clears the country ("prefer not to say"). Unknown codes are ignored. */
export function withCountry(profile: PlayerProfile, country: string | null): PlayerProfile {
  if (country === null) return { ...profile, country: null };
  return isCountryCode(country) ? { ...profile, country } : profile;
}

// ------------------------------------------------------------------ rank

export interface Rank {
  readonly title: string;
  /** Stars needed for this rank. */
  readonly minStars: number;
  /** Stars needed for the next rank, or null at the top. */
  readonly nextAt: number | null;
}

const RANKS: readonly { title: string; minStars: number }[] = [
  { title: 'Rookie', minStars: 0 },
  { title: 'Runner', minStars: 5 },
  { title: 'Tracer', minStars: 12 },
  { title: 'Navigator', minStars: 20 },
  { title: 'Grid Master', minStars: 27 },
];

/** A light cosmetic rank derived from total stars (nothing extra to save). */
export function rankFor(totalStars: number): Rank {
  let index = 0;
  RANKS.forEach((r, i) => totalStars >= r.minStars && (index = i));
  return { ...RANKS[index], nextAt: RANKS[index + 1]?.minStars ?? null };
}

// --------------------------------------------------------------- storage

export const PROFILE_KEY = 'neon-escape.profile';
export const PROFILE_VERSION = 1;

/** Reads a stored profile, keeping every valid field and defaulting the rest. Never throws. */
export function readProfile(raw: string | null): { value: PlayerProfile; status: SaveStatus } {
  if (raw === null) return { value: createProfile(), status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: createProfile(), status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > PROFILE_VERSION) return { value: createProfile(), status: 'newer' };
  if (data.version !== PROFILE_VERSION) return { value: createProfile(), status: 'corrupt' };

  let profile = createProfile();
  if (typeof data.nickname === 'string') profile = withNickname(profile, data.nickname);
  if (typeof data.avatar === 'string') profile = withAvatar(profile, data.avatar);
  if (typeof data.country === 'string') profile = withCountry(profile, data.country);
  return { value: profile, status: 'current' };
}

export function serializeProfile(profile: PlayerProfile): string {
  return JSON.stringify({ version: PROFILE_VERSION, ...profile });
}

export class ProfileStorage {
  private readonly safe: SafeStore<PlayerProfile>;

  constructor(store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(PROFILE_KEY, { read: readProfile, write: serializeProfile, fallback: createProfile }, store);
  }

  load(): PlayerProfile {
    return this.safe.load();
  }

  save(profile: PlayerProfile): boolean {
    return this.safe.save(profile);
  }
}
