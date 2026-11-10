import { addDays } from './dates';

/** Consecutive active days ending today (or yesterday, if today has no activity yet). */
export function activeStreak(activity: Record<string, number>, today: string): number {
  let d = (activity[today] ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((activity[d] ?? 0) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
