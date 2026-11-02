import { describe, expect, it } from 'vitest';
import { createSettings, withSettings } from '../settings/Settings';
import { channelAudible, channelPatch } from './QuickSettings';

describe('quick settings (HUD)', () => {
  it('shows a channel as on only when it is actually playing', () => {
    const settings = createSettings();
    expect([channelAudible(settings, 'music'), channelAudible(settings, 'sfx')]).toEqual([true, true]);
    const muted = withSettings(settings, { muted: true });
    expect([channelAudible(muted, 'music'), channelAudible(muted, 'sfx')]).toEqual([false, false]);
    const noMusic = withSettings(settings, { music: false });
    expect([channelAudible(noMusic, 'music'), channelAudible(noMusic, 'sfx')]).toEqual([false, true]);
  });

  it('turning a channel on lifts the master mute; turning it off leaves the other channel playing', () => {
    const muted = withSettings(createSettings(), { muted: true, sfx: false });
    const on = withSettings(muted, channelPatch('music', true));
    expect([on.muted, channelAudible(on, 'music'), channelAudible(on, 'sfx')]).toEqual([false, true, false]);
    const off = withSettings(createSettings(), channelPatch('music', false));
    expect([off.muted, channelAudible(off, 'music'), channelAudible(off, 'sfx')]).toEqual([false, false, true]);
  });
});
