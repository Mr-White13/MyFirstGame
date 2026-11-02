import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLeague, type LeagueState } from '../league/League';
import { createProfile, type PlayerProfile } from '../profile/Profile';
import type { PlayerStats } from '../profile/Stats';
import { expectGolden } from '../testing/golden';
import { byId, installDom, leafIds, serialize, uninstallDom } from './fakeDom.test-helper';
import { ProfileScreen, type ProfileActions } from './ProfileScreen';
import { LEVELS, PROGRESS } from './uiFixtures.test-helper';

// Characterization: the Profile DOM exactly as rendered today (R13 render-on-demand safety net).
const GOLDEN = new URL('./ProfileScreen.golden.json', import.meta.url);

const STATS: Readonly<Record<string, PlayerStats>> = {
  fresh: { successfulRuns: 0, failedRuns: 0, flawlessRuns: 0, playTimeMs: 0, arrowsCleared: 0, chainClears: 0, trackedSince: '2026-01-15T12:00:00.000Z' },
  played: { successfulRuns: 41, failedRuns: 7, flawlessRuns: 12, playTimeMs: 2 * 3_600_000 + 5 * 60_000 + 999, arrowsCleared: 1234, chainClears: 321, trackedSince: '2025-12-31T12:00:00.000Z' },
};

const PROFILES: Readonly<Record<string, PlayerProfile>> = {
  default: createProfile(),
  custom: { id: null, nickname: 'Neo <b>&</b>', avatar: 'fox', country: 'RO' },
};

const LEAGUE: LeagueState = {
  ...createLeague(),
  tier: 3,
  highestTier: 5,
  lifetime: { points: 77, promotions: 6, relegations: 1, challengesCompleted: 30 },
};

let dateCalls: unknown[][];
beforeEach(() => {
  installDom();
  // The tracked-since date uses the device locale and time zone: pin both, but record what was asked for.
  dateCalls = [];
  const original = Date.prototype.toLocaleDateString;
  vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (this: Date, ...args: unknown[]) {
    dateCalls.push(args);
    return original.call(this, 'en-GB', { ...(args[1] as object), timeZone: 'UTC' });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  uninstallDom();
});

function make() {
  const calls: string[] = [];
  const actions: ProfileActions = {
    onBack: () => calls.push('back'),
    onRename: (name) => calls.push(`rename:${name}`),
    onChangeAvatar: () => calls.push('avatar'),
    onChangeCountry: () => calls.push('country'),
    onAchievements: () => calls.push('achievements'),
    onRecords: () => calls.push('records'),
  };
  return { view: new ProfileScreen(LEVELS, actions), calls };
}

describe('ProfileScreen render (golden)', () => {
  it('renders profile, league and rewards exactly as before', () => {
    const out: Record<string, unknown> = {};
    const cases: [string, PlayerProfile, keyof typeof PROGRESS, PlayerStats][] = [
      ['fresh', PROFILES.default, 'fresh', STATS.fresh],
      ['mid', PROFILES.custom, 'mid', STATS.played],
      ['chapter2', PROFILES.custom, 'chapter2', STATS.played],
      ['allComplete', PROFILES.default, 'allComplete', STATS.played],
    ];
    for (const [name, profile, progress, stats] of cases) {
      installDom();
      const { view } = make();
      view.render(profile, PROGRESS[progress], stats);
      if (name !== 'fresh') {
        view.renderLeague(LEAGUE);
        view.renderRewards({ credits: 1250, streak: name === 'mid' ? 1 : 9, longestStreak: 1, daysPlayed: 40, unlocked: 5, total: 12 });
      }
      // The whole screen once (static markup), then every id'd leaf per state.
      if (name === 'mid') out['screen (mid)'] = serialize(byId('screen-profile'));
      out[name] = leafIds('screen-profile');
    }
    expect(dateCalls).toContainEqual([undefined, { year: 'numeric', month: 'short', day: 'numeric' }]);
    expectGolden(GOLDEN, out);
  });
});

describe('ProfileScreen interactions', () => {
  it('wires every button to its action', () => {
    const { calls } = make();
    for (const id of ['btn-profile-back', 'profile-avatar', 'btn-country', 'btn-profile-achievements', 'btn-profile-records']) byId(id).click();
    expect(calls).toEqual(['back', 'avatar', 'country', 'achievements', 'records']);
  });

  it('edits the nickname: invalid shows the error, valid renames and closes, Escape cancels', () => {
    const { view, calls } = make();
    view.render(PROFILES.custom, PROGRESS.mid, STATS.played);
    expect(view.isEditing).toBe(false);
    byId('btn-edit-name').click();
    expect(view.isEditing).toBe(true);
    expect(byId('profile-name-input').value).toBe('Neo <b>&</b>');
    expect(byId('profile-name-view').hidden).toBe(true);
    byId('profile-name-input').value = '   ';
    expect(byId('profile-name-form').dispatch('submit').defaultPrevented).toBe(true);
    expect(byId('profile-name-error').textContent).toBe('Enter a nickname.');
    expect(view.isEditing).toBe(true);
    byId('profile-name-input').value = '  Trinity ';
    byId('profile-name-form').dispatch('submit');
    expect(calls).toEqual(['rename:Trinity']);
    expect(view.isEditing).toBe(false);
    byId('btn-edit-name').click();
    const escape = byId('profile-name-input').dispatch('keydown', { key: 'Escape' });
    expect(escape.propagationStopped).toBe(true);
    expect(view.isEditing).toBe(false);
    byId('btn-edit-name').click();
    view.cancelEditing();
    expect(view.isEditing).toBe(false);
  });
});
