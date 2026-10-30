export const DAY_MS = 24 * 60 * 60 * 1000;

export const nowIso = () => new Date().toISOString();

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  return (to.getTime() - new Date(fromIso).getTime()) / DAY_MS;
}

export function formatWorkshopTime(iso: string, timeZone: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
  };
}

/** Hour of day (0–23) in the given time zone. */
function localHour(d: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(d);
  return Number(h);
}

/**
 * Calls and texts are only allowed between startHour and endHour local time.
 * Returns undefined when `now` is inside the window, otherwise the next moment the window opens.
 */
export function nextContactWindow(now: Date, timeZone: string, startHour: number, endHour: number): Date | undefined {
  const hour = localHour(now, timeZone);
  if (hour >= startHour && hour < endHour) return undefined;
  // Step forward to the top of each following hour until the window opens (at most 24 steps).
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 25; i++) {
    t.setTime(t.getTime() + 60 * 60 * 1000);
    if (localHour(t, timeZone) === startHour) return t;
  }
  throw new Error('Could not compute next contact window');
}
