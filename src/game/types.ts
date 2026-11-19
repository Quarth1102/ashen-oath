import type { CampState } from '../data/camp';

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
  /** how many times it can be logged per day: undefined/1 = once, 0 = unlimited */
  perDay?: number;
  /** paused habits are hidden from Camp and never penalised; history and streaks are kept */
  paused?: boolean;
  streak: number;
  bestStreak: number;
  /** the first log of each day: this is what counts for due days, streaks and penalties */
  history: Record<string, HabitCompletion>;
  /** additional logs beyond the first on a day (repeatable habits) */
  extra?: Record<string, Reward[]>;
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

export interface DailyQuest {
  id: string;
  /** challenge: a fresh task · boost: a harder version of a habit · count: N deeds of a pillar (auto-tracked) */
  kind: 'challenge' | 'boost' | 'count';
  pillar: string;
  title: string;
  detail: string;
  habitId?: string;
  target?: number;
  progress?: number;
  xp: number;
  done: boolean;
  reward?: Reward;
}

export interface DailyQuestLine {
  day: string;
  quests: DailyQuest[];
  rerolls: number;
  /** bonus for finishing all of them */
  bonus?: Reward;
  bonusChest?: boolean;
}

export interface ReviewItem {
  /** `${habitId}@${day}` for a daily habit, `${habitId}@${sunday}#${n}` for the n-th missing weekly session */
  key: string;
  habitId: string;
  day: string;
  title: string;
  difficulty: Difficulty;
  kind: 'daily' | 'weekly';
  /** weekly: which missing session this is, and how many are missing */
  session?: number;
  missing?: number;
}

export interface Review {
  /** the day the review was raised on (today at the time) */
  through: string;
  items: ReviewItem[];
}

export interface Settings {
  resetHour: number;
  penalty: PenaltyStrength;
  /** ask "did you do these?" before applying penalties for unmarked habits (default on) */
  reviewMissed?: boolean;
  /** show the one-time 'stats reforged into pillars' notice */
  pillarsNotice?: boolean;
  /** when the chronicle was last saved to a backup file (ISO time) */
  lastBackup?: string;
  /** don't nudge about backups until this day */
  backupSnoozeUntil?: string;
  /** ids of collapsed list sections, e.g. "quests:habit:strength" */
  collapsed?: string[];
  /** vacation mode: no penalties, reviews or streak changes from `since` (to `until`, if set) */
  vacation?: { since: string; until?: string } | null;
  sound?: boolean; // sound effects (default on)
  ambient?: boolean; // ambient camp sounds (default on)
  volume?: number; // 0..1, ambient volume
  haptics?: boolean; // vibration (default on)
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
  /** unmarked habits waiting for the player to confirm before penalties apply */
  pendingReview?: Review | null;
  pendingChests: number;
  dayActivity: Record<string, number>;
  /** per-day totals, for the weekly chronicle */
  dayXp?: Record<string, number>;
  dayGold?: Record<string, number>;
  dayStats?: Record<string, Record<string, number>>;
  /** days where every due habit was done, with the bonus granted (so it can be revoked on undo) */
  perfectDays?: Record<string, Reward>;
  /** days spent in vacation mode */
  vacationDays?: Record<string, true>;
  /** consecutive quick completions */
  combo?: { count: number; lastTs: number };
  camp?: CampState;
  /** Monday of the week the last weekly recap was shown for */
  lastRecapWeek?: string;
  /** today's generated quests */
  dailyQuests?: DailyQuestLine | null;
  /** how many full daily quest lines were finished */
  questLinesDone?: number;
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
  | { id: string; type: 'classchange'; from: string; to: string; kit: string[] }
  | { id: string; type: 'combo'; count: number }
  | { id: string; type: 'perfectday'; xp: number }
  | { id: string; type: 'weeklyrecap'; week: string }
  | { id: string; type: 'wardrobe'; items: string[] }
  | { id: string; type: 'questline' };

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<GameEvent, 'id'>;

export interface Ctx {
  now: Date;
  rng: () => number;
}
