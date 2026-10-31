import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import type { HapticsBackend } from '../haptics/Haptics';

/**
 * The few places where the installed Android app (Capacitor) differs from
 * the browser. Everything here is a no-op in the browser, so `npm run dev`
 * and the web build behave exactly as before.
 */

/** True inside the installed Android app, false in any browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Vibration through the native Haptics plugin. The patterns are the same as
 * in the browser (on, off, on … in ms): each "on" step becomes one native
 * vibration at the right moment. Android's WebView does not reliably support
 * \`navigator.vibrate\`, so the app uses this instead.
 */
export function nativeHapticsBackend(): HapticsBackend {
  let timers: ReturnType<typeof setTimeout>[] = [];
  return {
    supported: true,
    vibrate(pattern) {
      timers.forEach(clearTimeout);
      timers = [];
      const steps = typeof pattern === 'number' ? [pattern] : pattern;
      let at = 0;
      steps.forEach((ms, i) => {
        if (i % 2 === 0 && ms > 0) {
          const duration = Math.min(ms, 250); // never a long buzz, whatever the pattern says
          timers.push(setTimeout(() => void Haptics.vibrate({ duration }).catch(() => undefined), at));
        }
        at += Math.max(0, ms);
      });
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
