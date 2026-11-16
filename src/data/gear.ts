import type { Rarity, Slot } from '../game/types';

export type ArmorStyle = 'leather' | 'plate' | 'robe' | 'chain';
export type HelmStyle = 'hood' | 'greathelm' | 'crown' | 'horned' | 'circlet' | 'mask';
export type CloakStyle = 'short' | 'long' | 'tattered';
export type WeaponStyle = 'sword' | 'staff' | 'scythe' | 'dagger' | 'axe' | 'tome' | 'lantern';

export interface GearLook {
  style: ArmorStyle | HelmStyle | CloakStyle | WeaponStyle;
  color: string;
  trim: string;
}

/**
 * Gear is purely cosmetic. Each piece belongs to a path: one stat's rank (its pure class),
 * or 'wanderer' for the basic set everyone can wear. Pieces unlock at level milestones.
 */
export type GearPath = 'wanderer' | 'body' | 'mind' | 'spirit' | 'discipline';

export interface GearItem {
  id: string;
  name: string;
  slot: Slot;
  path: GearPath;
  /** hero level at which it unlocks */
  unlock: number;
  rarity: Rarity;
  desc: string;
  look: GearLook;
}

export const GEAR_MILESTONES = [3, 8, 15, 25];
const RARITY_AT: Record<number, Rarity> = { 1: 'common', 3: 'common', 8: 'rare', 15: 'epic', 25: 'legendary' };

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b5ab9b',
  rare: '#5a8fd1',
  epic: '#b56ad1',
  legendary: '#e0a33a',
};

const g = (
  path: GearPath, unlock: number, id: string, name: string, slot: Slot,
  style: GearLook['style'], color: string, trim: string, desc: string,
): GearItem => ({ id, name, slot, path, unlock, rarity: RARITY_AT[unlock], desc, look: { style, color, trim } });

export const GEAR: GearItem[] = [
  // ── Wanderer: everyone ─────────────────────────
  g('wanderer', 1, 'wd-cloak', 'Traveller’s Cloak', 'cloak', 'short', '#5a4a3a', '#8a7a62', 'Dusty from a hundred roads.'),
  g('wanderer', 1, 'wd-staff', 'Walking Staff', 'weapon', 'staff', '#6b4a2a', '#8a7a62', 'Good for hills, better for wolves.'),
  g('wanderer', 1, 'wd-hood', 'Road Hood', 'helm', 'hood', '#4a3f35', '#8a7a62', 'Keeps the rain off, mostly.'),

  // ── Knight (Body) ──────────────────────────
  g('body', 3, 'st-knight-armor', 'Dented Plate', 'armor', 'plate', '#6b6f78', '#a08a5a', 'Plate that has seen too many winters.'),
  g('body', 3, 'st-knight-sword', 'Oath Blade', 'weapon', 'sword', '#b8bcc4', '#a08a5a', 'Notched, but true.'),
  g('body', 8, 'helm-iron', 'Iron Greathelm', 'helm', 'greathelm', '#6b6f78', '#a3202d', 'The world narrows to a slit.'),
  g('body', 8, 'sword-long', 'Longsword', 'weapon', 'sword', '#c8ccd4', '#5a3e2b', 'Reliable steel.'),
  g('body', 8, 'cloak-crimson', 'Crimson Cape', 'cloak', 'long', '#7a1f2b', '#e0a33a', 'You will be seen.'),
  g('body', 15, 'plate-blackened', 'Blackened Plate', 'armor', 'plate', '#26222a', '#a3202d', 'Quenched in a river of tar.'),
  g('body', 15, 'helm-horned', 'Horned Helm', 'helm', 'horned', '#3a3540', '#e8dfcf', 'Taken from something that walked upright.'),
  g('body', 25, 'plate-dawn', 'Plate of the Last Dawn', 'armor', 'plate', '#c9b28a', '#f5c96a', 'It remembers the sun.'),
  g('body', 25, 'sword-oathbreaker', 'Oathbreaker', 'weapon', 'sword', '#3a1420', '#ff4a5a', 'A blade that remembers every promise broken.'),
  g('body', 25, 'cloak-ember', 'Emberweave Cloak', 'cloak', 'long', '#2a1410', '#ff7a3a', 'Its hem never stops smouldering.'),

  // ── Body: warden pieces ──────────────────────────
  g('body', 3, 'st-warden-chain', 'Warden Mail', 'armor', 'chain', '#5a6058', '#5c6b4a', 'Rings forged in the old forest.'),
  g('body', 3, 'st-warden-axe', 'Woodsplitter', 'weapon', 'axe', '#9aa0a8', '#5a3e2b', 'For kindling, and for wolves.'),
  g('body', 3, 'st-warden-cloak', 'Moss Cloak', 'cloak', 'long', '#2c3a28', '#5c6b4a', 'Never quite dry.'),
  g('body', 8, 'armor-padded', 'Padded Gambeson', 'armor', 'leather', '#6b5a44', '#4a3a2a', 'Humble, warm, honest.'),
  g('body', 8, 'wa-antlers', 'Antler Crown', 'helm', 'horned', '#3a2a1e', '#c9b28a', 'Shed by a stag that would not die.'),
  g('body', 8, 'cloak-wool', 'Wool Mantle', 'cloak', 'long', '#4a3a30', '#8a7a62', 'Thick, plain, and loyal.'),
  g('body', 15, 'axe-bearded', 'Bearded Axe', 'weapon', 'axe', '#8a9098', '#3a2a1e', 'Hooked to pull down shields.'),
  g('body', 15, 'armor-mail', 'Riveted Mail', 'armor', 'chain', '#7a808a', '#3a5a3a', 'Each ring a small vow.'),
  g('body', 15, 'mask-plague', 'Plague Mask', 'helm', 'mask', '#d8cfbf', '#2a2430', 'Herbs in the beak keep the rot away.'),
  g('body', 25, 'wa-greatmail', 'Heartwood Mail', 'armor', 'chain', '#2c3a28', '#e0a33a', 'Woven around a living branch.'),
  g('body', 25, 'wa-thorncloak', 'Mantle of Thorns', 'cloak', 'tattered', '#1e2a1a', '#7a1f2b', 'The forest wears it through you.'),
  g('body', 25, 'wa-greataxe', 'Elder Axe', 'weapon', 'axe', '#c9c3b8', '#2c3a28', 'Felled the first tree, they say.'),

  // ── Mage (Mind) ────────────────────
  g('mind', 3, 'st-necro-robe', 'Grave Robe', 'armor', 'robe', '#1c1a1e', '#9fd16a', 'Embroidered with names of the dead.'),
  g('mind', 3, 'st-necro-tome', 'Ledger of Bones', 'weapon', 'tome', '#3a2a1e', '#9fd16a', 'Every page a promise.'),
  g('mind', 8, 'robe-scholar', 'Scholar Robe', 'armor', 'robe', '#2a3a5a', '#c9b28a', 'Ink-stained cuffs, candle-scorched hem.'),
  g('mind', 8, 'lantern-ghost', 'Ghostlight Lantern', 'weapon', 'lantern', '#3a3540', '#9fd16a', 'Burns without oil.'),
  g('mind', 8, 'ne-cowl', 'Grave Cowl', 'helm', 'hood', '#1a1a1e', '#9fd16a', 'Smells faintly of turned earth.'),
  g('mind', 15, 'staff-bone', 'Bone Staff', 'weapon', 'staff', '#d8cfbf', '#9fd16a', 'Carved from a giant’s femur.'),
  g('mind', 15, 'cloak-grave', 'Gravewalker Cloak', 'cloak', 'tattered', '#3a3a32', '#9fd16a', 'Stitched from burial shrouds.'),
  g('mind', 25, 'scythe-reaper', 'Reaper’s Scythe', 'weapon', 'scythe', '#2a2430', '#b8bcc4', 'It has harvested more than wheat.'),
  g('mind', 25, 'ne-crown', 'Crown of the Ossuary', 'helm', 'crown', '#d8cfbf', '#9fd16a', 'Each point a finger bone.'),
  g('mind', 25, 'ne-robe', 'Shroud of Names', 'armor', 'robe', '#0f0e12', '#9fd16a', 'The names are still being written.'),

  // ── Mystic (Spirit) ─────────────────────────────
  g('spirit', 3, 'st-witch-robe', 'Hedge Robe', 'armor', 'robe', '#2f2540', '#5fd1c1', 'Smells of nightshade.'),
  g('spirit', 3, 'st-witch-hood', 'Witch Hood', 'helm', 'hood', '#241c30', '#5fd1c1', 'Deep enough to hide a secret.'),
  g('spirit', 3, 'st-witch-staff', 'Rowan Staff', 'weapon', 'staff', '#5a3e2b', '#5fd1c1', 'A bound spark sleeps in the knot.'),
  g('spirit', 8, 'tome-hymns', 'Book of Hymns', 'weapon', 'tome', '#5a2a2a', '#e0a33a', 'Half prayers, half warnings.'),
  g('spirit', 8, 'hood-pilgrim', 'Pilgrim Hood', 'helm', 'hood', '#4a3f35', '#5fd1c1', 'Woven for long roads.'),
  g('spirit', 8, 'wi-shawl', 'Herbwife Shawl', 'cloak', 'short', '#3a2f4a', '#5fd1c1', 'Pockets full of dried things.'),
  g('spirit', 15, 'circlet-seer', 'Seer Circlet', 'helm', 'circlet', '#b5ab9b', '#5fd1c1', 'The gem sees what you will not.'),
  g('spirit', 15, 'robe-vesper', 'Vesper Vestments', 'armor', 'robe', '#3a1420', '#e0a33a', 'Sung over at every dusk.'),
  g('spirit', 25, 'cloak-raven', 'Raven Shroud', 'cloak', 'tattered', '#14121a', '#3b4a6b', 'Feathers whisper as you pass.'),
  g('spirit', 25, 'wi-moonstaff', 'Moonwood Staff', 'weapon', 'staff', '#c9c3d6', '#e8e3d9', 'Cut by moonlight, never by day.'),
  g('spirit', 25, 'wi-robe', 'Robe of the Hollow Moon', 'armor', 'robe', '#1a1430', '#c9c3d6', 'Darker than the night it was sewn in.'),

  // ── Sentinel (Discipline) ─────────────────────────
  g('discipline', 3, 'st-rogue-leather', 'Night Leathers', 'armor', 'leather', '#3a2c26', '#6b5f73', 'Quiet as a held breath.'),
  g('discipline', 3, 'st-rogue-cloak', 'Alley Cloak', 'cloak', 'short', '#2a2a30', '#6b5f73', 'Grey as a city at dawn.'),
  g('discipline', 3, 'st-rogue-dagger', 'Kiss of Iron', 'weapon', 'dagger', '#b8bcc4', '#7a1f2b', 'Short, sharp, sincere.'),
  g('discipline', 8, 'ro-mask', 'Smiling Mask', 'helm', 'mask', '#14121a', '#a3202d', 'The smile is the only honest part.'),
  g('discipline', 8, 'ro-fang', 'Fang Dagger', 'weapon', 'dagger', '#5fd1c1', '#14121a', 'Venom-green and always cold.'),
  g('discipline', 8, 'ro-leathers', 'Shadowweave', 'armor', 'leather', '#1a1620', '#6b5f73', 'Light drinks into it.'),
  g('discipline', 15, 'ro-nightcloak', 'Nightfall Cloak', 'cloak', 'tattered', '#0f0d14', '#3b4a6b', 'Wear it and the lamps dim.'),
  g('discipline', 15, 'ro-hood', 'Cutpurse Hood', 'helm', 'hood', '#1e1a22', '#6b5f73', 'Seen by no one twice.'),
  g('discipline', 25, 'ro-crown', 'Circlet of Whispers', 'helm', 'circlet', '#3a3540', '#5fd1c1', 'Every secret in the room, at once.'),
  g('discipline', 25, 'ro-blade', 'Last Word', 'weapon', 'sword', '#1a1620', '#5fd1c1', 'Ends arguments.'),
  g('discipline', 25, 'ro-garb', 'Garb of the Unseen', 'armor', 'leather', '#0b0a10', '#a3202d', 'Stitched in the dark, by touch.'),

  // ── Spirit: herald pieces ────────────────────
  g('spirit', 3, 'st-herald-leather', 'Courtly Doublet', 'armor', 'leather', '#5e1219', '#e0a33a', 'Velvet over a knife-proof weave.'),
  g('spirit', 3, 'st-herald-circlet', 'Thin Circlet', 'helm', 'circlet', '#e0a33a', '#d13a48', 'A promise of a crown.'),
  g('spirit', 3, 'st-herald-lantern', 'Herald Lantern', 'weapon', 'lantern', '#8a5a17', '#f5c96a', 'Its light makes strangers kind.'),
  g('spirit', 8, 'he-doublet', 'Velvet Doublet', 'armor', 'leather', '#3a1420', '#e0a33a', 'Cut for audiences with kings.'),
  g('spirit', 8, 'he-cape', 'Herald’s Cape', 'cloak', 'long', '#e0a33a', '#7a1f2b', 'Gold enough to be heard.'),
  g('spirit', 8, 'he-tome', 'Book of Oaths', 'weapon', 'tome', '#5e1219', '#f5c96a', 'Every vow ever sworn to you.'),
  g('spirit', 15, 'he-helm', 'Gilded Sallet', 'helm', 'greathelm', '#c9b28a', '#a3202d', 'Polished to a mirror shine.'),
  g('spirit', 15, 'he-robe', 'Courtly Mantle', 'armor', 'robe', '#5e1219', '#e0a33a', 'Trails behind you like applause.'),
  g('spirit', 25, 'crown-ash', 'Crown of Ash', 'helm', 'crown', '#2a2328', '#ff4a5a', 'Worn by the last king of the hamlet.'),
  g('spirit', 25, 'he-cloak', 'Banner-Cloak', 'cloak', 'long', '#a3202d', '#f5c96a', 'A whole house’s colours on your back.'),
  g('spirit', 25, 'he-lantern', 'Lantern of Kings', 'weapon', 'lantern', '#e0a33a', '#fff0a0', 'Lit from the last royal hearth.'),
];

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(GEAR.map((i) => [i.id, i]));
export const SLOT_NAME: Record<Slot, string> = { helm: 'Helm', armor: 'Armor', cloak: 'Cloak', weapon: 'Weapon' };
export const SLOTS: Slot[] = ['helm', 'armor', 'cloak', 'weapon'];
