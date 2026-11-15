/** Weekly chronicle: a summary of one Monday–Sunday week, computed from saved history. */
import type { GameState } from './types';
import { addDays, weekday } from './dates';
import { onVacation, weekCount } from './engine';

export interface HabitWeek {
  id: string;
  title: string;
  done: number;
  due: number;
  rate: number; // 0..1
}

export interface WeekRecap {
  week: string; // Monday
  end: string; // Sunday
  xp: number;
  gold: number;
  deeds: number;
  activeDays: number;
  perfectDays: string[];
  vacationDays: number;
  bestDay: { day: string; xp: number } | null;
  stats: { id: string; xp: number }[]; // sorted, highest first
  habits: HabitWeek[]; // sorted, best rate first
}

export function weekRecap(s: GameState, week: string): WeekRecap {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const end = days[6];
  let xp = 0, gold = 0, deeds = 0, activeDays = 0, vacationDays = 0;
  let bestDay: WeekRecap['bestDay'] = null;
  const statXp: Record<string, number> = {};
  for (const d of days) {
    const dx = s.dayXp?.[d] ?? 0;
    xp += dx;
    gold += s.dayGold?.[d] ?? 0;
    deeds += s.dayActivity[d] ?? 0;
    if (s.dayActivity[d]) activeDays++;
    if (onVacation(s, d)) vacationDays++;
    if (dx > 0 && (!bestDay || dx > bestDay.xp)) bestDay = { day: d, xp: dx };
    for (const [id, v] of Object.entries(s.dayStats?.[d] ?? {})) statXp[id] = (statXp[id] ?? 0) + v;
  }
  const stats = s.statDefs.map((d) => ({ id: d.id, xp: statXp[d.id] ?? 0 })).filter((x) => x.xp > 0).sort((a, b) => b.xp - a.xp);
  const habits: HabitWeek[] = [];
  for (const h of s.habits) {
    if (h.polarity !== 'good' || h.createdDay > end) continue;
    let due = 0, done = 0;
    if (h.frequency === 'daily') {
      for (const d of days) {
        if (d < h.createdDay || onVacation(s, d) || !h.days.includes(weekday(d))) continue;
        due++;
        if (h.history[d]) done++;
      }
    } else if (h.createdDay <= week && !days.some((d) => onVacation(s, d))) {
      due = h.perWeek;
      done = Math.min(h.perWeek, weekCount(h, end));
    }
    if (due > 0) habits.push({ id: h.id, title: h.title, done, due, rate: done / due });
  }
  habits.sort((a, b) => b.rate - a.rate || b.done - a.done);
  const perfectDays = days.filter((d) => s.perfectDays?.[d]);
  return { week, end, xp, gold, deeds, activeDays, perfectDays, vacationDays, bestDay, stats, habits };
}

/** Mondays of past weeks with any activity, newest first. */
export function recapWeeks(s: GameState, thisWeek: string, max = 26): string[] {
  const out: string[] = [];
  for (let w = addDays(thisWeek, -7), i = 0; i < max; w = addDays(w, -7), i++) {
    let had = false;
    for (let d = 0; d < 7; d++) if (s.dayActivity[addDays(w, d)]) had = true;
    if (had) out.push(w);
  }
  return out;
}
