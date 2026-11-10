/**
 * Pure game engine. Every action takes a GameState and returns a new GameState plus
 * the UI events it produced. No I/O, no Date.now(), no Math.random() — those come via Ctx.
 */
import type {
  Appearance, Ctx, Difficulty, GameEvent, GameState, Goal, Habit, Hero, LogType, NewEvent,
  Reward, Slot, StatDef, Todo,
} from './types';
import { addDays, dayKey, weekday, weekStart } from './dates';
import { BASE_XP, addXp, heroXpToNext, maxHpFor, splitXp, statXpToNext, streakMultiplier } from './xp';
import { FALL_GOLD_LOSS, damageFor, regenFor } from './penalty';
import { LOOT_CHANCE, RARITY_GOLD, goldFor, rollRarity } from './economy';
import { GEAR, GEAR_BY_ID } from '../data/gear';
import { classBonus, determineClassId, normalizeClassId, resolveClass, CLASS_UNLOCK_LEVEL } from './classes';
import { ACHIEVEMENTS } from '../data/achievements';
import { regionsUnlockedBetween } from '../data/regions';
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
    settings: { resetHour: 4, penalty: 2, regionId: null },
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

function xpBonus(s: GameState, hero: Hero, statId: string): number {
  return gearBonus(hero, statId) + classBonus(resolveClass(hero.classId, s.statDefs), statId);
}

function gearBonus(hero: Hero, statId: string): number {
  let pct = 0;
  for (const id of Object.values(hero.equipped)) {
    const item = id ? GEAR_BY_ID[id] : undefined;
    if (item?.bonus?.stat === statId) pct += item.bonus.pct;
  }
  return pct / 100;
}

function applyHeroXp(tx: Tx, amount: number): number {
  const hero = tx.hero;
  const before = hero.level;
  const r = addXp({ level: hero.level, xp: hero.xp }, amount, heroXpToNext);
  hero.level = r.level;
  hero.xp = r.xp;
  hero.totalXp = Math.max(0, hero.totalXp + amount);
  hero.maxHp = maxHpFor(hero.level);
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
  hero.classId = next;
  const attained = (hero.classesAttained ??= []);
  let kit: string[] = [];
  if (!attained.includes(next)) {
    attained.push(next);
    kit = to.kit.filter((id) => GEAR_BY_ID[id] && !hero.inventory.includes(id));
    hero.inventory.push(...kit);
  }
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

function grantReward(tx: Tx, base: number, statIds: string[], source: string, hpRegen = 0): Reward {
  const hero = tx.hero;
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
  const gold = goldFor(total);

  const leveled = applyHeroXp(tx, total) > 0;
  for (const [id, gain] of Object.entries(stats)) applyStatXp(tx, id, gain);
  if (leveled) evaluateClass(tx);
  hero.gold += gold;

  const hpBefore = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + hpRegen);
  const hp = hero.hp - hpBefore;

  tx.s.dayActivity[tx.today] = (tx.s.dayActivity[tx.today] ?? 0) + 1;
  tx.s.counters.completions++;

  if (tx.ctx.rng() < LOOT_CHANCE) {
    tx.s.pendingChests++;
    tx.emit({ type: 'chest' });
  }
  tx.emit({ type: 'reward', xp: total, gold, hp, source });
  tx.log('complete', `${source} (+${total} XP, +${gold} gold)`);
  return { xp: total, gold, hp, stats, day: tx.today };
}

function revokeReward(tx: Tx, r: Reward) {
  const hero = tx.hero;
  applyHeroXp(tx, -r.xp);
  for (const [id, gain] of Object.entries(r.stats)) {
    if (hero.stats[id]) applyStatXp(tx, id, -gain);
  }
  hero.gold = Math.max(0, hero.gold - r.gold);
  hero.hp = Math.max(1, hero.hp - r.hp);
  if (tx.s.dayActivity[r.day]) {
    tx.s.dayActivity[r.day]--;
    if (tx.s.dayActivity[r.day] <= 0) delete tx.s.dayActivity[r.day];
  }
  tx.s.counters.completions = Math.max(0, tx.s.counters.completions - 1);
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

export function weekCount(h: Habit, day: string): number {
  const start = weekStart(day);
  let n = 0;
  for (let d = start; d <= day; d = addDays(d, 1)) if (h.history[d]) n++;
  return n;
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
    equipped: {},
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
  if (input.starterQuests) {
    const has = (id: string) => tx.s.statDefs.some((d) => d.id === id);
    const tag = (...ids: string[]) => ids.filter(has);
    tx.s.habits.push(
      makeHabit({ title: 'Train the body', difficulty: 'medium', statIds: tag('strength', 'vitality') }, tx.today),
      makeHabit({ title: 'Read 20 pages', difficulty: 'easy', statIds: tag('intellect') }, tx.today),
      makeHabit({ title: 'Meditate or journal', difficulty: 'easy', statIds: tag('wisdom') }, tx.today),
      makeHabit({ title: 'Doomscroll past midnight', difficulty: 'medium', statIds: tag('discipline'), polarity: 'bad' }, tx.today),
    );
    tx.s.todos.push(makeTodo({ title: 'Reach out to an old friend', difficulty: 'easy', statIds: tag('charisma') }, tx.today));
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
  if (!h || h.polarity !== 'good' || h.history[tx.today]) return tx.done();
  const prevStreak = h.streak;
  const prevBest = h.bestStreak;
  const mult = h.frequency === 'daily' ? streakMultiplier(h.streak) : 1;
  const reward = grantReward(tx, BASE_XP[h.difficulty] * mult, h.statIds, h.title, regenFor(h.difficulty));
  if (h.frequency === 'daily') {
    h.streak++;
    h.bestStreak = Math.max(h.bestStreak, h.streak);
  }
  h.history[tx.today] = { ...reward, prevStreak, prevBest };
  checkAchievements(tx);
  return tx.done();
}

export function uncompleteHabit(state: GameState, id: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const h = findHabit(tx.s, id);
  const c = h?.history[tx.today];
  if (!h || !c) return tx.done();
  revokeReward(tx, c);
  h.streak = c.prevStreak;
  h.bestStreak = c.prevBest;
  delete h.history[tx.today];
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
  g.reward = grantReward(tx, BASE_XP[g.difficulty] * GOAL_MULT, g.statIds, `Quest complete: ${g.title}`);
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

export function processDay(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const s = tx.s;
  if (!s.hero) return tx.done();
  if (!s.lastProcessedDay) {
    s.lastProcessedDay = tx.today;
    return tx.done();
  }
  if (s.lastProcessedDay >= tx.today) return tx.done();

  let d = s.lastProcessedDay;
  const earliest = addDays(tx.today, -CATCHUP_DAYS);
  if (d < earliest) d = earliest;

  const missed: string[] = [];
  let totalDmg = 0;
  let fell = false;
  let days = 0;
  for (; d < tx.today; d = addDays(d, 1)) {
    days++;
    let dmg = 0;
    for (const h of s.habits) {
      if (h.createdDay > d) continue;
      if (h.polarity === 'bad') {
        if (!h.slips[d]) {
          h.streak++;
          h.bestStreak = Math.max(h.bestStreak, h.streak);
        }
        continue;
      }
      if (h.frequency === 'daily') {
        if (h.days.includes(weekday(d)) && !h.history[d]) {
          h.streak = 0;
          dmg += damageFor(h.difficulty, s.settings.penalty);
          missed.push(h.title);
        }
      } else if (weekday(d) === 0) {
        // Sunday closes the week
        if (h.createdDay > weekStart(d)) continue;
        const count = weekCount(h, d);
        if (count >= h.perWeek) {
          h.streak++;
          h.bestStreak = Math.max(h.bestStreak, h.streak);
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
  evaluateClass(tx);
  if (missed.length || totalDmg) {
    tx.emit({ type: 'dayreport', missed: [...new Set(missed)], damage: totalDmg, days });
  }
  checkAchievements(tx);
  return tx.done();
}

/* ───────────────────────────── market ───────────────────────────── */

export function buyItem(state: GameState, itemId: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const item = GEAR_BY_ID[itemId];
  const hero = tx.hero;
  if (!item || item.starter || hero.inventory.includes(itemId)) return tx.done();
  if (hero.gold < item.price || hero.level < item.minLevel) return tx.done();
  hero.gold -= item.price;
  hero.inventory.push(itemId);
  tx.s.counters.purchases++;
  tx.log('purchase', `Bought ${item.name} for ${item.price} gold.`);
  checkAchievements(tx);
  return tx.done();
}

export function equip(state: GameState, itemId: string, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  const item = GEAR_BY_ID[itemId];
  if (!item || !tx.hero.inventory.includes(itemId)) return tx.done();
  tx.hero.equipped[item.slot] = itemId;
  return tx.done();
}

export function unequip(state: GameState, slot: Slot, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  delete tx.hero.equipped[slot];
  return tx.done();
}

export function openChest(state: GameState, ctx: Ctx): Result {
  const tx = new Tx(state, ctx);
  if (tx.s.pendingChests <= 0) return tx.done();
  tx.s.pendingChests--;
  tx.s.counters.chestsOpened++;
  const rarity = rollRarity(ctx.rng);
  const pool = GEAR.filter((i) => !i.starter && i.rarity === rarity && !tx.hero.inventory.includes(i.id));
  if (pool.length) {
    const item = pool[Math.floor(ctx.rng() * pool.length)];
    tx.hero.inventory.push(item.id);
    tx.emit({ type: 'loot', rarity, itemId: item.id });
    tx.log('loot', `Found ${item.name} in a chest.`);
  } else {
    const gold = RARITY_GOLD[rarity];
    tx.hero.gold += gold;
    tx.emit({ type: 'loot', rarity, gold });
    tx.log('loot', `Found ${gold} gold in a chest.`);
  }
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
