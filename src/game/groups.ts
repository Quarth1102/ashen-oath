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
