import { addDays } from './dates';

/**
 * Consecutive active days ending today (or yesterday, if today has no activity yet).
 * Days in `skip` (vacation) neither count nor break the run.
 */
export function activeStreak(activity: Record<string, number>, today: string, skip: Record<string, true> = {}): number {
  let d = (activity[today] ?? 0) > 0 || skip[today] ? today : addDays(today, -1);
  let n = 0;
  for (let guard = 0; guard < 3650; guard++) {
    if ((activity[d] ?? 0) > 0) n++;
    else if (!skip[d]) break;
    d = addDays(d, -1);
  }
  return n;
}
