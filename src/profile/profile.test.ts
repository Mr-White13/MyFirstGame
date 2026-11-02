import { describe, expect, it } from 'vitest';
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
  withIdentity,
  withNickname,
} from './Profile';
import { isPlayerId, NAME_ADJECTIVES, NAME_NOUNS, newPlayerId, randomNickname, SPECIAL_NAME_SHARE, SPECIAL_NAMES } from './identity';
import { addPlayTime, createStats, readStats, recordAttempt, STATS_KEY, StatsStorage } from './Stats';
import { MemoryStore } from '../testing/memoryStore';

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

/** Fixed randomness: always the first words, and ids from a counter (all valid, all different). */
const firstWords = () => 0.5;
let idCounter = 0;
const countingBytes = () => {
  const bytes = new Uint8Array(16);
  new DataView(bytes.buffer).setUint32(12, ++idCounter);
  return bytes;
};
const fixedStorage = (store: MemoryStore | null) => new ProfileStorage(store, firstWords, countingBytes);

describe('profile storage', () => {
  it('persists id, nickname, avatar and country', () => {
    const store = new MemoryStore();
    const profile = withCountry(withAvatar(withNickname(createProfile(), 'Ada'), 'fox'), 'JP');
    fixedStorage(store).save(profile);
    const loaded = fixedStorage(store).load();
    expect(loaded).toMatchObject({ nickname: 'Ada', avatar: 'fox', country: 'JP' });
    expect(isPlayerId(loaded.id)).toBe(true);
    expect(fixedStorage(store).load()).toEqual(loaded); // the id was saved: it never changes
  });

  it('keeps valid fields and defaults the rest', () => {
    const raw = JSON.stringify({ version: 1, nickname: '   ', avatar: 'unicorn', country: 'GB', id: 'not-a-uuid' });
    expect(readProfile(raw).value).toEqual({ id: null, nickname: 'Player', avatar: DEFAULT_AVATAR, country: 'GB' });
    const id = '0f9c2a4e-7b1d-4c3e-9a2b-5d6e7f8a9b0c';
    expect(readProfile(JSON.stringify({ version: 1, id, nickname: 'Neo' })).value.id).toBe(id);
  });

  it('gives a new player a random nickname and a unique id, saved at once', () => {
    const store = new MemoryStore();
    const first = fixedStorage(store).load();
    expect(first.nickname).not.toBe(DEFAULT_NICKNAME);
    expect(first.nickname).toBe(randomNickname(firstWords));
    expect(isPlayerId(first.id)).toBe(true);
    expect(readProfile(store.getItem(PROFILE_KEY)).value).toEqual(first);
    expect(fixedStorage(new MemoryStore()).load().id).not.toBe(first.id);
  });

  it('renames a saved "Player" once, keeps a chosen name, and never renames after that', () => {
    const store = new MemoryStore();
    store.setItem(PROFILE_KEY, JSON.stringify({ version: 1, nickname: 'Player', avatar: 'fox', country: 'RO' }));
    const upgraded = fixedStorage(store).load();
    expect(upgraded).toMatchObject({ nickname: randomNickname(firstWords), avatar: 'fox', country: 'RO' });
    expect(isPlayerId(upgraded.id)).toBe(true);

    const chosen = new MemoryStore();
    chosen.setItem(PROFILE_KEY, JSON.stringify({ version: 1, nickname: 'Ada' }));
    expect(fixedStorage(chosen).load().nickname).toBe('Ada');

    // A player with an id who types "Player" themselves keeps it.
    fixedStorage(store).save(withNickname(upgraded, 'Player'));
    expect(fixedStorage(store).load()).toEqual({ ...upgraded, nickname: 'Player' });
    expect(withIdentity(upgraded)).toBe(upgraded);
  });

  it('backs up corrupted profiles and never overwrites newer ones', () => {
    const store = new MemoryStore();
    store.setItem(PROFILE_KEY, '{nope');
    expect(fixedStorage(store).load()).toMatchObject({ nickname: randomNickname(firstWords), avatar: DEFAULT_AVATAR, country: null });
    expect(store.getItem(`${PROFILE_KEY}.backup`)).toBe('{nope');

    const future = JSON.stringify({ version: 9, nickname: 'Future' });
    store.setItem(PROFILE_KEY, future);
    const storage = new ProfileStorage(store);
    storage.load();
    expect(storage.save(createProfile())).toBe(false);
    expect(store.getItem(PROFILE_KEY)).toBe(future);
  });

  it('works without storage: an identity for this session only', () => {
    const storage = fixedStorage(null);
    const profile = storage.load();
    expect(isPlayerId(profile.id)).toBe(true);
    expect(profile.nickname).not.toBe(DEFAULT_NICKNAME);
    expect(storage.save(createProfile())).toBe(false);
  });
});

describe('player identity', () => {
  it('random nicknames always fit the nickname rules', () => {
    const names = [...NAME_ADJECTIVES.flatMap((a) => NAME_NOUNS.map((n) => `${a} ${n}`)), ...SPECIAL_NAMES];
    for (const name of names) expect(validateNickname(name)).toEqual({ ok: true, value: name });
    expect(names).not.toContain(DEFAULT_NICKNAME);
    expect(new Set(NAME_ADJECTIVES).size).toBe(NAME_ADJECTIVES.length);
    expect(new Set(NAME_NOUNS).size).toBe(NAME_NOUNS.length);
    expect(NAME_ADJECTIVES.length * NAME_NOUNS.length).toBeGreaterThanOrEqual(1500);
  });

  it('picks every word and the special names, at about the planned share', () => {
    let seed = 1;
    const lcg = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const names = Array.from({ length: 20_000 }, () => randomNickname(lcg));
    const special = names.filter((n) => SPECIAL_NAMES.includes(n)).length / names.length;
    expect(special).toBeGreaterThan(SPECIAL_NAME_SHARE * 0.8);
    expect(special).toBeLessThan(SPECIAL_NAME_SHARE * 1.2);
    for (const word of [...NAME_ADJECTIVES, ...NAME_NOUNS]) expect(names.some((n) => n.split(' ').includes(word))).toBe(true);
    expect(randomNickname(() => 0.9999999)).toBe(`${NAME_ADJECTIVES.at(-1)} ${NAME_NOUNS.at(-1)}`); // never out of range
  });

  it('player ids are version 4 UUIDs, unique across many players', () => {
    expect(newPlayerId(() => new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000');
    expect(newPlayerId(() => new Uint8Array(16).fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    const ids = Array.from({ length: 10_000 }, () => newPlayerId());
    expect(ids.every(isPlayerId)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const bad of ['', 'Player', 'ffffffff-ffff-1fff-bfff-ffffffffffff', 'FFFFFFFF-FFFF-4FFF-BFFF-FFFFFFFFFFFF', 42, null]) expect(isPlayerId(bad)).toBe(false);
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
