import type { GameState } from '../game/types';
import { activeStreak } from '../game/streaks';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  gold: number;
  title?: string;
  check: (s: GameState, today: string) => boolean;
}

const bestHabitStreak = (s: GameState) => s.habits.reduce((m, h) => Math.max(m, h.bestStreak), 0);
const bestStat = (s: GameState) => Math.max(0, ...Object.values(s.hero?.stats ?? {}).map((p) => p.level));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', desc: 'Complete your first deed.', icon: 'droplet', gold: 10, check: (s) => s.counters.completions >= 1 },
  { id: 'deeds_50', name: 'Weathered', desc: 'Complete 50 deeds.', icon: 'swords', gold: 50, check: (s) => s.counters.completions >= 50 },
  { id: 'deeds_250', name: 'Legend of the Roads', desc: 'Complete 250 deeds.', icon: 'scroll', gold: 200, title: 'the Tireless', check: (s) => s.counters.completions >= 250 },
  { id: 'streak_3', name: 'Kindled', desc: 'Reach a 3-day habit streak.', icon: 'flame', gold: 15, check: (s) => bestHabitStreak(s) >= 3 },
  { id: 'streak_7', name: 'Week of Iron', desc: 'Reach a 7-day habit streak.', icon: 'flame', gold: 40, title: 'the Steadfast', check: (s) => bestHabitStreak(s) >= 7 },
  { id: 'streak_30', name: 'Moon’s Turning', desc: 'Reach a 30-day habit streak.', icon: 'moon', gold: 200, title: 'the Relentless', check: (s) => bestHabitStreak(s) >= 30 },
  { id: 'active_7', name: 'Hearthkeeper', desc: 'Be active 7 days in a row.', icon: 'tent', gold: 40, check: (s, t) => activeStreak(s.dayActivity, t) >= 7 },
  { id: 'level_5', name: 'Into the Gloom', desc: 'Reach level 5.', icon: 'trees', gold: 50, check: (s) => (s.hero?.level ?? 0) >= 5 },
  { id: 'level_10', name: 'Marsh-Wader', desc: 'Reach level 10.', icon: 'waves', gold: 100, title: 'the Tested', check: (s) => (s.hero?.level ?? 0) >= 10 },
  { id: 'level_20', name: 'Under the Blood Moon', desc: 'Reach level 20.', icon: 'church', gold: 250, check: (s) => (s.hero?.level ?? 0) >= 20 },
  { id: 'level_35', name: 'Roof of the World', desc: 'Reach level 35.', icon: 'mountain', gold: 600, title: 'the Ascended', check: (s) => (s.hero?.level ?? 0) >= 35 },
  { id: 'stat_5', name: 'Honed', desc: 'Raise any stat to level 5.', icon: 'sparkles', gold: 40, check: (s) => bestStat(s) >= 5 },
  { id: 'stat_10', name: 'Paragon', desc: 'Raise any stat to level 10.', icon: 'gem', gold: 150, title: 'the Paragon', check: (s) => bestStat(s) >= 10 },
  { id: 'goal_1', name: 'Quest’s End', desc: 'Complete a goal quest.', icon: 'flag', gold: 50, check: (s) => s.counters.goalsDone >= 1 },
  { id: 'goal_5', name: 'Saga-Maker', desc: 'Complete 5 goal quests.', icon: 'castle', gold: 250, title: 'the Saga-Maker', check: (s) => s.counters.goalsDone >= 5 },
  { id: 'todo_25', name: 'Errand-Runner', desc: 'Finish 25 to-dos.', icon: 'check', gold: 60, check: (s) => s.counters.todosDone >= 25 },
  { id: 'fallen', name: 'Risen from Ash', desc: 'Fall in battle and rise again.', icon: 'skull', gold: 25, title: 'the Twice-Born', check: (s) => s.counters.falls >= 1 },
  { id: 'shopper', name: 'Coin Well Spent', desc: 'Buy something from the Market.', icon: 'coins', gold: 10, check: (s) => s.counters.purchases >= 1 },
  { id: 'collector', name: 'Hoarder', desc: 'Own 12 pieces of gear.', icon: 'package', gold: 150, check: (s) => (s.hero?.inventory.length ?? 0) >= 12 },
  { id: 'chest_1', name: 'Lucky Find', desc: 'Open a loot chest.', icon: 'gift', gold: 10, check: (s) => s.counters.chestsOpened >= 1 },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
