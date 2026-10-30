import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../storage/SafeStore';
import { AVATARS, avatarSvg, DEFAULT_AVATAR, isAvatarId } from './avatars';
import { allCountries, countryName, flagEmoji, isCountryCode, searchCountries } from './countries';
import {
  createProfile,
  DEFAULT_NICKNAME,
  normalizeNickname,
  PROFILE_KEY,
  ProfileStorage,
  rankFor,
  readProfile,
  validateNickname,
  withAvatar,
  withCountry,
  withNickname,
} from './Profile';
import { addPlayTime, createStats, readStats, recordAttempt, STATS_KEY, StatsStorage } from './Stats';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('nickname', () => {
  it('defaults to "Player"', () => {
    expect(createProfile().nickname).toBe(DEFAULT_NICKNAME);
    expect(DEFAULT_NICKNAME).toBe('Player');
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeNickname('   Neon    Fox  ')).toBe('Neon Fox');
    expect(validateNickname('\tAda\n')).toEqual({ ok: true, value: 'Ada' });
  });

  it('rejects empty names', () => {
    expect(validateNickname('')).toMatchObject({ ok: false, reason: 'empty' });
    expect(validateNickname('    ')).toMatchObject({ ok: false, reason: 'empty' });
    expect(validateNickname('​​')).toMatchObject({ ok: false, reason: 'empty' }); // invisible only
  });

  it('enforces a 16-character limit, counting emoji as one character', () => {
    expect(validateNickname('a'.repeat(16)).ok).toBe(true);
    expect(validateNickname('a'.repeat(17))).toMatchObject({ ok: false, reason: 'too-long' });
    expect(validateNickname('🚀'.repeat(16)).ok).toBe(true);
  });

  it('strips control and invisible formatting characters', () => {
    expect(normalizeNickname('Ne\u0000on‮')).toBe('Neon');
  });

  it('keeps markup as plain text (rendering never parses it)', () => {
    expect(validateNickname('<b>Hi</b>')).toEqual({ ok: true, value: '<b>Hi</b>' });
  });

  it('ignores invalid changes', () => {
    const profile = createProfile();
    expect(withNickname(profile, '   ')).toBe(profile);
    expect(withNickname(profile, 'Zed').nickname).toBe('Zed');
  });
});

describe('avatars', () => {
  it('offers at least 8 original avatars with valid markup', () => {
    expect(AVATARS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    for (const a of AVATARS) expect(avatarSvg(a.id)).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(isAvatarId(DEFAULT_AVATAR)).toBe(true);
  });

  it('only accepts known avatars', () => {
    const profile = createProfile();
    expect(withAvatar(profile, 'cat').avatar).toBe('cat');
    expect(withAvatar(profile, 'not-an-avatar')).toBe(profile);
  });
});

describe('countries', () => {
  it('lists ISO 3166-1 alpha-2 codes with names and flags', () => {
    const list = allCountries();
    expect(list.length).toBeGreaterThanOrEqual(240);
    expect(list.every((c) => /^[A-Z]{2}$/.test(c.code))).toBe(true);
    expect(new Set(list.map((c) => c.code)).size).toBe(list.length);
    expect(countryName('RO')).toBe('Romania');
    expect(flagEmoji('RO')).toBe('🇷🇴');
  });

  it('searches by name (case and accent insensitive) or code', () => {
    expect(searchCountries('roman').map((c) => c.code)).toContain('RO');
    expect(searchCountries('CURACAO').map((c) => c.code)).toContain('CW');
    expect(searchCountries('jp').map((c) => c.code)).toContain('JP');
    expect(searchCountries('zzzz')).toEqual([]);
  });

  it('is optional and only accepts real codes', () => {
    const profile = withCountry(createProfile(), 'RO');
    expect(profile.country).toBe('RO');
    expect(withCountry(profile, null).country).toBeNull(); // prefer not to say
    expect(withCountry(profile, 'XX')).toBe(profile);
    expect(isCountryCode('ro')).toBe(false); // stored upper case only
  });
});

describe('rank', () => {
  it('derives a cosmetic rank from total stars', () => {
    expect(rankFor(0)).toMatchObject({ title: 'Rookie', nextAt: 5 });
    expect(rankFor(12).title).toBe('Tracer');
    expect(rankFor(30)).toMatchObject({ title: 'Grid Master', nextAt: null });
  });
});

describe('profile storage', () => {
  it('persists nickname, avatar and country', () => {
    const store = new MemoryStore();
    const profile = withCountry(withAvatar(withNickname(createProfile(), 'Ada'), 'fox'), 'JP');
    new ProfileStorage(store).save(profile);
    expect(new ProfileStorage(store).load()).toEqual({ nickname: 'Ada', avatar: 'fox', country: 'JP' });
  });

  it('keeps valid fields and defaults the rest', () => {
    const raw = JSON.stringify({ version: 1, nickname: '   ', avatar: 'unicorn', country: 'GB' });
    expect(readProfile(raw).value).toEqual({ nickname: 'Player', avatar: DEFAULT_AVATAR, country: 'GB' });
  });

  it('backs up corrupted profiles and never overwrites newer ones', () => {
    const store = new MemoryStore();
    store.setItem(PROFILE_KEY, '{nope');
    expect(new ProfileStorage(store).load()).toEqual(createProfile());
    expect(store.getItem(`${PROFILE_KEY}.backup`)).toBe('{nope');

    const future = JSON.stringify({ version: 9, nickname: 'Future' });
    store.setItem(PROFILE_KEY, future);
    const storage = new ProfileStorage(store);
    storage.load();
    expect(storage.save(createProfile())).toBe(false);
    expect(store.getItem(PROFILE_KEY)).toBe(future);
  });

  it('works without storage', () => {
    const storage = new ProfileStorage(null);
    expect(storage.load()).toEqual(createProfile());
    expect(storage.save(createProfile())).toBe(false);
  });
});

describe('statistics', () => {
  const now = new Date('2026-03-01T10:00:00Z');

  it('starts at zero for new and existing players, recording when tracking began', () => {
    expect(new StatsStorage(new MemoryStore(), () => now).load()).toEqual({
      successfulRuns: 0,
      failedRuns: 0,
      flawlessRuns: 0,
      playTimeMs: 0,
      arrowsCleared: 0,
      chainClears: 0,
      trackedSince: '2026-03-01T10:00:00.000Z',
    });
  });

  it('adds each attempt by outcome', () => {
    let stats = createStats(now);
    stats = recordAttempt(stats, { outcome: 'won', directClears: 5, autoClears: 2, mistakes: 0, uncountedTimeMs: 20_000 });
    stats = recordAttempt(stats, { outcome: 'failed', directClears: 1, autoClears: 0, mistakes: 3, uncountedTimeMs: 9000 });
    stats = recordAttempt(stats, { outcome: 'won', directClears: 6, autoClears: 0, mistakes: 1, uncountedTimeMs: 15_000 });
    stats = addPlayTime(stats, 1000);
    expect(stats).toMatchObject({
      successfulRuns: 2,
      failedRuns: 1,
      flawlessRuns: 1,
      playTimeMs: 45_000,
      arrowsCleared: 14,
      chainClears: 2,
    });
  });

  it('round-trips and repairs malformed counters', () => {
    const store = new MemoryStore();
    const stats = recordAttempt(createStats(now), { outcome: 'won', directClears: 3, autoClears: 1, mistakes: 0, uncountedTimeMs: 5000 });
    new StatsStorage(store, () => now).save(stats);
    expect(new StatsStorage(store, () => now).load()).toEqual(stats);

    const raw = JSON.stringify({ version: 1, successfulRuns: -4, failedRuns: 'x', playTimeMs: 1500, trackedSince: 'nonsense' });
    expect(readStats(raw, now).value).toMatchObject({ successfulRuns: 0, failedRuns: 0, playTimeMs: 1500, trackedSince: now.toISOString() });
    expect(STATS_KEY).toBe('neon-escape.stats');
  });
});
