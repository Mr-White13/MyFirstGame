import { afterEach, describe, expect, it, vi } from 'vitest';

const vibrate = vi.fn(() => Promise.resolve());
vi.mock('@capacitor/haptics', () => ({ Haptics: { vibrate } }));

const { isNativeApp, nativeHapticsBackend, connectNativeApp } = await import('./nativeApp');

afterEach(() => {
  vi.useRealTimers();
  vibrate.mockClear();
});

describe('native Android bridge', () => {
  it('is inactive in the browser (and in tests)', () => {
    expect(isNativeApp()).toBe(false);
    const handlers = { onBack: vi.fn(() => true), onBackground: vi.fn() };
    expect(() => connectNativeApp(handlers)).not.toThrow();
    expect(handlers.onBack).not.toHaveBeenCalled();
  });

  it('plays haptic patterns as timed native vibrations', () => {
    vi.useFakeTimers();
    const backend = nativeHapticsBackend();
    expect(backend.supported).toBe(true);
    backend.vibrate([30, 50, 30]);
    vi.advanceTimersByTime(0);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenLastCalledWith({ duration: 30 });
    vi.advanceTimersByTime(80);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('never vibrates long, and a new pattern or 0 cancels a pending one', () => {
    vi.useFakeTimers();
    const backend = nativeHapticsBackend();
    backend.vibrate(5000);
    vi.advanceTimersByTime(0);
    expect(vibrate).toHaveBeenLastCalledWith({ duration: 250 });
    backend.vibrate([10, 100, 10]);
    backend.vibrate(0);
    vi.advanceTimersByTime(500);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
