import type { Difficulty, PenaltyStrength } from './types';

export const BASE_DAMAGE: Record<Difficulty, number> = { trivial: 2, easy: 4, medium: 7, hard: 12 };
export const PENALTY_MULT: Record<PenaltyStrength, number> = { 0: 0, 1: 0.5, 2: 1, 3: 1.5 };
export const PENALTY_LABEL: Record<PenaltyStrength, string> = { 0: 'Off', 1: 'Merciful', 2: 'Grim', 3: 'Brutal' };

export function damageFor(diff: Difficulty, strength: PenaltyStrength): number {
  if (strength === 0) return 0;
  return Math.max(1, Math.round(BASE_DAMAGE[diff] * PENALTY_MULT[strength]));
}

export const regenFor = (diff: Difficulty) => Math.ceil(BASE_DAMAGE[diff] / 2);

export const FALL_GOLD_LOSS = 0.1;
