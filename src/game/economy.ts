import type { Rarity } from './types';

export const goldFor = (xp: number) => Math.round(xp / 2);

export const LOOT_CHANCE = 0.05;

export const RARITY_WEIGHTS: [Rarity, number][] = [
  ['common', 60],
  ['rare', 28],
  ['epic', 10],
  ['legendary', 2],
];

export const RARITY_GOLD: Record<Rarity, number> = { common: 30, rare: 80, epic: 200, legendary: 500 };

export function rollRarity(rng: () => number): Rarity {
  const total = RARITY_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [rarity, w] of RARITY_WEIGHTS) {
    if (r < w) return rarity;
    r -= w;
  }
  return 'common';
}
