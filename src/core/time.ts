const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Clock-style duration for the HUD: "00:24", "12:48", "01:02:15" (hours
 * appear only when needed). Rounds down to whole seconds, like a stopwatch.
 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * More precise duration for results: "24.6 s" under a minute, "1:35.2" under
 * an hour, otherwise the clock format. Rounds down to tenths so a time is
 * never shown as faster than it was.
 */
export function formatPrecise(ms: number): string {
  const tenths = Math.max(0, Math.floor(ms / 100));
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  if (tenths < 36000) {
    const minutes = Math.floor(tenths / 600);
    const seconds = (tenths % 600) / 10;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds.toFixed(1)}`;
  }
  return formatClock(ms);
}

/** Long-form total for statistics: "29 s", "42 min", "3 h 05 min". */
export function formatTotal(ms: number): string {
  if (ms < 60_000) return `${Math.floor(Math.max(0, ms) / 1000)} s`;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
}
