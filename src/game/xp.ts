import type { Difficulty, Progress } from './types';

export const BASE_XP: Record<Difficulty, number> = { trivial: 5, easy: 10, medium: 20, hard: 40 };

export const heroXpToNext = (level: number) => Math.round(50 * Math.pow(level, 1.5));
export const statXpToNext = (level: number) => Math.round(20 * Math.pow(level, 1.4));

/** +2% per streak day, capped at +50%. */
export const streakMultiplier = (streak: number) => 1 + Math.min(Math.max(streak, 0), 25) * 0.02;

export const maxHpFor = (level: number) => 50 + (level - 1) * 2;

/** Adds (or removes, when negative) xp, rolling levels up or down. Never drops below level 1 / 0 xp. */
export function addXp(p: Progress, amount: number, curve: (lvl: number) => number): Progress & { gained: number } {
  let { level, xp } = p;
  xp += amount;
  while (xp >= curve(level)) {
    xp -= curve(level);
    level++;
  }
  while (xp < 0 && level > 1) {
    level--;
    xp += curve(level);
  }
  if (xp < 0) xp = 0;
  return { level, xp, gained: level - p.level };
}

/** Split `total` across `n` parts as evenly as possible (remainder goes to the first parts). */
export function splitXp(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
