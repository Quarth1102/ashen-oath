const pad = (n: number) => String(n).padStart(2, '0');

export function formatDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The "game day" a moment belongs to. Days roll over at `resetHour` local time. */
export function dayKey(d: Date, resetHour = 0): string {
  const shifted = new Date(d.getTime() - resetHour * 3600_000);
  return formatDay(shifted);
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return formatDay(d);
}

export function weekday(key: string): number {
  return parseDay(key).getDay();
}

/** Monday that starts the week containing `key`. */
export function weekStart(key: string): string {
  const wd = (weekday(key) + 6) % 7;
  return addDays(key, -wd);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400_000);
}

export const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
