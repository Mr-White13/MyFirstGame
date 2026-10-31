import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics as CapacitorHaptics } from '@capacitor/haptics';
import type { HapticEffect, HapticsBackend, HapticTestResult } from '../haptics/Haptics';

/**
 * The few places where the installed Android app (Capacitor) differs from
 * the browser. Everything here is a no-op in the browser, so `npm run dev`
 * and the web build behave exactly as before.
 */

/** True inside the installed Android app, false in any browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** The app's own native plugin (android/.../NeonHapticsPlugin.java). */
export interface NeonHapticsPlugin {
  vibrate(options: { timings: number[]; amplitudes: number[] }): Promise<void>;
  cancel(): Promise<void>;
  info(): Promise<{ hasVibrator: boolean; hasAmplitudeControl: boolean; touchFeedback: number; sdk: number }>;
}

const NeonHaptics = registerPlugin<NeonHapticsPlugin>('NeonHaptics');

/**
 * Diagnostic logging for haptics. Failures are always logged; every call is
 * logged when debugging is on (dev server, or `localStorage['neon-escape.debug'] = '1'`).
 * In a debug APK these lines appear in `adb logcat` under "Capacitor/Console".
 */
function debugOn(): boolean {
  try {
    return import.meta.env.DEV || localStorage.getItem('neon-escape.debug') === '1';
  } catch {
    return import.meta.env.DEV;
  }
}

export function hapticsLog(message: string, always = false): void {
  if (always || debugOn()) console.info(`[haptics] ${message}`);
}

/**
 * Native vibration for the Android app. Uses the app's NeonHaptics plugin,
 * which vibrates as game/media vibration (Android otherwise treats short
 * vibrations as touch feedback, which many phones have switched off). If that
 * plugin is missing, falls back to the stock Capacitor Haptics plugin.
 */
export function nativeHapticsBackend(
  plugin: NeonHapticsPlugin = NeonHaptics,
  available: () => boolean = () => Capacitor.isPluginAvailable('NeonHaptics'),
): HapticsBackend {
  const call = (effect: HapticEffect, label: string, always: boolean): Promise<HapticTestResult> => {
    if (!available()) {
      // Older native build without the local plugin: one stock vibration of the effect's length.
      const duration = Math.min(400, Math.max(40, effect.timings.reduce((a, b) => a + b, 0)));
      hapticsLog(`NeonHaptics missing; Capacitor Haptics.vibrate(${duration}) for ${label}`, always);
      return CapacitorHaptics.vibrate({ duration }).then(
        () => ({ status: 'sent' as const, detail: 'fallback' }),
        (e: unknown) => {
          hapticsLog(`Capacitor Haptics.vibrate rejected for ${label}: ${String(e)}`, true);
          return { status: 'failed' as const, detail: String(e) };
        },
      );
    }
    const options = { timings: [...effect.timings], amplitudes: [...effect.amplitudes] };
    return plugin.vibrate(options).then(
      () => {
        hapticsLog(`NeonHaptics.vibrate(${label}) resolved`, always);
        return { status: 'sent' as const };
      },
      (e: unknown) => {
        hapticsLog(`NeonHaptics.vibrate(${label}) rejected: ${String((e as Error)?.message ?? e)}`, true);
        return { status: 'failed' as const, detail: String((e as Error)?.message ?? e) };
      },
    );
  };

  return {
    kind: 'native',
    supported: true,
    play: (effect, label) => void call(effect, label, false),
    stop: () => {
      if (available()) void plugin.cancel().catch(() => undefined);
    },
    test: async (effect) => {
      hapticsLog(`test: native=${isNativeApp()} NeonHaptics=${available()} CapacitorHaptics=${Capacitor.isPluginAvailable('Haptics')}`, true);
      if (available()) {
        try {
          const info = await plugin.info();
          hapticsLog(`device: ${JSON.stringify(info)}`, true);
          if (!info.hasVibrator) return { status: 'unsupported', detail: 'no vibrator' };
        } catch (e) {
          hapticsLog(`info() failed: ${String(e)}`, true);
        }
      }
      return call(effect, 'test', true);
    },
  };
}

export interface NativeHandlers {
  /** The Back button or gesture. Return false when there is nothing to go back to. */
  onBack(): boolean;
  /** The app went to the background (true) or came back (false). */
  onBackground(hidden: boolean): void;
}

/**
 * Android Back and app lifecycle. With nothing left to go back to (Home),
 * Back sends the app to the background instead of closing it, so progress
 * and music state are kept like with the Home button.
 */
export function connectNativeApp(handlers: NativeHandlers): void {
  if (!isNativeApp()) return;
  void CapacitorApp.addListener('backButton', () => {
    if (!handlers.onBack()) void CapacitorApp.minimizeApp();
  });
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => handlers.onBackground(!isActive));
}
