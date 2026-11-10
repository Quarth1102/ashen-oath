export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';
export type Slot = 'helm' | 'armor' | 'cloak' | 'weapon';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PenaltyStrength = 0 | 1 | 2 | 3;

export interface StatDef {
  id: string;
  name: string;
  icon: string; // key into the icon map
  color: string;
}

export interface Progress {
  level: number;
  xp: number; // xp inside the current level
}

export interface Appearance {
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  scar: string;
}

export interface Hero {
  name: string;
  title: string;
  backstory: string;
  /** earned class id: 'wanderer' | 'pure:<stat>' | 'hybrid:<a>+<b>' | 'paragon' */
  classId: string;
  /** every class ever reached (its gear kit is granted only once) */
  classesAttained?: string[];
  appearance: Appearance;
  equipped: Partial<Record<Slot, string>>;
  inventory: string[];
  titles: string[];
  level: number;
  xp: number;
  totalXp: number;
  hp: number;
  maxHp: number;
  gold: number;
  stats: Record<string, Progress>;
  createdDay: string;
}

/** What a single completion granted, stored so it can be undone exactly. */
export interface Reward {
  xp: number;
  gold: number;
  hp: number;
  stats: Record<string, number>;
  day: string;
}

export interface HabitCompletion extends Reward {
  prevStreak: number;
  prevBest: number;
}

export interface Habit {
  id: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  statIds: string[];
  polarity: 'good' | 'bad';
  frequency: 'daily' | 'weekly';
  days: number[]; // 0 = Sunday … 6 = Saturday (daily habits)
  perWeek: number; // weekly habits
  streak: number;
  bestStreak: number;
  history: Record<string, HabitCompletion>;
  slips: Record<string, number>;
  lastSlip?: { day: string; prevStreak: number; dmg: number };
  createdDay: string;
}

export interface Todo {
  id: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  statIds: string[];
  due?: string;
  done: boolean;
  doneDay?: string;
  reward?: Reward;
  createdDay: string;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  reward?: Reward;
}

export interface Goal {
  id: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  statIds: string[];
  due?: string;
  milestones: Milestone[];
  rewardTitle?: string;
  done: boolean;
  doneDay?: string;
  reward?: Reward;
  createdDay: string;
}

export type LogType =
  | 'complete'
  | 'slip'
  | 'penalty'
  | 'levelup'
  | 'fall'
  | 'loot'
  | 'purchase'
  | 'achievement'
  | 'goal'
  | 'system';

export interface LogEntry {
  id: string;
  ts: number;
  day: string;
  type: LogType;
  text: string;
}

export interface Settings {
  resetHour: number;
  penalty: PenaltyStrength;
  regionId: string | null; // null = follow highest unlocked region
}

export interface Counters {
  completions: number;
  todosDone: number;
  goalsDone: number;
  falls: number;
  purchases: number;
  slips: number;
  chestsOpened: number;
}

export interface GameState {
  version: 1;
  hero: Hero | null;
  statDefs: StatDef[];
  habits: Habit[];
  todos: Todo[];
  goals: Goal[];
  log: LogEntry[];
  achievements: Record<string, string>; // id -> day unlocked
  settings: Settings;
  lastProcessedDay: string | null;
  pendingChests: number;
  dayActivity: Record<string, number>;
  counters: Counters;
}

export type GameEvent =
  | { id: string; type: 'reward'; xp: number; gold: number; hp: number; source: string }
  | { id: string; type: 'levelup'; level: number; maxHp: number }
  | { id: string; type: 'statup'; statId: string; level: number }
  | { id: string; type: 'region'; regionId: string }
  | { id: string; type: 'chest' }
  | { id: string; type: 'achievement'; achievementId: string }
  | { id: string; type: 'damage'; hp: number; source: string }
  | { id: string; type: 'fall'; goldLost: number; xpLost: number }
  | { id: string; type: 'loot'; rarity: Rarity; itemId?: string; gold?: number }
  | { id: string; type: 'goal'; goalId: string; title?: string }
  | { id: string; type: 'dayreport'; missed: string[]; damage: number; days: number }
  | { id: string; type: 'classchange'; from: string; to: string; kit: string[] };

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<GameEvent, 'id'>;

export interface Ctx {
  now: Date;
  rng: () => number;
}
