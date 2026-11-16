/** Which gear a hero can wear: their rank's wardrobe, unlocked by level. Purely cosmetic. */
import type { Hero, Slot, StatDef } from './types';
import { GEAR, GEAR_BY_ID, SLOTS, type GearItem, type GearPath } from '../data/gear';
import { normalizeClassId, resolveClass } from './classes';

const RANK_PATHS: GearPath[] = ['body', 'mind', 'spirit', 'discipline'];

/** Wardrobe paths open to a class: its stat(s); a Paragon may wear every rank's gear. */
export function pathsFor(classId: string, defs: StatDef[]): GearPath[] {
  const info = resolveClass(normalizeClassId(classId), defs);
  if (info.kind === 'paragon') return RANK_PATHS;
  return info.stats.filter((s): s is GearPath => (RANK_PATHS as string[]).includes(s));
}

/** Every piece of the hero's wardrobe (unlocked or not), Wanderer basics included. */
export function wardrobe(hero: Pick<Hero, 'classId'>, defs: StatDef[]): GearItem[] {
  const paths = new Set<GearPath>(['wanderer', ...pathsFor(hero.classId, defs)]);
  return GEAR.filter((i) => paths.has(i.path));
}

export function availableGear(hero: Pick<Hero, 'classId' | 'level'>, defs: StatDef[]): GearItem[] {
  return wardrobe(hero, defs).filter((i) => hero.level >= i.unlock);
}

export function canWear(hero: Pick<Hero, 'classId' | 'level'>, defs: StatDef[], id: string): boolean {
  const item = GEAR_BY_ID[id];
  return !!item && availableGear(hero, defs).some((i) => i.id === id);
}

/** The best unlocked rank piece for each slot (falling back to Wanderer basics). */
export function rankSet(hero: Pick<Hero, 'classId' | 'level'>, defs: StatDef[]): Partial<Record<Slot, string>> {
  const avail = availableGear(hero, defs);
  const set: Partial<Record<Slot, string>> = {};
  for (const slot of SLOTS) {
    const pick = avail
      .filter((i) => i.slot === slot)
      .sort((a, b) => Number(b.path !== 'wanderer') - Number(a.path !== 'wanderer') || b.unlock - a.unlock)[0];
    if (pick) set[slot] = pick.id;
  }
  return set;
}
