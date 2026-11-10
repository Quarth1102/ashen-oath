export type RegionFeature = 'hamlet' | 'woods' | 'marsh' | 'cathedral' | 'peaks';
export type ParticleKind = 'embers' | 'fireflies' | 'mist' | 'ash' | 'snow';

export interface Region {
  id: string;
  name: string;
  minLevel: number;
  lore: string;
  sky: [string, string];
  moon: string;
  far: string;
  mid: string;
  ground: string;
  accent: string;
  feature: RegionFeature;
  particle: ParticleKind;
}

export const REGIONS: Region[] = [
  {
    id: 'hamlet', name: 'Ashen Hamlet', minLevel: 1,
    lore: 'Where every oath begins. The hearths still burn, though the fields have long gone grey.',
    sky: ['#120c18', '#4a2630'], moon: '#ead9b0', far: '#2a1a28', mid: '#170f18', ground: '#120c12',
    accent: '#f0a840', feature: 'hamlet', particle: 'embers',
  },
  {
    id: 'woods', name: 'Gloomwood', minLevel: 5,
    lore: 'Pines older than kings. Lights drift between the trunks, and not all of them are friendly.',
    sky: ['#081214', '#1e3a36'], moon: '#d4ece4', far: '#11262a', mid: '#0a1719', ground: '#081210',
    accent: '#9ff0d0', feature: 'woods', particle: 'fireflies',
  },
  {
    id: 'marsh', name: 'Drowned Marsh', minLevel: 10,
    lore: 'A sunken realm of reeds and bells. The water remembers the drowned.',
    sky: ['#0e1219', '#2e3d3a'], moon: '#c8d6a8', far: '#1a2626', mid: '#101a19', ground: '#0c1312',
    accent: '#b4e07a', feature: 'marsh', particle: 'mist',
  },
  {
    id: 'cathedral', name: 'Bone Cathedral', minLevel: 20,
    lore: 'Beneath a blood moon, the faithful built with what the plague left behind.',
    sky: ['#12080e', '#44141f'], moon: '#e0404e', far: '#26101a', mid: '#13080e', ground: '#0e070b',
    accent: '#ff5a64', feature: 'cathedral', particle: 'ash',
  },
  {
    id: 'peaks', name: 'Obsidian Peaks', minLevel: 35,
    lore: 'The roof of the world. Those who reach it are not the same as those who began.',
    sky: ['#090b14', '#2c3150'], moon: '#ece8de', far: '#1c2034', mid: '#111422', ground: '#0b0d16',
    accent: '#ff8040', feature: 'peaks', particle: 'snow',
  },
];

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export function highestRegion(level: number): Region {
  return [...REGIONS].reverse().find((r) => level >= r.minLevel) ?? REGIONS[0];
}

export function regionsUnlockedBetween(fromLevel: number, toLevel: number): Region[] {
  return REGIONS.filter((r) => r.minLevel > fromLevel && r.minLevel <= toLevel);
}
