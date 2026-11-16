/**
 * Upgrades a save from the old six custom-able stats to the four fixed pillars
 * (Body, Mind, Spirit, Discipline). Safe to run on any save: it does nothing if
 * the save already uses the pillars.
 */
import type { GameState, Progress, Reward } from './types';
import { DEFAULT_STATS, PILLAR_IDS, STAT_MIGRATION } from '../data/stats';
import { addXp, statXpToNext } from './xp';
import { totalStatXp, normalizeClassId } from './classes';

/** Unknown (custom) stats fold into Spirit. */
export const toPillar = (id: string) => STAT_MIGRATION[id] ?? 'spirit';

export function needsPillarMigration(s: Pick<GameState, 'statDefs'>): boolean {
  const ids = s.statDefs.map((d) => d.id);
  return ids.length !== PILLAR_IDS.length || PILLAR_IDS.some((id, i) => ids[i] !== id);
}

function remapStats(stats: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats)) out[toPillar(k)] = (out[toPillar(k)] ?? 0) + v;
  return out;
}

function remapReward<T extends Reward | undefined>(r: T): T {
  return (r ? { ...r, stats: remapStats(r.stats) } : r) as T;
}

const oneTag = (ids: string[]) => (ids.length ? [toPillar(ids[0])] : []);

export function migrateToPillars(input: GameState): GameState {
  if (!needsPillarMigration(input)) return input;
  const s: GameState = structuredClone(input);

  if (s.hero) {
    const totals: Record<string, number> = {};
    for (const [id, p] of Object.entries(s.hero.stats)) totals[toPillar(id)] = (totals[toPillar(id)] ?? 0) + totalStatXp(p);
    const stats: Record<string, Progress> = {};
    for (const id of PILLAR_IDS) {
      const r = addXp({ level: 1, xp: 0 }, totals[id] ?? 0, statXpToNext);
      stats[id] = { level: r.level, xp: r.xp };
    }
    s.hero.stats = stats;
    s.hero.classId = normalizeClassId(s.hero.classId);
    s.hero.classesAttained = [...new Set((s.hero.classesAttained ?? []).map(normalizeClassId))];
  }

  for (const h of s.habits) {
    h.statIds = oneTag(h.statIds);
    for (const day of Object.keys(h.history)) h.history[day] = remapReward(h.history[day]);
    for (const day of Object.keys(h.extra ?? {})) h.extra![day] = h.extra![day].map((r) => remapReward(r));
  }
  for (const t of s.todos) {
    t.statIds = oneTag(t.statIds);
    t.reward = remapReward(t.reward);
  }
  for (const g of s.goals) {
    g.statIds = oneTag(g.statIds);
    g.reward = remapReward(g.reward);
    g.milestones = g.milestones.map((m) => ({ ...m, reward: remapReward(m.reward) }));
  }
  for (const day of Object.keys(s.perfectDays ?? {})) s.perfectDays![day] = remapReward(s.perfectDays![day]);
  for (const day of Object.keys(s.dayStats ?? {})) s.dayStats![day] = remapStats(s.dayStats![day]);

  s.statDefs = DEFAULT_STATS.map((d) => ({ ...d }));
  // old stat sections no longer exist
  s.settings = { ...s.settings, collapsed: (s.settings.collapsed ?? []).filter((k) => k.includes(':tier:')) };
  return s;
}
