import type { StatDef } from '../game/types';

export const DEFAULT_STATS: StatDef[] = [
  { id: 'strength', name: 'Strength', icon: 'sword', color: '#d13a48' },
  { id: 'vitality', name: 'Vitality', icon: 'heart', color: '#7fbf5a' },
  { id: 'intellect', name: 'Intellect', icon: 'book', color: '#5a8fd1' },
  { id: 'wisdom', name: 'Wisdom', icon: 'eye', color: '#5fd1c1' },
  { id: 'discipline', name: 'Discipline', icon: 'anvil', color: '#e0a33a' },
  { id: 'charisma', name: 'Charisma', icon: 'crown', color: '#b56ad1' },
];

export const STAT_COLORS = [
  '#d13a48', '#e0703a', '#e0a33a', '#c9c25a', '#7fbf5a', '#3fae8a',
  '#5fd1c1', '#5a8fd1', '#7a6ad1', '#b56ad1', '#d16aa3', '#b5ab9b',
];
