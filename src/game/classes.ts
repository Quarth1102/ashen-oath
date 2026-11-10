/** Earned classes: derived from which stats the hero trains the most. */
import type { Progress, StatDef } from './types';
import { statXpToNext } from './xp';
import { mix } from '../art/color';
import { GEAR_BY_ID } from '../data/gear';
import { HYBRID, LEGACY_CLASS_IDS, PARAGON, PURE, WANDERER, pairKey, type ClassInfo } from '../data/classes';

/** Hero level at which a class first awakens (before that you are a Wanderer). */
export const CLASS_UNLOCK_LEVEL = 3;
/** Hybrid when the runner-up stat has at least this share of all stat XP… */
export const HYBRID_MIN_SHARE = 0.2;
/** …and is at least this fraction of the leading stat. */
export const HYBRID_RATIO = 0.75;
/** Paragon when no stat exceeds this multiple of an even share (needs 4+ stats). */
export const PARAGON_SPREAD = 1.35;

export const CLASS_BONUS = { pure: 10, hybrid: 5, paragon: 3 } as const;

/** All XP ever earned in a stat (levels are cumulative). */
export function totalStatXp(p: Progress | undefined): number {
  if (!p) return 0;
  let t = p.xp;
  for (let l = 1; l < p.level; l++) t += statXpToNext(l);
  return t;
}

export interface Standing {
  shares: { id: string; xp: number; share: number }[]; // sorted, highest first
  total: number;
}

export function standing(defs: StatDef[], stats: Record<string, Progress>): Standing {
  const rows = defs.map((d) => ({ id: d.id, xp: totalStatXp(stats[d.id]) }));
  const total = rows.reduce((a, r) => a + r.xp, 0);
  const shares = rows
    .map((r) => ({ ...r, share: total > 0 ? r.xp / total : 0 }))
    .sort((a, b) => b.xp - a.xp);
  return { shares, total };
}

/** Which class id these stats earn. Returns 'wanderer' before the class awakens. */
export function determineClassId(defs: StatDef[], stats: Record<string, Progress>, heroLevel: number): string {
  if (heroLevel < CLASS_UNLOCK_LEVEL || defs.length === 0) return 'wanderer';
  const { shares, total } = standing(defs, stats);
  if (total <= 0) return 'wanderer';
  const n = shares.length;
  const [first, second] = shares;
  if (n >= 4 && first.share <= PARAGON_SPREAD / n) return 'paragon';
  if (second && second.share >= HYBRID_MIN_SHARE && second.xp >= first.xp * HYBRID_RATIO) {
    return `hybrid:${pairKey(first.id, second.id)}`;
  }
  return `pure:${first.id}`;
}

export function normalizeClassId(id: string): string {
  return LEGACY_CLASS_IDS[id] ?? id;
}

/** Gear for a class: each slot taken from the first parent class that has it (body stats first). */
function kitFor(statIds: string[]): string[] {
  const order = Object.keys(PURE);
  const rank = (s: string) => (order.indexOf(s) + order.length + 1) % (order.length + 1);
  const sorted = [...statIds].sort((x, y) => rank(x) - rank(y));
  const bySlot = new Map<string, string>();
  for (const s of sorted) for (const id of PURE[s]?.kit ?? []) {
    const slot = GEAR_BY_ID[id]?.slot;
    if (slot && !bySlot.has(slot)) bySlot.set(slot, id);
  }
  return [...bySlot.values()];
}

/** Full info for a class id, including classes built from custom stats. */
export function resolveClass(rawId: string, defs: StatDef[]): ClassInfo {
  const id = normalizeClassId(rawId);
  const def = (sid: string) => defs.find((d) => d.id === sid);
  if (id === 'paragon') return { ...PARAGON, id, kind: 'paragon', stats: defs.map((d) => d.id) };
  if (id.startsWith('pure:')) {
    const sid = id.slice(5);
    const known = PURE[sid];
    if (known) return { ...known, id, kind: 'pure', stats: [sid] };
    const d = def(sid);
    const nm = d?.name ?? 'Unknown';
    return {
      id, kind: 'pure', stats: [sid], kit: [],
      name: `${nm}-Sworn`, epithet: `of the ${nm} Oath`, aura: d?.color ?? '#b5ab9b',
      desc: `Devoted above all to ${nm.toLowerCase()}.`,
    };
  }
  if (id.startsWith('hybrid:')) {
    const [a, b] = id.slice(7).split('+');
    const known = HYBRID[pairKey(a, b)];
    if (known) return { ...known, id, kind: 'hybrid', stats: [a, b], kit: kitFor([a, b]) };
    const da = def(a);
    const db = def(b);
    const na = da?.name ?? a;
    const nb = db?.name ?? b;
    return {
      id, kind: 'hybrid', stats: [a, b], kit: kitFor([a, b]),
      name: `${na}-${nb} Adept`, epithet: `of the Twin Oath`,
      aura: mix(da?.color ?? '#b5ab9b', db?.color ?? '#b5ab9b', 0.5),
      desc: `Walks the narrow path between ${na.toLowerCase()} and ${nb.toLowerCase()}.`,
    };
  }
  return WANDERER;
}

/** Bonus XP (as a fraction) the hero's class gives to a stat. */
export function classBonus(info: ClassInfo, statId: string): number {
  if (!info.stats.includes(statId)) return 0;
  if (info.kind === 'pure') return CLASS_BONUS.pure / 100;
  if (info.kind === 'hybrid') return CLASS_BONUS.hybrid / 100;
  if (info.kind === 'paragon') return CLASS_BONUS.paragon / 100;
  return 0;
}

/** Every class reachable with the given stats, for the class codex. */
export function allClassIds(defs: StatDef[]): string[] {
  const ids = defs.map((d) => `pure:${d.id}`);
  for (let i = 0; i < defs.length; i++)
    for (let j = i + 1; j < defs.length; j++) ids.push(`hybrid:${pairKey(defs[i].id, defs[j].id)}`);
  if (defs.length >= 4) ids.push('paragon');
  return ids;
}
