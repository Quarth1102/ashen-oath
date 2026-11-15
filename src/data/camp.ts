/** Camp upgrades (bought with gold, tier by tier), pets, and cosmetic options. */

export type UpgradeLineId = 'tent' | 'hearth' | 'banner' | 'rack' | 'lanterns' | 'dock';
export type PetId = 'raven' | 'cat' | 'wolf';
export type FireColor = 'ember' | 'spectral' | 'azure' | 'violet';
export type BannerSigil = 'sword' | 'skull' | 'moon' | 'crown' | 'flame';

export interface Tier {
  name: string;
  desc: string;
  price: number; // 0 for the free starting tier
  minLevel?: number;
  /** human-readable perk shown in the UI */
  perk?: string;
}

export interface UpgradeLine {
  id: UpgradeLineId;
  name: string;
  icon: string;
  /** tiers[0] is what you start with; for optional lines it is "none" */
  tiers: Tier[];
}

export const UPGRADES: UpgradeLine[] = [
  {
    id: 'tent', name: 'Tent', icon: 'tent',
    tiers: [
      { name: 'Ragged Tent', desc: 'Patched canvas and a leaning pole.', price: 0 },
      { name: 'Canvas Tent', desc: 'Taut, dry, and properly staked.', price: 150, perk: '+5 max HP' },
      { name: 'Hunter’s Pavilion', desc: 'Room to stand, and a pennant above.', price: 500, minLevel: 5, perk: '+10 max HP' },
      { name: 'War Pavilion', desc: 'A commander’s tent, trimmed in iron.', price: 1200, minLevel: 10, perk: '+15 max HP' },
    ],
  },
  {
    id: 'hearth', name: 'Hearth', icon: 'flame',
    tiers: [
      { name: 'Fire Pit', desc: 'A few stones and a stubborn flame.', price: 0 },
      { name: 'Stone Hearth', desc: 'A proper ring of fitted stones.', price: 120, perk: '+1 HP per habit' },
      { name: 'Cooking Spit', desc: 'Something is always roasting.', price: 400, minLevel: 4, perk: '+2 HP per habit' },
      { name: 'Iron Cauldron', desc: 'Stews, tinctures, and the occasional curse.', price: 900, minLevel: 8, perk: '+3 HP per habit' },
    ],
  },
  {
    id: 'banner', name: 'Banner', icon: 'flag',
    tiers: [
      { name: 'No banner', desc: '', price: 0 },
      { name: 'Banner Pole', desc: 'Your colours, raised for all to see.', price: 200, perk: '+5% gold' },
      { name: 'Grand Standard', desc: 'A tall standard with a gilded finial.', price: 700, minLevel: 8, perk: '+10% gold' },
    ],
  },
  {
    id: 'rack', name: 'Weapon Rack', icon: 'swords',
    tiers: [
      { name: 'No rack', desc: '', price: 0 },
      { name: 'Weapon Rack', desc: 'Blades oiled and ready.', price: 300, minLevel: 3, perk: '+3% XP' },
    ],
  },
  {
    id: 'lanterns', name: 'Lanterns', icon: 'sun',
    tiers: [
      { name: 'No lanterns', desc: '', price: 0 },
      { name: 'Lantern Posts', desc: 'Warm lights at the edge of camp.', price: 100 },
    ],
  },
  {
    id: 'dock', name: 'Fishing Dock', icon: 'waves',
    tiers: [
      { name: 'No dock', desc: '', price: 0 },
      { name: 'Fishing Dock', desc: 'A few planks out over the water.', price: 350, minLevel: 3 },
    ],
  },
];

export const UPGRADE_BY_ID: Record<UpgradeLineId, UpgradeLine> = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeLineId, UpgradeLine>;

export interface Pet {
  id: PetId;
  name: string;
  desc: string;
  price: number;
  minLevel?: number;
}

export const PETS: Pet[] = [
  { id: 'raven', name: 'Raven', desc: 'Clever, loud, and loyal to whoever feeds it.', price: 250 },
  { id: 'cat', name: 'Black Cat', desc: 'Considers the camp its own. You are tolerated.', price: 300 },
  { id: 'wolf', name: 'Wolf Pup', desc: 'Found alone in the Gloomwood. Not alone anymore.', price: 600, minLevel: 5 },
];

export const PET_BY_ID: Record<PetId, Pet> = Object.fromEntries(PETS.map((p) => [p.id, p])) as Record<PetId, Pet>;

export const TENT_COLORS = ['#6b5a44', '#4a3f35', '#2f2540', '#2c3a28', '#5e1219', '#2a3a5a', '#3a3540', '#8a7a62'];
export const BANNER_COLORS = ['#a3202d', '#e0a33a', '#2a3a5a', '#2c3a28', '#3a1420', '#5fd1c1', '#e8dfcf', '#14121a'];
export const SIGILS: BannerSigil[] = ['sword', 'skull', 'moon', 'crown', 'flame'];
export const FIRE_COLORS: { id: FireColor; name: string; colors: [string, string, string] }[] = [
  { id: 'ember', name: 'Ember', colors: ['#c8402a', '#f0a030', '#fff0a0'] },
  { id: 'spectral', name: 'Spectral', colors: ['#1f8a7a', '#5fd1c1', '#d8fff6'] },
  { id: 'azure', name: 'Azure', colors: ['#2a4ab0', '#5a8fd1', '#dfeaff'] },
  { id: 'violet', name: 'Witchfire', colors: ['#6a2a9a', '#b56ad1', '#f0d8ff'] },
];

export interface CampState {
  tiers: Partial<Record<UpgradeLineId, number>>; // index into tiers; missing = 0
  pets: PetId[];
  pet: PetId | null; // the one that follows you around
  tentColor: string;
  bannerColor: string;
  sigil: BannerSigil;
  fire: FireColor;
}

export const DEFAULT_CAMP: CampState = {
  tiers: {},
  pets: [],
  pet: null,
  tentColor: TENT_COLORS[0],
  bannerColor: BANNER_COLORS[0],
  sigil: 'sword',
  fire: 'ember',
};

export const tierOf = (c: CampState | undefined, id: UpgradeLineId) => c?.tiers[id] ?? 0;

/** Perk numbers, derived from the camp's tiers. */
export const campPerks = (c: CampState | undefined) => ({
  maxHp: [0, 5, 10, 15][tierOf(c, 'tent')] ?? 0,
  regen: tierOf(c, 'hearth'), // extra HP per habit completion
  gold: [0, 0.05, 0.1][tierOf(c, 'banner')] ?? 0,
  xp: tierOf(c, 'rack') ? 0.03 : 0,
});
