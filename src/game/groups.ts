/** Grouping quests into sections by their primary (first-tagged) stat. */
import type { StatDef } from './types';

export interface Group<T> {
  key: string; // stat id, or 'untagged'
  def: StatDef | null;
  items: T[];
}

/** The stat a quest is filed under: the first of its tags that still exists. */
export function primaryStat(statIds: string[], defs: StatDef[]): string | null {
  return statIds.find((id) => defs.some((d) => d.id === id)) ?? null;
}

/** Sections in stat order, then "untagged"; empty sections are dropped. Item order is preserved. */
export function groupByStat<T extends { statIds: string[] }>(items: T[], defs: StatDef[]): Group<T>[] {
  const groups: Group<T>[] = [...defs.map((d) => ({ key: d.id, def: d, items: [] as T[] })), { key: 'untagged', def: null, items: [] }];
  for (const it of items) {
    const p = primaryStat(it.statIds, defs);
    (groups.find((g) => g.key === (p ?? 'untagged')) ?? groups[groups.length - 1]).items.push(it);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** How a habit is scheduled: drives the top-level sections of habit lists. */
export type HabitTier = 'daily' | 'weekly' | 'anytime' | 'vice';

export const HABIT_TIERS: { id: HabitTier; title: string; subtitle: string; icon: string; color: string }[] = [
  { id: 'daily', title: 'Daily', subtitle: 'Due on set days. Miss one and it costs HP.', icon: 'sun', color: '#e0a33a' },
  { id: 'weekly', title: 'Weekly', subtitle: 'A target number of times each week.', icon: 'flag', color: '#5a8fd1' },
  { id: 'anytime', title: 'Anytime', subtitle: 'No penalty. Do them whenever you like.', icon: 'feather', color: '#5fd1c1' },
  { id: 'vice', title: 'Vices', subtitle: 'Resist these. Giving in costs HP.', icon: 'skull', color: '#d13a48' },
];

export function habitTier(h: { polarity: 'good' | 'bad'; frequency: 'daily' | 'weekly'; days: number[] }): HabitTier {
  if (h.polarity === 'bad') return 'vice';
  if (h.frequency === 'weekly') return 'weekly';
  return h.days.length ? 'daily' : 'anytime';
}
