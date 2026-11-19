/** Little things the hero does around camp, rotated at random so the scene stays alive. */
import type { Activity } from './activity';

export type Chore = 'warm' | 'tend' | 'clean' | 'cook' | 'read' | 'drink' | 'stand' | 'pet';
export const CHORES: Chore[] = ['warm', 'tend', 'clean', 'cook', 'read', 'drink', 'stand', 'pet'];

/** Relative odds of each chore, by activity. Resting favours sitting by the fire; keeping watch favours standing. */
export const CHORE_WEIGHTS: Partial<Record<Activity, Partial<Record<Chore, number>>>> = {
  camp: { warm: 3, cook: 2, clean: 2, read: 2, drink: 2, tend: 2, pet: 2, stand: 1 },
  watch: { stand: 4, clean: 2, tend: 1, drink: 1, warm: 1, pet: 1 },
};

/** How long a chore lasts before the hero moves on (ms). */
export const CHORE_MIN_MS = 14_000;
export const CHORE_MAX_MS = 28_000;

export function hasChores(a: string): a is 'camp' | 'watch' {
  return a === 'camp' || a === 'watch';
}

/** Picks the next chore, never repeating the current one, and skipping the pet if there isn't one. */
export function pickChore(activity: Activity, prev: Chore | null, hasPet: boolean, rng: () => number = Math.random): Chore {
  const weights = CHORE_WEIGHTS[activity] ?? CHORE_WEIGHTS.camp!;
  const options = (Object.entries(weights) as [Chore, number][]).filter(([c]) => c !== prev && (hasPet || c !== 'pet'));
  const total = options.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [c, w] of options) {
    if (r < w) return c;
    r -= w;
  }
  return options[0][0];
}

export function choreCaption(c: Chore, name: string, pet?: string): string {
  switch (c) {
    case 'warm': return `${name} warms their hands by the fire.`;
    case 'tend': return `${name} tends the fire.`;
    case 'clean': return `${name} polishes a blade by firelight.`;
    case 'cook': return `${name} roasts supper over the flames.`;
    case 'read': return `${name} reads an old tome.`;
    case 'drink': return `${name} sips a warm brew.`;
    case 'stand': return `${name} keeps watch over the camp.`;
    case 'pet': return `${name} makes a fuss of ${pet ?? 'their companion'}.`;
  }
}
