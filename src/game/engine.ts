/**
 * Pure game engine. Every action takes a GameState and returns a new GameState plus
 * the UI events it produced. No I/O, no Date.now(), no Math.random() — those come via Ctx.
 */
import type {
  Appearance, Ctx, Difficulty, GameEvent, GameState, Goal, Habit, Hero, LogType, NewEvent,
  Reward, ReviewItem, Slot, StatDef, Todo,
} from './types';
import { addDays, dayKey, weekday, weekStart } from './dates';
import { BASE_XP, addXp, heroXpToNext, maxHpFor, splitXp, statXpToNext, streakMultiplier } from './xp';
import { FALL_GOLD_LOSS, damageFor, regenFor } from './penalty';
import { LOOT_CHANCE, RARITY_GOLD, goldFor, rollRarity } from './economy';
import { GEAR_BY_ID } from '../data/gear';
import { availableGear, canWear, rankSet } from './wardrobe';
import { classBonus, determineClassId, normalizeClassId, resolveClass, CLASS_UNLOCK_LEVEL } from './classes';
import { ACHIEVEMENTS } from '../data/achievements';
import { regionsUnlockedBetween } from '../data/regions';
import { DEFAULT_CAMP, PET_BY_ID, UPGRADE_BY_ID, campPerks, tierOf, type CampState, type PetId, type UpgradeLineId } from '../data/camp';
import { DEFAULT_STATS } from '../data/stats';

export interface Result {
  state: GameState;
  events: GameEvent[];
}

let uid = 0;
export const newId = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${(uid++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export const LOG_LIMIT = 400;
export const CATCHUP_DAYS = 7;
export const MILESTONE_MULT = 2;
export const GOAL_MULT = 10;

export function initialState(): GameState {
  return {
    version: 1,
    hero: null,
    statDefs: DEFAULT_STATS.map((s) => ({ ...s })),
    habits: [],
    todos: [],
    goals: [],
    log: [],
    achievements: {},
    settings: { resetHour: 4, penalty: 2, regionId: null, reviewMissed: true },
    lastProcessedDay: null,
    pendingChests: 0,
    dayActivity: {},
    counters: { completions: 0, todosDone: 0, goalsDone: 0, falls: 0, purchases: 0, slips: 0, chestsOpened: 0 },
  };
}

/* ───────────────────────────── internals ───────────────────────────── */

class Tx {
  s: GameState;
  events: GameEvent[] = [];
  today: string;
  constructor(state: GameState, public ctx: Ctx) {
    this.s = structuredClone(state);
    this.today = dayKey(ctx.now, this.s.settings.resetHour);
  }
  get hero(): Hero {
    if (!this.s.hero) throw new Error('No hero');
    return this.s.hero;
  }
  emit(e: NewEvent) {
    this.events.push({ ...e, id: newId('ev') } as GameEvent);
  }
  log(type: LogType, text: string) {
    this.s.log.unshift({ id: newId('log'), ts: this.ctx.now.getTime(), day: this.today, type, text });
    if (this.s.log.length > LOG_LIMIT) this.s.log.length = LOG_LIMIT;
  }
  done(): Result {
    return { state: this.s, events: this.events };
  }
}

/** Class XP bonus (gear is purely cosmetic). */
function xpBonus(s: GameState, hero: Hero, statId: string): number {
  return classBonus(resolveClass(hero.classId, s.statDefs), statId);
}

/** Take off anything the hero's rank and level no longer allow. */
function enforceWardrobe(tx: Tx) {
  const hero = tx.s.hero;
  if (!hero) return;
  for (const [slot, id] of Object.entries(hero.equipped)) {
    if (id && !canWear(hero, tx.s.statDefs, id)) delete hero.equipped[slot as Slot];
  }
}

const gearIds = (s: GameState) => (s.hero ? new Set(availableGear(s.hero, s.statDefs).map((i) => i.id)) : new Set<string>());

function applyHeroXp(tx: Tx, amount: number): number {
  const hero = tx.hero;
  const before = hero.level;
  const r = addXp({ level: hero.level, xp: hero.xp }, amount, heroXpToNext);
  hero.level = r.level;
  hero.xp = r.xp;
  hero.totalXp = Math.max(0, hero.totalXp + amount);
  hero.maxHp = maxHpFor(hero.level) + campPerks(tx.s.camp).maxHp;
  if (r.gained > 0) {
    hero.hp = hero.maxHp; // a level-up restores you fully
    tx.emit({ type: 'levelup', level: hero.level, maxHp: hero.maxHp });
    tx.log('levelup', `Reached level ${hero.level}.`);
    for (const region of regionsUnlockedBetween(before, hero.level)) {
      tx.emit({ type: 'region', regionId: region.id });
      tx.log('system', `Discovered ${region.name}.`);
    }
  }
  hero.hp = Math.min(hero.hp, hero.maxHp);
  return r.gained;
}

/**
 * Re-derive the hero's class from their stats. Runs at each new day and each level-up.
 * Does nothing below the unlock level, so a hero is never demoted back to Wanderer.
 */
function evaluateClass(tx: Tx) {
  const hero = tx.s.hero;
  if (!hero || hero.level < CLASS_UNLOCK_LEVEL) return;
  const current = normalizeClassId(hero.classId);
  const next = determineClassId(tx.s.statDefs, hero.stats, hero.level);
  if (next === 'wanderer' || next === current) {
    if (hero.classId !== current) hero.classId = current; // migrate legacy ids quietly
    return;
  }
  const from = resolveClass(current, tx.s.statDefs);
  const to = resolveClass(next, tx.s.statDefs);
  const before = gearIds(tx.s);
  hero.classId = next;
  const attained = (hero.classesAttained ??= []);
  if (!attained.includes(next)) attained.push(next);
  // the new rank's wardrobe: pieces the hero couldn't wear before; old-rank pieces come off
  const kit = [...gearIds(tx.s)].filter((id) => !before.has(id));
  enforceWardrobe(tx);
  if (!hero.titles.includes(to.epithet)) hero.titles.push(to.epithet);
  if (hero.title === from.epithet || hero.title === 'the Oathsworn') hero.title = to.epithet;
  tx.emit({ type: 'classchange', from: current, to: next, kit });
  tx.log('system', from.kind === 'wanderer' ? `Awakened as a ${to.name}.` : `Became a ${to.name} (was ${from.name}).`);
}

function applyStatXp(tx: Tx, statId: string, amount: number) {
  const hero = tx.hero;
  const p = hero.stats[statId] ?? { level: 1, xp: 0 };
  const r = addXp(p, amount, statXpToNext);
  hero.stats[statId] = { level: r.level, xp: r.xp };
  if (r.gained > 0) tx.emit({ type: 'statup', statId, level: r.level });
}

export const COMBO_WINDOW_MS = 5 * 60_000;
export const COMBO_STEP = 0.05;
export const COMBO_MAX_STEPS = 5; // up to +25% XP
export const comboBonus = (count: number) => Math.min(Math.max(count - 1, 0), COMBO_MAX_STEPS) * COMBO_STEP;

interface GrantOpts {
  regen?: number;
  day?: string;
  /** a live completion: builds the combo */
  live?: boolean;
  /** no 'reward' event (no chime / floating text), e.g. background Discipline bonuses */
  quiet?: boolean;
  /** counts as a deed (activity, completions, loot). False for bonuses. */
  deed?: boolean;
}

function grantReward(tx: Tx, base: number, statIds: string[], source: string, opts: GrantOpts = {}): Reward {
  const { regen = 0, day = tx.today, live = true, deed = true, quiet = false } = opts;
  const hero = tx.hero;
  const perks = campPerks(tx.s.camp);
  let mult = 1 + perks.xp;
  if (live && deed) {
    const now = tx.ctx.now.getTime();
    const c = tx.s.combo;
    const count = c && now - c.lastTs <= COMBO_WINDOW_MS ? c.count + 1 : 1;
    tx.s.combo = { count, lastTs: now };
    mult += comboBonus(count);
    if (count >= 2) tx.emit({ type: 'combo', count });
  }
  base *= mult;
  const valid = statIds.filter((id) => tx.s.statDefs.some((d) => d.id === id));
  const stats: Record<string, number> = {};
  let total = 0;
  if (valid.length) {
    splitXp(Math.round(base), valid.length).forEach((part, i) => {
      const id = valid[i];
      const gain = Math.round(part * (1 + xpBonus(tx.s, hero, id)));
      stats[id] = gain;
      total += gain;
    });
  } else {
    total = Math.round(base);
  }
  const gold = Math.round(goldFor(total) * (1 + perks.gold));

  const gearBefore = gearIds(tx.s);
  const leveled = applyHeroXp(tx, total) > 0;
  for (const [id, gain] of Object.entries(stats)) applyStatXp(tx, id, gain);
  if (leveled) {
    evaluateClass(tx);
    const fresh = [...gearIds(tx.s)].filter((id) => !gearBefore.has(id));
    if (fresh.length && !tx.events.some((e) => e.type === 'classchange')) {
      tx.emit({ type: 'wardrobe', items: fresh });
      tx.log('system', `New gear unlocked: ${fresh.map((id) => GEAR_BY_ID[id].name).join(', ')}.`);
    }
  }
  hero.gold += gold;

  const hpBefore = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + (regen > 0 ? regen + perks.regen : 0));
  const hp = hero.hp - hpBefore;

  const s = tx.s;
  (s.dayXp ??= {})[day] = (s.dayXp[day] ?? 0) + total;
  (s.dayGold ??= {})[day] = (s.dayGold[day] ?? 0) + gold;
  const ds = ((s.dayStats ??= {})[day] ??= {});
  for (const [id, gain] of Object.entries(stats)) ds[id] = (ds[id] ?? 0) + gain;

  if (deed) {
    s.dayActivity[day] = (s.dayActivity[day] ?? 0) + 1;
    s.counters.completions++;
    if (tx.ctx.rng() < LOOT_CHANCE) {
      s.pendingChests++;
      tx.emit({ type: 'chest' });
    }
  }
  if (!quiet) tx.emit({ type: 'reward', xp: total, gold, hp, source });
  tx.log('complete', `${source} (+${total} XP, +${gold} gold)`);
  return { xp: total, gold, hp, stats, day };
}

function revokeReward(tx: Tx, r: Reward, deed = true) {
  const hero = tx.hero;
  const s = tx.s;
  applyHeroXp(tx, -r.xp);
  for (const [id, gain] of Object.entries(r.stats)) {
    if (hero.stats[id]) applyStatXp(tx, id, -gain);
  }
  hero.gold = Math.max(0, hero.gold - r.gold);
  hero.hp = Math.max(1, hero.hp - r.hp);
  if (s.dayXp?.[r.day]) s.dayXp[r.day] = Math.max(0, s.dayXp[r.day] - r.xp);
  if (s.dayGold?.[r.day]) s.dayGold[r.day] = Math.max(0, s.dayGold[r.day] - r.gold);
  const ds = s.dayStats?.[r.day];
  if (ds) for (const [id, gain] of Object.entries(r.stats)) if (ds[id]) ds[id] = Math.max(0, ds[id] - gain);
  if (!deed) return;
  if (s.dayActivity[r.day]) {
    s.dayActivity[r.day]--;
    if (s.dayActivity[r.day] <= 0) delete s.dayActivity[r.day];
  }
  s.counters.completions = Math.max(0, s.counters.completions - 1);
}

/* ───────────────────────────── perfect day ───────────────────────────── */

export const PERFECT_DAY_XP = 50;

/** Daily habits with a penalty on `day` (the ones a perfect day requires). */
export function dueOnDay(s: GameState, day: string): Habit[] {
  return s.habits.filter(
    (h) => h.polarity === 'good' && !h.paused && h.frequency === 'daily' && h.days.includes(weekday(day)) && h.createdDay <= day,
  );
}

export function isPerfectDay(s: GameState, day: string): boolean {
  const due = dueOnDay(s, day);
  return due.length > 0 && due.every((h) => h.history[day]);
}

/* ───────────────────────────── discipline from consistency ───────────────────────────── */

export const DISCIPLINE_PERFECT_DAY = 10;
export const DISCIPLINE_STREAK = 15;
export const DISCIPLINE_CLEAN_DAY = 2;
const DAILY_MILESTONES = [7, 14, 30, 60, 100, 200, 365];
const WEEKLY_MILESTONES = [4, 8, 12, 26, 52];

/** Discipline grows on its own from showing up: perfect days, streak milestones, clean days. */
function grantDiscipline(tx: Tx, amount: number, source: string, day = tx.today): Reward | null {
  if (!tx.s.hero || !tx.s.statDefs.some((d) => d.id === 'discipline')) return null;
  return grantReward(tx, amount, ['discipline'], source, { day, live: false, deed: false, quiet: true });
}

/** Call right after a streak goes up. */
function streakMilestone(tx: Tx, h: Habit, day = tx.today) {
  const marks = h.frequency === 'weekly' && h.polarity === 'good' ? WEEKLY_MILESTONES : DAILY_MILESTONES;
  if (marks.includes(h.streak)) grantDiscipline(tx, DISCIPLINE_STREAK, `${h.title}: ${h.streak}-${h.frequency === 'weekly' && h.polarity === 'good' ? 'week' : 'day'} streak`, day);
}

function mergeRewards(a: Reward, b: Reward | null): Reward {
  if (!b) return a;
  const stats = { ...a.stats };
  for (const [k, v] of Object.entries(b.stats)) stats[k] = (stats[k] ?? 0) + v;
  return { xp: a.xp + b.xp, gold: a.gold + b.gold, hp: a.hp + b.hp, stats, day: a.day };
}

/** Grants (or, after an undo, revokes) today's perfect-day bonus: XP spread evenly over every stat, plus Discipline. */
function checkPerfectDay(tx: Tx) {
  const s = tx.s;
  const day = tx.today;
  const pd = (s.perfectDays ??= {});
  const perfect = isPerfectDay(s, day);
  if (perfect && !pd[day]) {
    const spread = grantReward(tx, PERFECT_DAY_XP, s.statDefs.map((d) => d.id), 'Perfect Day', { live: false, deed: false });
    pd[day] = mergeRewards(spread, grantDiscipline(tx, DISCIPLINE_PERFECT_DAY, 'Perfect Day: Discipline'));
    tx.emit({ type: 'perfectday', xp: pd[day].xp });
  } else if (!perfect && pd[day]) {
    revokeReward(tx, pd[day], false);
    delete pd[day];
  }
}

/* ───────────────────────────── vacation ───────────────────────────── */

export function onVacation(s: GameState, day: string): boolean {
  if (s.vacationDays?.[day]) return true;
  const v = s.settings.vacation;
  return !!v && day >= v.since && (!v.until || day <= v.until);
}

/** True if any day of the week ending on `sunday` (up to `sunday`) was a vacation day. */
function weekTouchedByVacation(s: GameState, sunday: string): boolean {
  for (let d = weekStart(sunday); d <= sunday; d = addDays(d, 1)) if (onVacation(s, d)) return true;
  return false;
}

export function startVacation(state: GameState, until: string | undefined, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  tx.s.settings.vacation = { since: tx.today, until: until || undefined };
  (tx.s.vacationDays ??= {})[tx.today] = true;
  tx.log('system', until ? `Set out on a journey until ${until}.` : 'Set out on a journey.');
  return tx.done();
}

export function endVacation(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  if (!tx.s.settings.vacation) return tx.done();
  (tx.s.vacationDays ??= {})[tx.today] = true; // today stays protected
  tx.s.settings.vacation = null;
  tx.log('system', 'Returned to camp.');
  return tx.done();
}

/** Returns true if the hero fell. */
function applyDamage(tx: Tx, dmg: number, source: string): boolean {
  if (dmg <= 0) return false;
  const hero = tx.hero;
  hero.hp -= dmg;
  tx.emit({ type: 'damage', hp: dmg, source });
  tx.log('penalty', `${source} (−${dmg} HP)`);
  if (hero.hp <= 0) {
    const goldLost = Math.floor(hero.gold * FALL_GOLD_LOSS);
    const xpLost = hero.xp;
    hero.gold -= goldLost;
    hero.totalXp = Math.max(0, hero.totalXp - xpLost);
    hero.xp = 0;
    hero.hp = hero.maxHp;
    tx.s.counters.falls++;
    tx.emit({ type: 'fall', goldLost, xpLost });
    tx.log('fall', `Fell in darkness. Lost ${goldLost} gold and ${xpLost} XP, then rose again.`);
    return true;
  }
  return false;
}

function checkAchievements(tx: Tx) {
  if (!tx.s.hero) return;
  for (const a of ACHIEVEMENTS) {
    if (tx.s.achievements[a.id]) continue;
    if (!a.check(tx.s, tx.today)) continue;
    tx.s.achievements[a.id] = tx.today;
    tx.hero.gold += a.gold;
    if (a.title && !tx.hero.titles.includes(a.title)) tx.hero.titles.push(a.title);
    tx.emit({ type: 'achievement', achievementId: a.id });
    tx.log('achievement', `Achievement: ${a.name} (+${a.gold} gold)`);
  }
}

const findHabit = (s: GameState, id: string) => s.habits.find((h) => h.id === id);
const findTodo = (s: GameState, id: string) => s.todos.find((t) => t.id === id);
const findGoal = (s: GameState, id: string) => s.goals.find((g) => g.id === id);

/* ───────────────────────────── queries ───────────────────────────── */

export function today(s: GameState, now: Date) {
  return dayKey(now, s.settings.resetHour);
}

/** How many times a habit was logged on a day (first log + repeats). */
export function logsOn(h: Habit, day: string): number {
  return (h.history[day] ? 1 : 0) + (h.extra?.[day]?.length ?? 0);
}

/** Daily log limit: 1 by default, Infinity when unlimited (perDay = 0). Weekly habits are always unlimited. */
export function dailyLimit(h: Habit): number {
  if (h.frequency === 'weekly') return Infinity;
  return h.perDay === 0 ? Infinity : Math.max(1, h.perDay ?? 1);
}

/** Sessions logged this week up to and including `day` (repeat logs count as sessions). */
export function weekCount(h: Habit, day: string): number {
  const start = weekStart(day);
  let n = 0;
  for (let d = start; d <= day; d = addDays(d, 1)) n += logsOn(h, d);
  return n;
}

/** A daily habit with no penalty days: log it whenever you like, missing it never costs HP. */
export function isOptional(h: Habit): boolean {
  return h.polarity === 'good' && h.frequency === 'daily' && h.days.length === 0;
}

export function isDueOn(h: Habit, day: string): boolean {
  if (h.polarity === 'bad') return false;
  if (h.frequency === 'daily') return h.days.includes(weekday(day));
  return weekCount(h, day) < h.perWeek || !!h.history[day];
}

export function habitXpPreview(h: Habit): number {
  return Math.round(BASE_XP[h.difficulty] * (h.frequency === 'daily' ? streakMultiplier(h.streak) : 1));
}

/* ───────────────────────────── hero ───────────────────────────── */

export interface NewHeroInput {
  name: string;
  backstory: string;
  appearance: Appearance;
  statDefs: StatDef[];
  starterQuests: boolean;
}

export function createHero(state: GameState, input: NewHeroInput, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  tx.s.statDefs = input.statDefs.length ? input.statDefs : DEFAULT_STATS.map((d) => ({ ...d }));
  const stats: Hero['stats'] = {};
  for (const d of tx.s.statDefs) stats[d.id] = { level: 1, xp: 0 };
  tx.s.hero = {
    name: input.name.trim() || 'Nameless',
    title: 'the Oathsworn',
    backstory: input.backstory.trim(),
    classId: 'wanderer',
    classesAttained: [],
    appearance: input.appearance,
    equipped: { cloak: 'wd-cloak', weapon: 'wd-staff' },
    inventory: [],
    titles: ['the Oathsworn'],
    level: 1,
    xp: 0,
    totalXp: 0,
    hp: maxHpFor(1),
    maxHp: maxHpFor(1),
    gold: 0,
    stats,
    createdDay: tx.today,
  };
  tx.s.lastProcessedDay = tx.today;
  tx.s.lastRecapWeek = weekStart(tx.today);
  if (input.starterQuests) {
    const has = (id: string) => tx.s.statDefs.some((d) => d.id === id);
    const tag = (...ids: string[]) => ids.filter(has);
    tx.s.habits.push(
      makeHabit({ title: 'Train the body', difficulty: 'medium', statIds: tag('body') }, tx.today),
      makeHabit({ title: 'Read 20 pages', difficulty: 'easy', statIds: tag('mind') }, tx.today),
      makeHabit({ title: 'Meditate or journal', difficulty: 'easy', statIds: tag('spirit') }, tx.today),
      makeHabit({ title: 'Doomscroll past midnight', difficulty: 'medium', statIds: tag('discipline'), polarity: 'bad' }, tx.today),
    );
    tx.s.todos.push(makeTodo({ title: 'Reach out to an old friend', difficulty: 'easy', statIds: tag('spirit') }, tx.today));
  }
  tx.log('system', `${tx.s.hero.name} swore the Ashen Oath.`);
  return tx.done();
}

export function updateHero(state: GameState, patch: Partial<Pick<Hero, 'name' | 'title' | 'backstory' | 'appearance'>>, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  Object.assign(tx.hero, patch);
  return tx.done();
}

/* ───────────────────────────── item factories ───────────────────────────── */

export function makeHabit(p: Partial<Habit> & { title: string }, day: string): Habit {
  return {
    id: newId('hab'), notes: '', difficulty: 'easy', statIds: [], polarity: 'good', frequency: 'daily',
    days: [0, 1, 2, 3, 4, 5, 6], perWeek: 3, streak: 0, bestStreak: 0, history: {}, slips: {}, createdDay: day, ...p,
  };
}

export function makeTodo(p: Partial<Todo> & { title: string }, day: string): Todo {
  return { id: newId('todo'), notes: '', difficulty: 'easy', statIds: [], done: false, createdDay: day, ...p };
}

export function makeGoal(p: Partial<Goal> & { title: string }, day: string): Goal {
  return { id: newId('goal'), notes: '', difficulty: 'hard', statIds: [], milestones: [], done: false, createdDay: day, ...p };
}

/* ───────────────────────────── habits ───────────────────────────── */

export function completeHabit(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const h = findHabit(tx.s, id);
  if (!h || h.polarity !== 'good') return tx.done();
  if (h.history[tx.today]) {
    // repeat log: full reward, but streaks and penalties only care about the first log
    if (logsOn(h, tx.today) >= dailyLimit(h)) return tx.done();
    const mult = h.frequency === 'daily' ? streakMultiplier(Math.max(0, h.streak - 1)) : 1;
    const n = logsOn(h, tx.today) + 1;
    const reward = grantReward(tx, BASE_XP[h.difficulty] * mult, h.statIds, `${h.title} ×${n}`, { regen: regenFor(h.difficulty) });
    ((h.extra ??= {})[tx.today] ??= []).push(reward);
    checkAchievements(tx);
    return tx.done();
  }
  const prevStreak = h.streak;
  const prevBest = h.bestStreak;
  const mult = h.frequency === 'daily' ? streakMultiplier(h.streak) : 1;
  const reward = grantReward(tx, BASE_XP[h.difficulty] * mult, h.statIds, h.title, { regen: regenFor(h.difficulty) });
  if (h.frequency === 'daily') {
    h.streak++;
    h.bestStreak = Math.max(h.bestStreak, h.streak);
    streakMilestone(tx, h);
  }
  h.history[tx.today] = { ...reward, prevStreak, prevBest };
  checkPerfectDay(tx);
  checkAchievements(tx);
  return tx.done();
}

export function uncompleteHabit(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const h = findHabit(tx.s, id);
  const c = h?.history[tx.today];
  if (!h || !c) return tx.done();
  // undo the most recent log first
  const extras = h.extra?.[tx.today];
  if (extras?.length) {
    revokeReward(tx, extras.pop()!);
    if (!extras.length) delete h.extra![tx.today];
    return tx.done();
  }
  revokeReward(tx, c);
  h.streak = c.prevStreak;
  h.bestStreak = c.prevBest;
  delete h.history[tx.today];
  checkPerfectDay(tx);
  return tx.done();
}

export function slipHabit(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const h = findHabit(tx.s, id);
  if (!h || h.polarity !== 'bad') return tx.done();
  const dmg = damageFor(h.difficulty, tx.s.settings.penalty);
  h.lastSlip = { day: tx.today, prevStreak: h.streak, dmg };
  h.slips[tx.today] = (h.slips[tx.today] ?? 0) + 1;
  h.streak = 0;
  tx.s.counters.slips++;
  if (dmg) applyDamage(tx, dmg, `Gave in: ${h.title}`);
  else tx.log('slip', `Gave in: ${h.title}`);
  checkAchievements(tx);
  return tx.done();
}

export function undoSlip(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const h = findHabit(tx.s, id);
  if (!h?.lastSlip || h.lastSlip.day !== tx.today || !h.slips[tx.today]) return tx.done();
  h.slips[tx.today]--;
  if (h.slips[tx.today] <= 0) delete h.slips[tx.today];
  h.streak = h.lastSlip.prevStreak;
  tx.hero.hp = Math.min(tx.hero.maxHp, tx.hero.hp + h.lastSlip.dmg);
  tx.s.counters.slips = Math.max(0, tx.s.counters.slips - 1);
  h.lastSlip = undefined;
  return tx.done();
}

/* ───────────────────────────── todos ───────────────────────────── */

export function completeTodo(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const t = findTodo(tx.s, id);
  if (!t || t.done) return tx.done();
  t.reward = grantReward(tx, BASE_XP[t.difficulty], t.statIds, t.title);
  t.done = true;
  t.doneDay = tx.today;
  tx.s.counters.todosDone++;
  checkAchievements(tx);
  return tx.done();
}

export function uncompleteTodo(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const t = findTodo(tx.s, id);
  if (!t || !t.done) return tx.done();
  if (t.reward) revokeReward(tx, t.reward);
  t.done = false;
  t.doneDay = undefined;
  t.reward = undefined;
  tx.s.counters.todosDone = Math.max(0, tx.s.counters.todosDone - 1);
  return tx.done();
}

/* ───────────────────────────── goals ───────────────────────────── */

function finishGoal(tx: Tx, g: Goal) {
  // finishing the quest is part of the last milestone, so it doesn't add to the combo
  g.reward = grantReward(tx, BASE_XP[g.difficulty] * GOAL_MULT, g.statIds, `Quest complete: ${g.title}`, { live: false });
  g.done = true;
  g.doneDay = tx.today;
  tx.s.counters.goalsDone++;
  const title = g.rewardTitle?.trim();
  if (title && !tx.hero.titles.includes(title)) tx.hero.titles.push(title);
  tx.emit({ type: 'goal', goalId: g.id, title: title || undefined });
  tx.log('goal', `Completed the quest “${g.title}”.`);
}

function unfinishGoal(tx: Tx, g: Goal) {
  if (!g.done) return;
  if (g.reward) revokeReward(tx, g.reward);
  g.done = false;
  g.doneDay = undefined;
  g.reward = undefined;
  tx.s.counters.goalsDone = Math.max(0, tx.s.counters.goalsDone - 1);
}

export function toggleMilestone(state: GameState, goalId: string, milestoneId: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const g = findGoal(tx.s, goalId);
  const m = g?.milestones.find((x) => x.id === milestoneId);
  if (!g || !m) return tx.done();
  if (!m.done) {
    m.reward = grantReward(tx, BASE_XP[g.difficulty] * MILESTONE_MULT, g.statIds, `Milestone: ${m.title}`);
    m.done = true;
    if (g.milestones.every((x) => x.done)) finishGoal(tx, g);
  } else {
    unfinishGoal(tx, g);
    if (m.reward) revokeReward(tx, m.reward);
    m.done = false;
    m.reward = undefined;
  }
  checkAchievements(tx);
  return tx.done();
}

export function toggleGoal(state: GameState, goalId: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const g = findGoal(tx.s, goalId);
  if (!g) return tx.done();
  if (g.done) unfinishGoal(tx, g);
  else if (g.milestones.every((m) => m.done)) finishGoal(tx, g);
  checkAchievements(tx);
  return tx.done();
}

/* ───────────────────────────── daily reset ───────────────────────────── */

/** Habits that were due but left unmarked between `from` (inclusive) and `to` (exclusive). */
export function collectMissed(s: GameState, from: string, to: string): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) {
    for (const h of s.habits) {
      if (h.polarity !== 'good' || h.paused || h.createdDay > d || onVacation(s, d)) continue;
      if (h.frequency === 'daily') {
        if (h.days.includes(weekday(d)) && !h.history[d]) {
          items.push({ key: `${h.id}@${d}`, habitId: h.id, day: d, title: h.title, difficulty: h.difficulty, kind: 'daily' });
        }
      } else if (weekday(d) === 0 && h.createdDay <= weekStart(d) && !weekTouchedByVacation(s, d)) {
        const missing = h.perWeek - weekCount(h, d);
        for (let n = 1; n <= missing; n++) {
          items.push({ key: `${h.id}@${d}#${n}`, habitId: h.id, day: d, title: h.title, difficulty: h.difficulty, kind: 'weekly', session: n, missing });
        }
      }
    }
  }
  return items;
}

function catchUpStart(s: GameState, today: string): string {
  const earliest = addDays(today, -CATCHUP_DAYS);
  return s.lastProcessedDay! < earliest ? earliest : s.lastProcessedDay!;
}

/** Credit a habit as done on a past day (from the catch-up review). */
function creditPast(tx: Tx, h: Habit, day: string) {
  const prevStreak = h.streak;
  const prevBest = h.bestStreak;
  const mult = h.frequency === 'daily' ? streakMultiplier(h.streak) : 1;
  const reward = grantReward(tx, BASE_XP[h.difficulty] * mult, h.statIds, `${h.title} (caught up)`, { regen: regenFor(h.difficulty), day, live: false });
  if (h.frequency === 'daily') {
    h.streak++;
    h.bestStreak = Math.max(h.bestStreak, h.streak);
    streakMilestone(tx, h, day);
  }
  h.history[day] = { ...reward, prevStreak, prevBest };
}

/** Walk each missed day: credit what the player confirmed, penalise the rest. */
function settleDays(tx: Tx, done: Set<string>) {
  const s = tx.s;
  const missed: string[] = [];
  let totalDmg = 0;
  let fell = false;
  let days = 0;
  for (let d = catchUpStart(s, tx.today); d < tx.today; d = addDays(d, 1)) {
    days++;
    let dmg = 0;
    if (onVacation(s, d)) {
      (s.vacationDays ??= {})[d] = true; // the whole day is skipped: no penalties, streaks frozen
      continue;
    }
    for (const h of s.habits) {
      if (h.createdDay > d || h.paused) continue;
      if (h.polarity === 'bad') {
        if (!h.slips[d]) {
          h.streak++;
          h.bestStreak = Math.max(h.bestStreak, h.streak);
          grantDiscipline(tx, DISCIPLINE_CLEAN_DAY, `Resisted: ${h.title}`, d);
          streakMilestone(tx, h, d);
        }
        continue;
      }
      if (h.frequency === 'daily') {
        if (h.days.includes(weekday(d)) && !h.history[d]) {
          if (done.has(`${h.id}@${d}`)) creditPast(tx, h, d);
          else {
            h.streak = 0;
            dmg += damageFor(h.difficulty, s.settings.penalty);
            missed.push(h.title);
          }
        }
      } else if (weekday(d) === 0) {
        // Sunday closes the week (weeks touched by vacation aren't judged)
        if (h.createdDay > weekStart(d) || weekTouchedByVacation(s, d)) continue;
        const missing = h.perWeek - weekCount(h, d);
        // confirmed extra sessions are credited to the latest unmarked days of that week
        let credited = 0;
        for (let n = 1; n <= missing; n++) if (done.has(`${h.id}@${d}#${n}`)) credited++;
        for (let day = d; credited > 0 && day >= weekStart(d); day = addDays(day, -1)) {
          if (!h.history[day]) {
            creditPast(tx, h, day);
            credited--;
          }
        }
        const count = weekCount(h, d);
        if (count >= h.perWeek) {
          h.streak++;
          h.bestStreak = Math.max(h.bestStreak, h.streak);
          streakMilestone(tx, h, d);
        } else {
          h.streak = 0;
          dmg += damageFor(h.difficulty, s.settings.penalty) * Math.min(3, h.perWeek - count);
          missed.push(h.title);
        }
      }
    }
    if (!fell && dmg > 0) {
      totalDmg += dmg;
      fell = applyDamage(tx, dmg, `Neglected deeds on ${d}`);
    }
  }
  s.lastProcessedDay = tx.today;
  s.pendingReview = null;
  enforceWardrobe(tx);
  // a vacation with an end date finishes on its own
  const v = s.settings.vacation;
  if (v?.until && v.until < tx.today) {
    s.settings.vacation = null;
    tx.log('system', 'Returned from the journey.');
  } else if (v) (s.vacationDays ??= {})[tx.today] = true;
  // weekly chronicle: when a new week begins, offer last week's recap
  const thisWeek = weekStart(tx.today);
  if (s.lastRecapWeek !== thisWeek) {
    const prev = addDays(thisWeek, -7);
    let had = false;
    for (let d = prev; d < thisWeek; d = addDays(d, 1)) if (s.dayActivity[d]) had = true;
    if (had) tx.emit({ type: 'weeklyrecap', week: prev });
    s.lastRecapWeek = thisWeek;
  }
  evaluateClass(tx);
  if (missed.length || totalDmg) {
    tx.emit({ type: 'dayreport', missed: [...new Set(missed)], damage: totalDmg, days });
  }
  checkAchievements(tx);
}

/**
 * Daily reset. If habits were left unmarked and the check-in is on, it stops and raises a
 * review ("did you do these?") instead of penalising; resolveReview() finishes the job.
 */
export function processDay(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const s = tx.s;
  if (!s.hero) return tx.done();
  if (!s.lastProcessedDay) {
    s.lastProcessedDay = tx.today;
    return tx.done();
  }
  if (s.lastProcessedDay >= tx.today) return tx.done();
  if (s.pendingReview?.through === tx.today) return tx.done(); // already waiting on the player

  if (s.settings.reviewMissed !== false) {
    const items = collectMissed(s, catchUpStart(s, tx.today), tx.today);
    if (items.length) {
      s.pendingReview = { through: tx.today, items };
      return tx.done();
    }
  }
  settleDays(tx, new Set());
  return tx.done();
}

/** Finish a pending review: `done` holds the keys of items the player confirms they did. */
export function resolveReview(state: GameState, done: string[], ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  if (!tx.s.hero || !tx.s.pendingReview || !tx.s.lastProcessedDay) return tx.done();
  if (tx.s.lastProcessedDay >= tx.today) {
    tx.s.pendingReview = null;
    return tx.done();
  }
  settleDays(tx, new Set(done));
  return tx.done();
}

/* ───────────────────────────── camp ───────────────────────────── */

const campOf = (s: GameState): CampState => (s.camp ??= structuredClone(DEFAULT_CAMP));

export function buyUpgrade(state: GameState, line: UpgradeLineId, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const hero = tx.hero;
  const camp = campOf(tx.s);
  const cur = tierOf(camp, line);
  const next = UPGRADE_BY_ID[line]?.tiers[cur + 1];
  if (!next || hero.gold < next.price || hero.level < (next.minLevel ?? 1)) return tx.done();
  hero.gold -= next.price;
  camp.tiers[line] = cur + 1;
  tx.s.counters.purchases++;
  if (line === 'tent') {
    const before = hero.maxHp;
    hero.maxHp = maxHpFor(hero.level) + campPerks(camp).maxHp;
    hero.hp = Math.min(hero.maxHp, hero.hp + (hero.maxHp - before));
  }
  tx.log('purchase', `Built ${next.name} for ${next.price} gold.`);
  checkAchievements(tx);
  return tx.done();
}

export function buyPet(state: GameState, pet: PetId, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const hero = tx.hero;
  const camp = campOf(tx.s);
  const p = PET_BY_ID[pet];
  if (!p || camp.pets.includes(pet) || hero.gold < p.price || hero.level < (p.minLevel ?? 1)) return tx.done();
  hero.gold -= p.price;
  camp.pets.push(pet);
  camp.pet = pet;
  tx.s.counters.purchases++;
  tx.log('purchase', `Adopted a ${p.name} for ${p.price} gold.`);
  checkAchievements(tx);
  return tx.done();
}

export function customizeCamp(state: GameState, patch: Partial<Pick<CampState, 'tentColor' | 'bannerColor' | 'sigil' | 'fire' | 'pet'>>, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const camp = campOf(tx.s);
  if (patch.pet && !camp.pets.includes(patch.pet)) delete patch.pet;
  Object.assign(camp, patch);
  return tx.done();
}

/* ───────────────────────────── wardrobe & chests ───────────────────────────── */

export function equip(state: GameState, itemId: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const item = GEAR_BY_ID[itemId];
  if (!item || !canWear(tx.hero, tx.s.statDefs, itemId)) return tx.done();
  tx.hero.equipped[item.slot] = itemId;
  return tx.done();
}

export function unequip(state: GameState, slot: Slot, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  delete tx.hero.equipped[slot];
  return tx.done();
}

/** Put on the best unlocked piece of the hero's rank in every slot. */
export function equipRankSet(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  tx.hero.equipped = rankSet(tx.hero, tx.s.statDefs);
  return tx.done();
}

/** Loot chests hold gold (spent on the camp). */
export function openChest(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  if (tx.s.pendingChests <= 0) return tx.done();
  tx.s.pendingChests--;
  tx.s.counters.chestsOpened++;
  const rarity = rollRarity(ctx.rng);
  const gold = RARITY_GOLD[rarity];
  tx.hero.gold += gold;
  tx.emit({ type: 'loot', rarity, gold });
  tx.log('loot', `Found ${gold} gold in a chest.`);
  checkAchievements(tx);
  return tx.done();
}

/* ───────────────────────────── stats ───────────────────────────── */

export function addStat(state: GameState, def: Omit<StatDef, 'id'>, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const base = def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stat';
  let id = base;
  let n = 2;
  while (tx.s.statDefs.some((d) => d.id === id)) id = `${base}-${n++}`;
  tx.s.statDefs.push({ ...def, id });
  if (tx.s.hero) tx.hero.stats[id] = { level: 1, xp: 0 };
  return tx.done();
}

export function updateStat(state: GameState, id: string, patch: Partial<Omit<StatDef, 'id'>>, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const d = tx.s.statDefs.find((x) => x.id === id);
  if (d) Object.assign(d, patch);
  return tx.done();
}

export function removeStat(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  if (tx.s.statDefs.length <= 1) return tx.done();
  tx.s.statDefs = tx.s.statDefs.filter((d) => d.id !== id);
  if (tx.s.hero) delete tx.hero.stats[id];
  const strip = (x: { statIds: string[] }) => (x.statIds = x.statIds.filter((s) => s !== id));
  tx.s.habits.forEach(strip);
  tx.s.todos.forEach(strip);
  tx.s.goals.forEach(strip);
  return tx.done();
}

/* ───────────────────────────── misc ───────────────────────────── */

export const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard'];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { trivial: 'Trivial', easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function validateImport(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<GameState>;
  return (
    d.version === 1 && Array.isArray(d.statDefs) && Array.isArray(d.habits) && Array.isArray(d.todos) &&
    Array.isArray(d.goals) && typeof d.settings === 'object' && typeof d.counters === 'object'
  );
}
