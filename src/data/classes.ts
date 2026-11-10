export interface HeroClass {
  id: string;
  name: string;
  epithet: string;
  desc: string;
  bonusStat: string;
  aura: string;
  starter: string[];
  defaultLook: { skin: string; hairStyle: string; hairColor: string; eyeColor: string; scar: string };
}

export const CLASSES: HeroClass[] = [
  {
    id: 'knight', name: 'Knight', epithet: 'the Unbroken',
    desc: 'Sworn to a fallen order. Endures what others flee.',
    bonusStat: 'strength', aura: '#d13a48', starter: ['st-knight-armor', 'st-knight-sword'],
    defaultLook: { skin: '#d9a77f', hairStyle: 'short', hairColor: '#4a2c1d', eyeColor: '#3a5a7a', scar: 'cheek' },
  },
  {
    id: 'witch', name: 'Witch', epithet: 'of the Hollow',
    desc: 'Reads omens in smoke. Brews remedies and curses alike.',
    bonusStat: 'wisdom', aura: '#5fd1c1', starter: ['st-witch-robe', 'st-witch-hood', 'st-witch-staff'],
    defaultLook: { skin: '#f1d3b3', hairStyle: 'long', hairColor: '#1a1414', eyeColor: '#5fd1c1', scar: 'none' },
  },
  {
    id: 'rogue', name: 'Rogue', epithet: 'the Unseen',
    desc: 'Patient, precise, and always three steps ahead.',
    bonusStat: 'discipline', aura: '#b5ab9b', starter: ['st-rogue-leather', 'st-rogue-cloak', 'st-rogue-dagger'],
    defaultLook: { skin: '#b07a52', hairStyle: 'wild', hairColor: '#1a1414', eyeColor: '#4f6b3a', scar: 'eye' },
  },
  {
    id: 'necromancer', name: 'Necromancer', epithet: 'the Pale Scholar',
    desc: 'Studies the last secret of all. Knowledge above comfort.',
    bonusStat: 'intellect', aura: '#9fd16a', starter: ['st-necro-robe', 'st-necro-tome'],
    defaultLook: { skin: '#c9c3d6', hairStyle: 'long', hairColor: '#e8e3d9', eyeColor: '#f5c96a', scar: 'none' },
  },
  {
    id: 'warden', name: 'Warden', epithet: 'of the Gloomwood',
    desc: 'Keeper of the old paths. Strong in body, steady in breath.',
    bonusStat: 'vitality', aura: '#7fbf5a', starter: ['st-warden-chain', 'st-warden-axe', 'st-warden-cloak'],
    defaultLook: { skin: '#7d5236', hairStyle: 'braid', hairColor: '#8a5a2b', eyeColor: '#2b1d14', scar: 'jaw' },
  },
  {
    id: 'herald', name: 'Blood Herald', epithet: 'the Silver-Tongued',
    desc: 'Speaks for dying houses. Words are the sharpest blade.',
    bonusStat: 'charisma', aura: '#e0a33a', starter: ['st-herald-leather', 'st-herald-circlet', 'st-herald-lantern'],
    defaultLook: { skin: '#4f3324', hairStyle: 'mohawk', hairColor: '#7a1f2b', eyeColor: '#ff4a5a', scar: 'none' },
  },
];

export const CLASS_BY_ID: Record<string, HeroClass> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

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
