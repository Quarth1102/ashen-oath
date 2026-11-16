/**
 * Classes are earned, not chosen. A hero's class is derived from which stats they train most
 * (see src/game/classes.ts). There are four kinds:
 *  - Wanderer: before the class awakens
 *  - Pure:    one stat clearly dominates
 *  - Hybrid:  the top two stats are close
 *  - Paragon: every stat is roughly even
 */

export interface ClassInfo {
  id: string;
  kind: 'wanderer' | 'pure' | 'hybrid' | 'paragon';
  name: string;
  epithet: string;
  desc: string;
  aura: string;
  /** stat ids that define this class (they get the class XP bonus) */
  stats: string[];
  /** gear granted the first time this class is reached */
  kit: string[];
}

export const WANDERER: ClassInfo = {
  id: 'wanderer', kind: 'wanderer', name: 'Wanderer', epithet: 'the Oathsworn',
  desc: 'No path has claimed you yet. Your deeds will decide what you become.',
  aura: '#8a8088', stats: [], kit: [],
};

type Def = Omit<ClassInfo, 'id' | 'kind' | 'stats'>;

/** Pure ranks, keyed by pillar id. */
export const PURE: Record<string, Def> = {
  body: { name: 'Knight', epithet: 'the Unbroken', aura: '#d13a48', kit: ['st-knight-armor', 'st-knight-sword'], desc: 'Your body is your oath: trained, tempered, unbreakable.' },
  mind: { name: 'Mage', epithet: 'of the Open Tome', aura: '#5a8fd1', kit: ['st-necro-robe', 'st-necro-tome'], desc: 'Knowledge is your weapon, and you sharpen it daily.' },
  spirit: { name: 'Mystic', epithet: 'of the Still Water', aura: '#b56ad1', kit: ['st-witch-robe', 'st-witch-hood', 'st-witch-staff'], desc: 'You tend the inner flame: calm, reflection, connection.' },
  discipline: { name: 'Sentinel', epithet: 'the Vigilant', aura: '#e0a33a', kit: ['st-rogue-leather', 'st-rogue-cloak', 'st-rogue-dagger'], desc: 'You keep watch over your own will, and it does not falter.' },
};

const pair = (a: string, b: string) => [a, b].sort().join('+');

/** Hybrid ranks, keyed by the two pillar ids sorted and joined with '+'. */
export const HYBRID: Record<string, Omit<Def, 'kit'>> = {
  [pair('body', 'mind')]: { name: 'Spellblade', epithet: 'of Steel and Sigil', aura: '#8a6ad1', desc: 'Sharp of blade and sharper of mind.' },
  [pair('body', 'spirit')]: { name: 'Paladin', epithet: 'the Lightbearer', aura: '#f5c96a', desc: 'Strength guided by a quiet heart.' },
  [pair('body', 'discipline')]: { name: 'Templar', epithet: 'of the Iron Rule', aura: '#a3202d', desc: 'Drilled, devout, relentless. The order made flesh.' },
  [pair('mind', 'spirit')]: { name: 'Oracle', epithet: 'Who Sees Beyond', aura: '#5fd1c1', desc: 'Knowledge and insight braided into prophecy.' },
  [pair('mind', 'discipline')]: { name: 'Runekeeper', epithet: 'of the Graven Word', aura: '#c98a3a', desc: 'Patient study, carved slowly into mastery.' },
  [pair('spirit', 'discipline')]: { name: 'Monk', epithet: 'of the Still Flame', aura: '#e8b46a', desc: 'Stillness practised until it becomes strength.' },
};

export const PARAGON: Def = {
  name: 'The Chosen One', epithet: 'of the Ashen Oath', aura: '#f2ead8', kit: [],
  desc: 'Body, mind, spirit and will in perfect balance. The prophecy was about you.',
};

/** Ids used before classes were earned, mapped to their earned equivalents. */
export const LEGACY_CLASS_IDS: Record<string, string> = {
  knight: 'pure:body', witch: 'pure:spirit', rogue: 'pure:discipline',
  necromancer: 'pure:mind', warden: 'pure:body', herald: 'pure:spirit',
};

export const pairKey = pair;

/* ── name & backstory generators (used by the hero creator) ── */

const NAMES = ['Aldric', 'Morwen', 'Vesna', 'Corvin', 'Ysolde', 'Hask', 'Eirlys', 'Thane', 'Sabeth', 'Oren', 'Mirela', 'Duskan'];
const ORIGINS = [
  'born the night the bells of the hamlet cracked',
  'raised by a widow who kept a sword beneath the floor',
  'the last of a house whose banners were burned',
  'found as a child at the edge of the Gloomwood',
  'once a gravedigger who heard the dead speak',
  'a deserter from a war that no one remembers winning',
];
const VOWS = [
  'has sworn to master body and mind before the ash swallows the world.',
  'walks the ruined roads seeking the discipline that the old order lost.',
  'keeps a ledger of every promise, and intends to keep them all.',
  'seeks the Obsidian Peaks, where it is said a person may be remade.',
  'hunts the slow rot of idle days as others hunt wolves.',
];
const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];

export function randomName(r = Math.random) {
  return pick(NAMES, r);
}

export function randomBackstory(name: string, r = Math.random) {
  return `${name || 'This wanderer'}, ${pick(ORIGINS, r)}, ${pick(VOWS, r)}`;
}

export const DEFAULT_LOOK = { skin: '#d9a77f', hairStyle: 'short', hairColor: '#4a2c1d', eyeColor: '#3a5a7a', scar: 'none' };
