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

export interface GearItem {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  price: number;
  minLevel: number;
  desc: string;
  look: GearLook;
  /** +pct XP to a stat id when equipped (only applies if that stat exists). */
  bonus?: { stat: string; pct: number };
  starter?: boolean;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b5ab9b',
  rare: '#5a8fd1',
  epic: '#b56ad1',
  legendary: '#e0a33a',
};

const g = (
  id: string, name: string, slot: Slot, rarity: Rarity, price: number, minLevel: number,
  desc: string, style: GearLook['style'], color: string, trim: string,
  bonus?: GearItem['bonus'], starter = false,
): GearItem => ({ id, name, slot, rarity, price, minLevel, desc, look: { style, color, trim }, bonus, starter });

export const GEAR: GearItem[] = [
  // ── Starter kits ─────────────────────────────
  g('st-knight-armor', 'Dented Plate', 'armor', 'common', 0, 1, 'Plate that has seen too many winters.', 'plate', '#6b6f78', '#a08a5a', undefined, true),
  g('st-knight-sword', 'Oath Blade', 'weapon', 'common', 0, 1, 'Notched, but true.', 'sword', '#b8bcc4', '#a08a5a', undefined, true),
  g('st-witch-robe', 'Hedge Robe', 'armor', 'common', 0, 1, 'Smells of nightshade.', 'robe', '#2f2540', '#5fd1c1', undefined, true),
  g('st-witch-hood', 'Witch Hood', 'helm', 'common', 0, 1, 'Deep enough to hide a secret.', 'hood', '#241c30', '#5fd1c1', undefined, true),
  g('st-witch-staff', 'Rowan Staff', 'weapon', 'common', 0, 1, 'A bound spark sleeps in the knot.', 'staff', '#5a3e2b', '#5fd1c1', undefined, true),
  g('st-rogue-leather', 'Night Leathers', 'armor', 'common', 0, 1, 'Quiet as a held breath.', 'leather', '#3a2c26', '#6b5f73', undefined, true),
  g('st-rogue-cloak', 'Alley Cloak', 'cloak', 'common', 0, 1, 'Grey as a city at dawn.', 'short', '#2a2a30', '#6b5f73', undefined, true),
  g('st-rogue-dagger', 'Kiss of Iron', 'weapon', 'common', 0, 1, 'Short, sharp, sincere.', 'dagger', '#b8bcc4', '#7a1f2b', undefined, true),
  g('st-necro-robe', 'Grave Robe', 'armor', 'common', 0, 1, 'Embroidered with names of the dead.', 'robe', '#1c1a1e', '#9fd16a', undefined, true),
  g('st-necro-tome', 'Ledger of Bones', 'weapon', 'common', 0, 1, 'Every page a promise.', 'tome', '#3a2a1e', '#9fd16a', undefined, true),
  g('st-warden-chain', 'Warden Mail', 'armor', 'common', 0, 1, 'Rings forged in the old forest.', 'chain', '#5a6058', '#5c6b4a', undefined, true),
  g('st-warden-axe', 'Woodsplitter', 'weapon', 'common', 0, 1, 'For kindling, and for wolves.', 'axe', '#9aa0a8', '#5a3e2b', undefined, true),
  g('st-warden-cloak', 'Moss Cloak', 'cloak', 'common', 0, 1, 'Never quite dry.', 'long', '#2c3a28', '#5c6b4a', undefined, true),
  g('st-herald-leather', 'Courtly Doublet', 'armor', 'common', 0, 1, 'Velvet over a knife-proof weave.', 'leather', '#5e1219', '#e0a33a', undefined, true),
  g('st-herald-circlet', 'Thin Circlet', 'helm', 'common', 0, 1, 'A promise of a crown.', 'circlet', '#e0a33a', '#d13a48', undefined, true),
  g('st-herald-lantern', 'Herald Lantern', 'weapon', 'common', 0, 1, 'Its light makes strangers kind.', 'lantern', '#8a5a17', '#f5c96a', undefined, true),

  // ── Helms ───────────────────────────────────
  g('hood-pilgrim', 'Pilgrim Hood', 'helm', 'common', 60, 1, 'Woven for long roads.', 'hood', '#4a3f35', '#8a7a62', { stat: 'wisdom', pct: 5 }),
  g('helm-iron', 'Iron Greathelm', 'helm', 'rare', 160, 3, 'The world narrows to a slit.', 'greathelm', '#6b6f78', '#a3202d', { stat: 'strength', pct: 8 }),
  g('mask-plague', 'Plague Mask', 'helm', 'rare', 180, 4, 'Herbs in the beak keep the rot away.', 'mask', '#d8cfbf', '#2a2430', { stat: 'vitality', pct: 8 }),
  g('helm-horned', 'Horned Helm', 'helm', 'epic', 420, 8, 'Taken from something that walked upright.', 'horned', '#3a3540', '#e8dfcf', { stat: 'strength', pct: 12 }),
  g('circlet-seer', 'Seer Circlet', 'helm', 'epic', 400, 8, 'The gem sees what you will not.', 'circlet', '#b5ab9b', '#5fd1c1', { stat: 'intellect', pct: 12 }),
  g('crown-ash', 'Crown of Ash', 'helm', 'legendary', 1100, 15, 'Worn by the last king of the hamlet.', 'crown', '#2a2328', '#ff4a5a', { stat: 'charisma', pct: 20 }),

  // ── Armor ───────────────────────────────────
  g('armor-padded', 'Padded Gambeson', 'armor', 'common', 70, 1, 'Humble, warm, honest.', 'leather', '#6b5a44', '#4a3a2a', { stat: 'vitality', pct: 5 }),
  g('armor-mail', 'Riveted Mail', 'armor', 'rare', 170, 3, 'Each ring a small vow.', 'chain', '#7a808a', '#3a3540', { stat: 'discipline', pct: 8 }),
  g('robe-scholar', 'Scholar Robe', 'armor', 'rare', 160, 3, 'Ink-stained cuffs, candle-scorched hem.', 'robe', '#2a3a5a', '#c9b28a', { stat: 'intellect', pct: 8 }),
  g('plate-blackened', 'Blackened Plate', 'armor', 'epic', 450, 8, 'Quenched in a river of tar.', 'plate', '#26222a', '#a3202d', { stat: 'strength', pct: 12 }),
  g('robe-vesper', 'Vesper Vestments', 'armor', 'epic', 430, 8, 'Sung over at every dusk.', 'robe', '#3a1420', '#e0a33a', { stat: 'wisdom', pct: 12 }),
  g('plate-dawn', 'Plate of the Last Dawn', 'armor', 'legendary', 1200, 15, 'It remembers the sun.', 'plate', '#c9b28a', '#f5c96a', { stat: 'discipline', pct: 20 }),

  // ── Cloaks ──────────────────────────────────
  g('cloak-wool', 'Wool Mantle', 'cloak', 'common', 50, 1, 'Thick, plain, and loyal.', 'long', '#4a3a30', '#8a7a62', { stat: 'vitality', pct: 5 }),
  g('cloak-crimson', 'Crimson Cape', 'cloak', 'rare', 150, 3, 'You will be seen.', 'long', '#7a1f2b', '#e0a33a', { stat: 'charisma', pct: 8 }),
  g('cloak-raven', 'Raven Shroud', 'cloak', 'rare', 160, 4, 'Feathers whisper as you pass.', 'tattered', '#14121a', '#3b4a6b', { stat: 'wisdom', pct: 8 }),
  g('cloak-grave', 'Gravewalker Cloak', 'cloak', 'epic', 400, 8, 'Stitched from burial shrouds.', 'tattered', '#3a3a32', '#9fd16a', { stat: 'discipline', pct: 12 }),
  g('cloak-ember', 'Emberweave Cloak', 'cloak', 'legendary', 1000, 15, 'Its hem never stops smouldering.', 'long', '#2a1410', '#ff7a3a', { stat: 'strength', pct: 20 }),

  // ── Weapons ─────────────────────────────────
  g('sword-long', 'Longsword', 'weapon', 'common', 80, 1, 'Reliable steel.', 'sword', '#b8bcc4', '#5a3e2b', { stat: 'strength', pct: 5 }),
  g('tome-hymns', 'Book of Hymns', 'weapon', 'common', 70, 1, 'Half the pages are prayers, half are warnings.', 'tome', '#5a2a2a', '#e0a33a', { stat: 'wisdom', pct: 5 }),
  g('lantern-ghost', 'Ghostlight Lantern', 'weapon', 'rare', 170, 3, 'Burns without oil.', 'lantern', '#3a3540', '#5fd1c1', { stat: 'intellect', pct: 8 }),
  g('axe-bearded', 'Bearded Axe', 'weapon', 'rare', 180, 4, 'Hooked to pull down shields.', 'axe', '#8a9098', '#3a2a1e', { stat: 'discipline', pct: 8 }),
  g('staff-bone', 'Bone Staff', 'weapon', 'epic', 440, 8, 'Carved from a giant’s femur.', 'staff', '#d8cfbf', '#ff4a5a', { stat: 'intellect', pct: 12 }),
  g('scythe-reaper', 'Reaper’s Scythe', 'weapon', 'epic', 480, 10, 'It has harvested more than wheat.', 'scythe', '#2a2430', '#b8bcc4', { stat: 'strength', pct: 12 }),
  g('sword-oathbreaker', 'Oathbreaker', 'weapon', 'legendary', 1300, 15, 'A blade that remembers every promise broken.', 'sword', '#3a1420', '#ff4a5a', { stat: 'discipline', pct: 20 }),
];

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(GEAR.map((i) => [i.id, i]));
export const SLOT_NAME: Record<Slot, string> = { helm: 'Helm', armor: 'Armor', cloak: 'Cloak', weapon: 'Weapon' };
export const SLOTS: Slot[] = ['helm', 'armor', 'cloak', 'weapon'];
