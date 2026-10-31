import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAPTIC_EFFECTS, Haptics, TEST_EFFECT, webVibrationBackend } from '../haptics/Haptics';

const stockVibrate = vi.fn((_options: { duration: number }) => Promise.resolve());
vi.mock('@capacitor/haptics', () => ({ Haptics: { vibrate: stockVibrate } }));

const { isNativeApp, nativeHapticsBackend, connectNativeApp } = await import('./nativeApp');

function fakePlugin(fail = false, hasVibrator = true) {
  const vibrate = vi.fn((_o: { timings: number[]; amplitudes: number[] }) => (fail ? Promise.reject(new Error('VIBRATE_FAILED')) : Promise.resolve()));
  const cancel = vi.fn(() => Promise.resolve());
  const info = vi.fn(() => Promise.resolve({ hasVibrator, hasAmplitudeControl: true, touchFeedback: 0, sdk: 36 }));
  return { vibrate, cancel, info };
}

afterEach(() => {
  stockVibrate.mockClear();
  vi.restoreAllMocks();
});

describe('native Android bridge', () => {
  it('is inactive in the browser (and in tests)', () => {
    expect(isNativeApp()).toBe(false);
    const handlers = { onBack: vi.fn(() => true), onBackground: vi.fn() };
    expect(() => connectNativeApp(handlers)).not.toThrow();
    expect(handlers.onBack).not.toHaveBeenCalled();
  });

  it('selects the backend by platform: native plugin in the app, Vibration API in browsers', () => {
    const native = nativeHapticsBackend(fakePlugin(), () => true);
    expect(native).toMatchObject({ kind: 'native', supported: true });
    expect(webVibrationBackend({ vibrate: () => true }).kind).toBe('web');
  });

  it('sends the full waveform (durations and strengths) to the NeonHaptics plugin', () => {
    const plugin = fakePlugin();
    const backend = nativeHapticsBackend(plugin, () => true);
    backend.play(HAPTIC_EFFECTS.lifeLost, 'lifeLost');
    expect(plugin.vibrate).toHaveBeenCalledWith({ timings: [45, 60, 45], amplitudes: [230, 0, 230] });
    backend.stop();
    expect(plugin.cancel).toHaveBeenCalledTimes(1);
    expect(stockVibrate).not.toHaveBeenCalled();
  });

  it('falls back to the stock Capacitor Haptics plugin when NeonHaptics is missing', async () => {
    const plugin = fakePlugin();
    const backend = nativeHapticsBackend(plugin, () => false);
    backend.play(HAPTIC_EFFECTS.release, 'release');
    expect(plugin.vibrate).not.toHaveBeenCalled();
    expect(stockVibrate).toHaveBeenCalledWith({ duration: 40 });
    expect(await backend.test(TEST_EFFECT)).toEqual({ status: 'sent', detail: 'fallback' });
  });

  it('reports failures instead of hiding them, and never throws into the game', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const plugin = fakePlugin(true);
    const backend = nativeHapticsBackend(plugin, () => true);
    expect(() => backend.play(HAPTIC_EFFECTS.release, 'release')).not.toThrow();
    const result = await backend.test(TEST_EFFECT);
    expect(result).toMatchObject({ status: 'failed', detail: 'VIBRATE_FAILED' });
    expect(info.mock.calls.flat().join('\n')).toMatch(/rejected: VIBRATE_FAILED/);
  });

  it('test reports devices without a vibrator as unsupported', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const backend = nativeHapticsBackend(fakePlugin(false, false), () => true);
    expect(await backend.test(TEST_EFFECT)).toMatchObject({ status: 'unsupported' });
  });

  it('the Haptics manager uses the native backend and respects the setting', () => {
    const plugin = fakePlugin();
    let enabled = true;
    const haptics = new Haptics(() => enabled, nativeHapticsBackend(plugin, () => true), () => 0);
    expect(haptics.play('complete')).toBe(true);
    enabled = false;
    expect(haptics.play('reward')).toBe(false);
    expect(plugin.vibrate).toHaveBeenCalledTimes(1);
  });
});
