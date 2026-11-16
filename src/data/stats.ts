import type { StatDef } from '../game/types';

/** The four pillars. Fixed: every habit trains exactly one of them. */
export const DEFAULT_STATS: StatDef[] = [
  { id: 'body', name: 'Body', icon: 'sword', color: '#d13a48' },
  { id: 'mind', name: 'Mind', icon: 'book', color: '#5a8fd1' },
  { id: 'spirit', name: 'Spirit', icon: 'moon', color: '#b56ad1' },
  { id: 'discipline', name: 'Discipline', icon: 'shield', color: '#e0a33a' },
];

export const PILLAR_IDS = DEFAULT_STATS.map((d) => d.id);

/** What each pillar covers, shown in the editor and on the hero creator. */
export const PILLAR_BLURB: Record<string, string> = {
  body: 'Fitness, health, sleep, food',
  mind: 'Learning, reading, focus, craft',
  spirit: 'Calm, reflection, faith, connection',
  discipline: 'Self-control, routines, follow-through',
};

/** Old six stats → the pillar they became. */
export const STAT_MIGRATION: Record<string, string> = {
  strength: 'body',
  vitality: 'body',
  intellect: 'mind',
  wisdom: 'spirit',
  charisma: 'spirit',
  discipline: 'discipline',
  body: 'body',
  mind: 'mind',
  spirit: 'spirit',
};

export const STAT_COLORS = [
  '#d13a48', '#e0703a', '#e0a33a', '#c9c25a', '#7fbf5a', '#3fae8a',
  '#5fd1c1', '#5a8fd1', '#7a6ad1', '#b56ad1', '#d16aa3', '#b5ab9b',
];
