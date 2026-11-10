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

/** Pure classes, keyed by default stat id. */
export const PURE: Record<string, Def> = {
  strength: { name: 'Knight', epithet: 'the Unbroken', aura: '#d13a48', kit: ['st-knight-armor', 'st-knight-sword'], desc: 'Sworn to a fallen order. Endures what others flee.' },
  vitality: { name: 'Warden', epithet: 'of the Gloomwood', aura: '#7fbf5a', kit: ['st-warden-chain', 'st-warden-axe', 'st-warden-cloak'], desc: 'Keeper of the old paths. Strong in body, steady in breath.' },
  intellect: { name: 'Necromancer', epithet: 'the Pale Scholar', aura: '#9fd16a', kit: ['st-necro-robe', 'st-necro-tome'], desc: 'Studies the last secret of all. Knowledge above comfort.' },
  wisdom: { name: 'Witch', epithet: 'of the Hollow', aura: '#5fd1c1', kit: ['st-witch-robe', 'st-witch-hood', 'st-witch-staff'], desc: 'Reads omens in smoke. Brews remedies and curses alike.' },
  discipline: { name: 'Rogue', epithet: 'the Unseen', aura: '#b5ab9b', kit: ['st-rogue-leather', 'st-rogue-cloak', 'st-rogue-dagger'], desc: 'Patient, precise, and always three steps ahead.' },
  charisma: { name: 'Blood Herald', epithet: 'the Silver-Tongued', aura: '#e0a33a', kit: ['st-herald-leather', 'st-herald-circlet', 'st-herald-lantern'], desc: 'Speaks for dying houses. Words are the sharpest blade.' },
};

const pair = (a: string, b: string) => [a, b].sort().join('+');

/** Hybrid classes, keyed by the two default stat ids sorted and joined with '+'. */
export const HYBRID: Record<string, Omit<Def, 'kit'>> = {
  [pair('strength', 'vitality')]: { name: 'Berserker', epithet: 'the Untiring', aura: '#e0603a', desc: 'Pain is only a rumour. The body is the weapon.' },
  [pair('strength', 'intellect')]: { name: 'Battlemage', epithet: 'of Steel and Sigil', aura: '#8a6ad1', desc: 'Forges spells into the edge of a blade.' },
  [pair('strength', 'wisdom')]: { name: 'Paladin', epithet: 'the Lightbearer', aura: '#f5c96a', desc: 'Strength guided by conscience. A shield for the weak.' },
  [pair('strength', 'discipline')]: { name: 'Templar', epithet: 'of the Iron Rule', aura: '#a3202d', desc: 'Drilled, devout, relentless. The order made flesh.' },
  [pair('strength', 'charisma')]: { name: 'Warlord', epithet: 'the Banner-Raiser', aura: '#d1503a', desc: 'Others follow where you march.' },
  [pair('vitality', 'intellect')]: { name: 'Plague Doctor', epithet: 'of the Beaked Mask', aura: '#c9c25a', desc: 'Studies sickness to master health.' },
  [pair('vitality', 'wisdom')]: { name: 'Druid', epithet: 'of the Old Roots', aura: '#3fae8a', desc: 'In balance with the living world, and with yourself.' },
  [pair('vitality', 'discipline')]: { name: 'Ranger', epithet: 'of the Long Road', aura: '#7a9a5a', desc: 'Endures every mile, misses nothing on the way.' },
  [pair('vitality', 'charisma')]: { name: 'Dirgesinger', epithet: 'of the Last Hearth', aura: '#d16aa3', desc: 'A voice that keeps the living warm through the long night.' },
  [pair('intellect', 'wisdom')]: { name: 'Oracle', epithet: 'Who Sees Beyond', aura: '#5a8fd1', desc: 'Knowledge and insight braided into prophecy.' },
  [pair('intellect', 'discipline')]: { name: 'Artificer', epithet: 'of the Clockwork Vow', aura: '#c98a3a', desc: 'Builds what others only imagine, gear by gear.' },
  [pair('intellect', 'charisma')]: { name: 'Warlock', epithet: 'of the Silver Pact', aura: '#b56ad1', desc: 'Bargains with powers, and wins.' },
  [pair('wisdom', 'discipline')]: { name: 'Monk', epithet: 'of the Still Flame', aura: '#e8b46a', desc: 'Stillness practiced until it becomes strength.' },
  [pair('wisdom', 'charisma')]: { name: 'Hierophant', epithet: 'the Ash-Anointed', aura: '#e8dfcf', desc: 'Guides others through the dark with quiet certainty.' },
  [pair('discipline', 'charisma')]: { name: 'Spymaster', epithet: 'of the Hidden Court', aura: '#7a6a8a', desc: 'Every word measured, every secret kept.' },
};

export const PARAGON: Def = {
  name: 'Ashen Paragon', epithet: 'the Whole', aura: '#f2ead8', kit: [],
  desc: 'You neglect no part of yourself. Rare, and formidable.',
};

/** Ids used before classes were earned, mapped to their earned equivalents. */
export const LEGACY_CLASS_IDS: Record<string, string> = {
  knight: 'pure:strength', witch: 'pure:wisdom', rogue: 'pure:discipline',
  necromancer: 'pure:intellect', warden: 'pure:vitality', herald: 'pure:charisma',
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
