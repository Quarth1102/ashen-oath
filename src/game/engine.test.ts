import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { addXp, heroXpToNext, splitXp, streakMultiplier } from './xp';
import { addDays, dayKey, weekStart } from './dates';
import { activeStreak } from './streaks';
import { rollRarity } from './economy';
import type { Ctx, GameState } from './types';
import { DEFAULT_STATS } from '../data/stats';
import { DEFAULT_LOOK } from '../data/classes';
import { determineClassId, resolveClass, totalStatXp, CLASS_UNLOCK_LEVEL } from './classes';
import type { Progress } from './types';

// Wednesday 2026-11-11, 12:00 local
const NOON = new Date(2026, 10, 11, 12, 0, 0);
const at = (d: Date, days = 0, hours = 0) => new Date(d.getTime() + days * 86400_000 + hours * 3600_000);
const ctx = (now = NOON, rngVal = 0.99): Ctx => ({ now, rng: () => rngVal });

function withHeroBase(): GameState {
  return E.createHero(
    E.initialState(),
    {
      name: 'Test', backstory: '', appearance: DEFAULT_LOOK,
      statDefs: DEFAULT_STATS.map((d) => ({ ...d })), starterQuests: false,
    },
    ctx(),
  ).state;
}

const withHero = withHeroBase;

/** An extra due habit that is never completed, so tests aren't affected by the Perfect Day bonus. */
const blockPerfect = (s: GameState) => addHabit(s, { title: 'blocker' });

function addHabit(s: GameState, p: Parameters<typeof E.makeHabit>[0]) {
  const h = E.makeHabit(p, E.today(s, NOON));
  s.habits.push(h);
  return h.id;
}

describe('xp math', () => {
  it('levels up and down across curve boundaries', () => {
    const up = addXp({ level: 1, xp: 40 }, 20, heroXpToNext);
    expect(up).toMatchObject({ level: 2, xp: 10, gained: 1 });
    const down = addXp({ level: 2, xp: 10 }, -20, heroXpToNext);
    expect(down).toMatchObject({ level: 1, xp: 40, gained: -1 });
    expect(addXp({ level: 1, xp: 5 }, -100, heroXpToNext)).toMatchObject({ level: 1, xp: 0 });
  });
  it('splits xp evenly', () => {
    expect(splitXp(21, 2)).toEqual([11, 10]);
    expect(splitXp(5, 3).reduce((a, b) => a + b)).toBe(5);
  });
  it('caps streak bonus at 50%', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(100)).toBe(1.5);
  });
});

describe('dates', () => {
  it('respects reset hour', () => {
    expect(dayKey(new Date(2026, 10, 11, 3), 4)).toBe('2026-11-10');
    expect(dayKey(new Date(2026, 10, 11, 5), 4)).toBe('2026-11-11');
  });
  it('finds monday', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-09');
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
  });
  it('counts active streaks', () => {
    expect(activeStreak({ '2026-11-09': 1, '2026-11-10': 2 }, '2026-11-11')).toBe(2);
    expect(activeStreak({ '2026-11-09': 1, '2026-11-10': 2, '2026-11-11': 1 }, '2026-11-11')).toBe(3);
    expect(activeStreak({ '2026-11-08': 1 }, '2026-11-11')).toBe(0);
  });
});

describe('hero creation', () => {
  it('starts as an unclassed Wanderer', () => {
    const s = withHero();
    expect(s.hero!.classId).toBe('wanderer');
    expect(s.hero!.stats.strength.level).toBe(1);
    expect(s.hero!.inventory).toEqual([]);
    expect(s.lastProcessedDay).toBe(E.today(s, NOON));
  });
});

describe('earned classes', () => {
  const defs = DEFAULT_STATS;
  // stat levels → cumulative xp; give exact xp via level 1 + xp field
  const st = (xp: Record<string, number>): Record<string, Progress> =>
    Object.fromEntries(defs.map((d) => [d.id, { level: 1, xp: xp[d.id] ?? 0 }]));

  it('stays Wanderer below the unlock level', () => {
    expect(determineClassId(defs, st({ strength: 500 }), CLASS_UNLOCK_LEVEL - 1)).toBe('wanderer');
  });
  it('gives a pure class when one stat dominates', () => {
    expect(determineClassId(defs, st({ strength: 100, discipline: 40, wisdom: 10 }), 3)).toBe('pure:strength');
    expect(resolveClass('pure:strength', defs).name).toBe('Knight');
  });
  it('gives a hybrid when the top two are close', () => {
    const id = determineClassId(defs, st({ strength: 100, discipline: 80, wisdom: 10 }), 3);
    expect(id).toBe('hybrid:discipline+strength');
    expect(resolveClass(id, defs).name).toBe('Templar');
    // hybrid gear mixes both parents: Knight plate + sword, Rogue cloak
    expect(resolveClass(id, defs).kit.sort()).toEqual(['st-knight-armor', 'st-knight-sword', 'st-rogue-cloak'].sort());
  });
  it('needs the runner-up to hold a real share for a hybrid', () => {
    // runner-up is close to the leader, but both are tiny next to a spread of others → paragon-ish, not hybrid
    expect(determineClassId(defs, st({ strength: 30, vitality: 28, intellect: 27, wisdom: 26, discipline: 25, charisma: 24 }), 3)).toBe('paragon');
  });
  it('names classes built from custom stats', () => {
    const custom = [...defs, { id: 'faith', name: 'Faith', icon: 'moon', color: '#ffffff' }];
    expect(resolveClass('pure:faith', custom).name).toBe('Faith-Sworn');
    expect(resolveClass('hybrid:faith+strength', custom).name).toBe('Faith-Strength Adept');
  });
  it('maps old picked-class ids', () => {
    expect(resolveClass('knight', defs).name).toBe('Knight');
  });
  it('counts cumulative stat xp across levels', () => {
    expect(totalStatXp({ level: 3, xp: 5 })).toBe(20 + Math.round(20 * Math.pow(2, 1.4)) + 5);
  });

  it('awakens on level-up, grants the kit once, and boosts class stat xp', () => {
    let s = withHero();
    s.hero!.level = 2;
    s.hero!.xp = 140; // one hard deed away from level 3 (needs 141)
    const id = addHabit(s, { title: 'Lift', difficulty: 'hard', statIds: ['strength'] });
    blockPerfect(s);
    const r = E.completeHabit(s, id, ctx());
    s = r.state;
    expect(s.hero!.level).toBe(3);
    expect(s.hero!.classId).toBe('pure:strength');
    expect(s.hero!.title).toBe('the Unbroken');
    const ev = r.events.find((e) => e.type === 'classchange');
    expect(ev && ev.type === 'classchange' && ev.kit.sort()).toEqual(['st-knight-armor', 'st-knight-sword']);
    // next strength deed gets +10%
    const before = totalStatXp(s.hero!.stats.strength);
    s = E.completeHabit(s, id, ctx(at(NOON, 1))).state;
    expect(totalStatXp(s.hero!.stats.strength) - before).toBe(Math.round(Math.round(40 * 1.02) * 1.1));
  });

  it('re-evaluates at the new day and switches to a hybrid', () => {
    let s = withHero();
    s.hero!.level = 3;
    s.hero!.classId = 'pure:strength';
    s.hero!.classesAttained = ['pure:strength'];
    s.hero!.stats.strength = { level: 1, xp: 100 };
    s.hero!.stats.discipline = { level: 1, xp: 90 };
    const r = E.processDay(s, ctx(at(NOON, 1)));
    expect(r.state.hero!.classId).toBe('hybrid:discipline+strength');
    expect(r.events.some((e) => e.type === 'classchange')).toBe(true);
  });
});

describe('completing habits', () => {
  it('grants xp split across stats, gold, and can be undone exactly', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Run', difficulty: 'medium', statIds: ['strength', 'vitality'] });
    blockPerfect(s);
    const r = E.completeHabit(s, id, ctx());
    s = r.state;
    expect(s.hero!.xp).toBe(20);
    expect(s.hero!.gold).toBe(10 + 10); // 10 from deed + 10 from First Blood achievement
    expect(s.hero!.stats.strength.xp).toBe(10);
    expect(s.hero!.stats.vitality.xp).toBe(10);
    expect(s.habits[0].streak).toBe(1);
    expect(r.events.some((e) => e.type === 'achievement')).toBe(true);

    // idempotent on the same day
    expect(E.completeHabit(s, id, ctx()).state.hero!.xp).toBe(20);

    s = E.uncompleteHabit(s, id, ctx()).state;
    expect(s.hero!.xp).toBe(0);
    expect(s.hero!.stats.strength.xp).toBe(0);
    expect(s.habits[0].streak).toBe(0);
    expect(s.hero!.gold).toBe(10); // achievement gold kept
  });

  it('levels the hero up and refills hp', () => {
    let s = withHero();
    s.hero!.hp = 10;
    s.hero!.xp = 45;
    const id = addHabit(s, { title: 'Lift', difficulty: 'hard', statIds: [] });
    const r = E.completeHabit(s, id, ctx());
    s = r.state;
    expect(s.hero!.level).toBe(2);
    expect(s.hero!.hp).toBe(s.hero!.maxHp);
    expect(r.events.some((e) => e.type === 'levelup')).toBe(true);
  });

  it('gear is cosmetic: no XP bonus', () => {
    let s = withHero();
    s.hero!.classId = 'pure:wisdom'; // a Witch: no class bonus to strength
    s.hero!.level = 25;
    s.hero!.equipped = { weapon: 'wi-moonstaff', armor: 'wi-robe' };
    const id = addHabit(s, { title: 'Lift', difficulty: 'hard', statIds: ['strength'] });
    blockPerfect(s);
    s = E.completeHabit(s, id, ctx()).state;
    expect(totalStatXp(s.hero!.stats.strength)).toBe(40);
  });

  it('drops a chest when the loot roll succeeds', () => {
    const s = withHero();
    const id = addHabit(s, { title: 'x' });
    const r = E.completeHabit(s, id, ctx(NOON, 0.01));
    expect(r.state.pendingChests).toBe(1);
    const o = E.openChest(r.state, ctx(NOON, 0.01));
    expect(o.state.pendingChests).toBe(0);
    expect(o.events.find((e) => e.type === 'loot')).toBeTruthy();
  });
});

describe('daily reset & penalties (check-in off)', () => {
  // these tests cover automatic settlement; the review flow is tested below
  const withHero = () => { const s = withHeroBase(); s.settings.reviewMissed = false; return s; };
  it('damages for missed daily habits and resets streak', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Run', difficulty: 'medium' });
    s = E.completeHabit(s, id, ctx()).state;
    // next day: completed yesterday → no damage
    let r = E.processDay(s, ctx(at(NOON, 1)));
    expect(r.state.hero!.hp).toBe(s.hero!.hp);
    expect(r.state.habits[0].streak).toBe(1);
    // skip a day: day 2 processed on day 3 → missed day 1
    r = E.processDay(r.state, ctx(at(NOON, 2)));
    expect(r.state.habits[0].streak).toBe(0);
    expect(r.state.hero!.hp).toBe(s.hero!.hp - 7);
    expect(r.events.find((e) => e.type === 'dayreport')).toBeTruthy();
  });

  it('penalty strength 0 disables damage', () => {
    const s = withHero();
    s.settings.penalty = 0;
    addHabit(s, { title: 'Run', difficulty: 'hard' });
    const r = E.processDay(s, ctx(at(NOON, 3)));
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
  });

  it('soft-falls at 0 hp: loses 10% gold + level xp, keeps level', () => {
    const s = withHero();
    s.hero!.level = 3;
    s.hero!.maxHp = 54;
    s.hero!.hp = 3;
    s.hero!.xp = 30;
    s.hero!.gold = 200;
    addHabit(s, { title: 'Run', difficulty: 'hard' });
    const r = E.processDay(s, ctx(at(NOON, 5)));
    const h = r.state.hero!;
    expect(h.level).toBe(3);
    expect(h.xp).toBe(0);
    expect(h.gold).toBe(180 + 25); // 10% lost, then "Risen from Ash" achievement +25
    expect(h.hp).toBe(h.maxHp);
    expect(r.events.filter((e) => e.type === 'fall')).toHaveLength(1); // only one fall per catch-up
  });

  it('bad habits hurt on slip and build clean streaks', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Doomscroll', polarity: 'bad', difficulty: 'easy' });
    s = E.slipHabit(s, id, ctx()).state;
    expect(s.hero!.hp).toBe(s.hero!.maxHp - 4);
    s = E.undoSlip(s, id, ctx()).state;
    expect(s.hero!.hp).toBe(s.hero!.maxHp);
    s = E.processDay(s, ctx(at(NOON, 2))).state;
    expect(s.habits[0].streak).toBe(2);
  });

  it('weekly habits are judged on Sunday', () => {
    const s = withHero();
    // created on a Monday so the week counts
    s.habits.push(E.makeHabit({ title: 'Gym', frequency: 'weekly', perWeek: 3, difficulty: 'easy' }, '2026-11-09'));
    s.lastProcessedDay = '2026-11-15';
    const r = E.processDay(s, ctx(new Date(2026, 10, 16, 12)));
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp - 12); // 3 missing × 4
  });

  it('caps catch-up to 7 days', () => {
    const s = withHero();
    s.settings.penalty = 1;
    addHabit(s, { title: 'Tiny', difficulty: 'trivial' });
    const r = E.processDay(s, ctx(at(NOON, 30)));
    const report = r.events.find((e) => e.type === 'dayreport');
    expect(report && report.type === 'dayreport' && report.days).toBe(7);
  });
});

describe('todos & goals', () => {
  it('completes and reverts todos', () => {
    let s = withHero();
    s.todos.push(E.makeTodo({ title: 'Taxes', difficulty: 'hard' }, '2026-11-11'));
    s = E.completeTodo(s, s.todos[0].id, ctx()).state;
    expect(s.counters.todosDone).toBe(1);
    s = E.uncompleteTodo(s, s.todos[0].id, ctx()).state;
    expect(s.hero!.xp).toBe(0);
    expect(s.counters.todosDone).toBe(0);
  });

  it('finishes a goal when every milestone is done and grants a title', () => {
    let s = withHero();
    const g = E.makeGoal(
      {
        title: 'Run a 10k', difficulty: 'easy', rewardTitle: 'the Swift',
        milestones: [{ id: 'm1', title: '5k', done: false }, { id: 'm2', title: '10k', done: false }],
      },
      '2026-11-11',
    );
    s.goals.push(g);
    s = E.toggleMilestone(s, g.id, 'm1', ctx()).state;
    expect(s.goals[0].done).toBe(false);
    const r = E.toggleMilestone(s, g.id, 'm2', ctx(at(NOON, 0, 1))); // an hour later: no combo
    s = r.state;
    expect(s.goals[0].done).toBe(true);
    expect(s.hero!.titles).toContain('the Swift');
    expect(r.events.some((e) => e.type === 'goal')).toBe(true);
    // 2 milestones × 20 + goal 100 = 140 total xp → level 2 (50) + 90 → level 3 needs 141
    expect(s.hero!.totalXp).toBe(140);
    s = E.toggleMilestone(s, g.id, 'm2', ctx()).state;
    expect(s.goals[0].done).toBe(false);
    expect(s.hero!.totalXp).toBe(20);
  });
});

describe('stats', () => {
  it('adds and removes custom stats, stripping tags', () => {
    let s = withHero();
    s = E.addStat(s, { name: 'Faith', icon: 'moon', color: '#fff' }, ctx()).state;
    expect(s.hero!.stats.faith).toEqual({ level: 1, xp: 0 });
    addHabit(s, { title: 'Pray', statIds: ['faith', 'wisdom'] });
    s = E.removeStat(s, 'faith', ctx()).state;
    expect(s.statDefs.find((d) => d.id === 'faith')).toBeUndefined();
    expect(s.habits[0].statIds).toEqual(['wisdom']);
  });

  it('rolls rarities by weight', () => {
    expect(rollRarity(() => 0)).toBe('common');
    expect(rollRarity(() => 0.999)).toBe('legendary');
  });

  it('day helpers stay consistent', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('catch-up review', () => {
  const YESTERDAY = '2026-11-11';
  it('asks before penalising unmarked habits', () => {
    const s = withHero();
    addHabit(s, { title: 'Run', difficulty: 'medium' });
    addHabit(s, { title: 'Read', difficulty: 'easy' });
    const r = E.processDay(s, ctx(at(NOON, 1)));
    expect(r.state.pendingReview?.items.map((i) => i.title)).toEqual(['Run', 'Read']);
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp); // nothing applied yet
    expect(r.state.lastProcessedDay).toBe(YESTERDAY);
    // calling again while waiting changes nothing
    expect(E.processDay(r.state, ctx(at(NOON, 1, 1))).state.pendingReview?.items).toHaveLength(2);
  });

  it('credits ticked habits and penalises only the rest', () => {
    let s = withHero();
    const run = addHabit(s, { title: 'Run', difficulty: 'medium', statIds: ['strength'] });
    addHabit(s, { title: 'Read', difficulty: 'easy' });
    s = E.processDay(s, ctx(at(NOON, 1))).state;
    const r = E.resolveReview(s, [`${run}@${YESTERDAY}`], ctx(at(NOON, 1)));
    s = r.state;
    const runH = s.habits.find((h) => h.id === run)!;
    expect(runH.history[YESTERDAY]).toBeTruthy();
    expect(runH.streak).toBe(1);
    expect(s.hero!.xp).toBeGreaterThan(0);
    expect(totalStatXp(s.hero!.stats.strength)).toBe(20);
    expect(s.dayActivity[YESTERDAY]).toBe(1);
    // only Read (easy = 4) hurt; Run's regen was capped at full HP before the damage
    expect(s.hero!.hp).toBe(s.hero!.maxHp - 4);
    const rep = r.events.find((e) => e.type === 'dayreport');
    expect(rep && rep.type === 'dayreport' && rep.missed).toEqual(['Read']);
    expect(s.pendingReview).toBeNull();
    expect(s.lastProcessedDay).toBe('2026-11-12');
  });

  it('applies no penalty when everything is ticked', () => {
    let s = withHero();
    addHabit(s, { title: 'Run', difficulty: 'hard' });
    s = E.processDay(s, ctx(at(NOON, 1))).state;
    const keys = s.pendingReview!.items.map((i) => i.key);
    const r = E.resolveReview(s, keys, ctx(at(NOON, 1)));
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
    expect(r.events.some((e) => e.type === 'dayreport')).toBe(false);
  });

  it('skips the review when nothing was missed', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Run' });
    s = E.completeHabit(s, id, ctx()).state;
    const r = E.processDay(s, ctx(at(NOON, 1)));
    expect(r.state.pendingReview ?? null).toBeNull();
    expect(r.state.lastProcessedDay).toBe('2026-11-12');
  });

  it('lets you confirm missing weekly sessions', () => {
    let s = withHero();
    s.habits.push(E.makeHabit({ id: 'gym', title: 'Gym', frequency: 'weekly', perWeek: 3, difficulty: 'easy' }, '2026-11-09'));
    s.habits[0].history['2026-11-10'] = { xp: 10, gold: 5, hp: 0, stats: {}, day: '2026-11-10', prevStreak: 0, prevBest: 0 };
    s.lastProcessedDay = '2026-11-15';
    const monday = ctx(new Date(2026, 10, 16, 12));
    s = E.processDay(s, monday).state;
    const items = s.pendingReview!.items;
    expect(items.map((i) => i.key)).toEqual(['gym@2026-11-15#1', 'gym@2026-11-15#2']);
    // did one more session: still one short → one session's damage (4), streak broken
    const r = E.resolveReview(s, ['gym@2026-11-15#1'], monday).state;
    const gym = r.habits[0];
    expect(Object.keys(gym.history).sort()).toEqual(['2026-11-10', '2026-11-15']);
    expect(r.hero!.hp).toBe(r.hero!.maxHp - 4);
    expect(gym.streak).toBe(0);
  });

  it('keeps a ticked daily streak alive across several missed days', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Run', difficulty: 'easy' });
    s = E.processDay(s, ctx(at(NOON, 3))).state; // missed 11th, 12th, 13th
    expect(s.pendingReview!.items).toHaveLength(3);
    s = E.resolveReview(s, s.pendingReview!.items.map((i) => i.key), ctx(at(NOON, 3))).state;
    expect(s.habits.find((h) => h.id === id)!.streak).toBe(3);
  });
});

describe('repeatable habits', () => {
  it('logs up to the daily limit, each with a full reward, streak counted once', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Exercise 30 min', difficulty: 'medium', perDay: 3 });
    blockPerfect(s);
    for (let i = 0; i < 4; i++) s = E.completeHabit(s, id, ctx(at(NOON, 0, i))).state; // hours apart (no combo); 4th is over the limit
    const h = s.habits[0];
    expect(E.logsOn(h, '2026-11-11')).toBe(3);
    expect(h.extra!['2026-11-11']).toHaveLength(2);
    expect(h.streak).toBe(1);
    expect(s.hero!.totalXp).toBe(60);
    expect(s.counters.completions).toBe(3);
  });

  it('allows unlimited logs when perDay is 0', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Pushups set', difficulty: 'trivial', perDay: 0 });
    for (let i = 0; i < 10; i++) s = E.completeHabit(s, id, ctx()).state;
    expect(E.logsOn(s.habits[0], '2026-11-11')).toBe(10);
  });

  it('stays once-per-day by default', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Read' });
    s = E.completeHabit(s, id, ctx()).state;
    s = E.completeHabit(s, id, ctx()).state;
    expect(E.logsOn(s.habits[0], '2026-11-11')).toBe(1);
  });

  it('undoes the most recent log first', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Exercise', difficulty: 'medium', perDay: 0 });
    blockPerfect(s);
    s = E.completeHabit(s, id, ctx()).state;
    s = E.completeHabit(s, id, ctx(at(NOON, 0, 1))).state;
    s = E.uncompleteHabit(s, id, ctx()).state;
    expect(E.logsOn(s.habits[0], '2026-11-11')).toBe(1);
    expect(s.habits[0].streak).toBe(1);
    expect(s.hero!.totalXp).toBe(20);
    s = E.uncompleteHabit(s, id, ctx()).state;
    expect(E.logsOn(s.habits[0], '2026-11-11')).toBe(0);
    expect(s.habits[0].streak).toBe(0);
    expect(s.hero!.totalXp).toBe(0);
  });

  it('still penalises a set day with zero logs', () => {
    const s = withHero();
    s.settings.reviewMissed = false;
    addHabit(s, { title: 'Exercise', difficulty: 'medium', perDay: 0 });
    expect(E.processDay(s, ctx(at(NOON, 1))).state.hero!.hp).toBe(s.hero!.maxHp - 7);
  });

  it('counts repeat logs as weekly sessions', () => {
    let s = withHero();
    s.habits.push(E.makeHabit({ title: 'Gym', frequency: 'weekly', perWeek: 3, perDay: 0 }, '2026-11-09'));
    const id = s.habits[0].id;
    for (let i = 0; i < 3; i++) s = E.completeHabit(s, id, ctx()).state;
    expect(E.weekCount(s.habits[0], '2026-11-11')).toBe(3);
    expect(E.isDueOn(s.habits[0], '2026-11-12')).toBe(false); // week target met
  });
});

describe('weekly habits log freely', () => {
  it('allows several sessions a day even if perDay was left at 1', () => {
    let s = withHero();
    s.habits.push(E.makeHabit({ title: 'Gym', frequency: 'weekly', perWeek: 3, perDay: 1 }, '2026-11-09'));
    const id = s.habits[0].id;
    s = E.completeHabit(s, id, ctx()).state;
    s = E.completeHabit(s, id, ctx()).state;
    expect(E.weekCount(s.habits[0], '2026-11-11')).toBe(2);
  });
});

describe('habits with no penalty days', () => {
  it('never penalise or ask for review, but still reward', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'New thing', difficulty: 'hard', days: [] });
    expect(E.isOptional(s.habits[0])).toBe(true);
    let r = E.processDay(s, ctx(at(NOON, 3)));
    expect(r.state.pendingReview ?? null).toBeNull();
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
    s = E.completeHabit(r.state, id, ctx(at(NOON, 3))).state;
    expect(s.hero!.totalXp).toBe(40);
  });
});

describe('paused habits & grouping', () => {
  it('are never penalised or reviewed, and keep their streak', () => {
    const s = withHero();
    addHabit(s, { title: 'Run', difficulty: 'hard', paused: true, streak: 5, bestStreak: 5 });
    addHabit(s, { title: 'Scroll', polarity: 'bad', paused: true, streak: 2 });
    const r = E.processDay(s, ctx(at(NOON, 3)));
    expect(r.state.pendingReview ?? null).toBeNull();
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
    expect(r.state.habits[0].streak).toBe(5);
    expect(r.state.habits[1].streak).toBe(2);
  });

  it('groups by first tagged stat in stat order, untagged last', async () => {
    const { groupByStat } = await import('./groups');
    const items = [
      { id: 'a', statIds: ['wisdom', 'strength'] },
      { id: 'b', statIds: [] },
      { id: 'c', statIds: ['strength'] },
      { id: 'd', statIds: ['gone', 'wisdom'] },
    ];
    const g = groupByStat(items, DEFAULT_STATS);
    expect(g.map((x) => [x.key, x.items.map((i) => i.id)])).toEqual([
      ['strength', ['c']],
      ['wisdom', ['a', 'd']],
      ['untagged', ['b']],
    ]);
  });
});

describe('combos', () => {
  it('builds within 5 minutes, adds up to +25% XP, and resets after a gap', () => {
    let s = withHero();
    blockPerfect(s);
    const ids = Array.from({ length: 8 }, (_, i) => addHabit(s, { title: `h${i}`, difficulty: 'medium', days: [] }));
    const xps: number[] = [];
    ids.slice(0, 7).forEach((id, i) => {
      const before = s.hero!.totalXp;
      const r = E.completeHabit(s, id, ctx(new Date(NOON.getTime() + i * 60_000)));
      s = r.state;
      xps.push(s.hero!.totalXp - before);
    });
    expect(xps).toEqual([20, 21, 22, 23, 24, 25, 25]);
    expect(s.combo!.count).toBe(7);
    const before = s.hero!.totalXp;
    s = E.completeHabit(s, ids[7], ctx(new Date(NOON.getTime() + 20 * 60_000))).state;
    expect(s.hero!.totalXp - before).toBe(20);
    expect(s.combo!.count).toBe(1);
  });
});

describe('perfect day', () => {
  it('grants 50 XP spread over every stat once all due habits are done, and revokes on undo', () => {
    let s = withHero();
    const a = addHabit(s, { title: 'A', statIds: ['strength'] });
    const b = addHabit(s, { title: 'B', statIds: ['wisdom'] });
    addHabit(s, { title: 'Optional', days: [] }); // no-penalty habits don't count
    s = E.completeHabit(s, a, ctx()).state;
    expect(s.perfectDays?.['2026-11-11']).toBeUndefined();
    const r = E.completeHabit(s, b, ctx(at(NOON, 0, 1)));
    s = r.state;
    const pd = s.perfectDays!['2026-11-11'];
    expect(pd).toBeTruthy();
    expect(Object.keys(pd.stats).sort()).toEqual(DEFAULT_STATS.map((d) => d.id).sort());
    expect(Object.values(pd.stats).reduce((x, y) => x + y, 0)).toBe(50);
    expect(r.events.some((e) => e.type === 'perfectday')).toBe(true);
    expect(s.counters.completions).toBe(2); // the bonus isn't a deed
    const xp = s.hero!.totalXp;
    s = E.uncompleteHabit(s, b, ctx(at(NOON, 0, 1))).state;
    expect(s.perfectDays!['2026-11-11']).toBeUndefined();
    expect(s.hero!.totalXp).toBe(xp - 50 - 10);
  });
});

describe('vacation mode', () => {
  it('skips penalties, reviews and streak changes, then ends by itself', () => {
    let s = withHero();
    addHabit(s, { title: 'Run', difficulty: 'hard', streak: 4, bestStreak: 4 });
    s = E.startVacation(s, '2026-11-13', ctx()).state;
    let r = E.processDay(s, ctx(at(NOON, 2))); // 13th: still on vacation
    expect(r.state.pendingReview ?? null).toBeNull();
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
    expect(r.state.habits[0].streak).toBe(4);
    expect(r.state.settings.vacation).toBeTruthy();
    r = E.processDay(r.state, ctx(at(NOON, 3))); // 14th: the 13th is skipped, vacation over
    expect(r.state.settings.vacation).toBeNull();
    expect(r.state.vacationDays?.['2026-11-13']).toBe(true);
    expect(r.state.hero!.hp).toBe(s.hero!.maxHp);
  });

  it('protects today when ended early and keeps the active streak whole', () => {
    let s = withHero();
    s = E.startVacation(s, undefined, ctx()).state;
    s = E.endVacation(s, ctx()).state;
    expect(s.settings.vacation).toBeNull();
    expect(s.vacationDays?.['2026-11-11']).toBe(true);
    expect(activeStreak({ '2026-11-09': 1, '2026-11-12': 1 }, '2026-11-12', { '2026-11-10': true, '2026-11-11': true })).toBe(2);
  });
});

describe('camp', () => {
  it('buys upgrade tiers in order, applying perks', () => {
    let s = withHero();
    s.hero!.gold = 1000;
    s = E.buyUpgrade(s, 'tent', ctx()).state;
    expect(s.camp!.tiers.tent).toBe(1);
    expect(s.hero!.maxHp).toBe(55);
    expect(s.hero!.hp).toBe(55);
    // pavilion needs level 5
    expect(E.buyUpgrade(s, 'tent', ctx()).state.camp!.tiers.tent).toBe(1);
    s = E.buyUpgrade(s, 'banner', ctx()).state;
    blockPerfect(s);
    const id = addHabit(s, { title: 'x', difficulty: 'medium' });
    const g = s.hero!.gold;
    s = E.completeHabit(s, id, ctx()).state;
    expect(s.hero!.gold - g).toBe(Math.round(10 * 1.05) + 10); // +5% gold, plus First Blood
  });

  it('adopts pets and customises', () => {
    let s = withHero();
    s.hero!.gold = 500;
    s = E.buyPet(s, 'raven', ctx()).state;
    expect(s.camp!.pet).toBe('raven');
    s = E.customizeCamp(s, { tentColor: '#2a3a5a', pet: 'cat' }, ctx()).state; // cat not owned: ignored
    expect(s.camp!.tentColor).toBe('#2a3a5a');
    expect(s.camp!.pet).toBe('raven');
  });
});

describe('weekly recap', () => {
  it('summarises a week and is offered when a new week starts', async () => {
    const { weekRecap } = await import('./recap');
    let s = withHero(); // created Wed 11 Nov
    s.settings.reviewMissed = false;
    const id = addHabit(s, { title: 'Read', statIds: ['intellect'] });
    s = E.completeHabit(s, id, ctx()).state;
    s = E.processDay(s, ctx(at(NOON, 1))).state;
    s = E.completeHabit(s, id, ctx(at(NOON, 1))).state;
    const r = E.processDay(s, ctx(new Date(2026, 10, 16, 12))); // Monday
    const ev = r.events.find((e) => e.type === 'weeklyrecap');
    expect(ev && ev.type === 'weeklyrecap' && ev.week).toBe('2026-11-09');
    const rec = weekRecap(r.state, '2026-11-09');
    expect(rec.deeds).toBe(2);
    expect(rec.perfectDays).toEqual(['2026-11-11', '2026-11-12']);
    expect(rec.stats[0].id).toBe('intellect');
    expect(rec.habits[0]).toMatchObject({ title: 'Read', done: 2, due: 5 }); // Wed–Sun
  });
});

describe('rank wardrobes', () => {
  it('starts in wanderer gear and cannot wear any rank gear', () => {
    let s = withHero();
    expect(s.hero!.equipped).toEqual({ cloak: 'wd-cloak', weapon: 'wd-staff' });
    s.hero!.level = 30;
    expect(E.equip(s, 'st-knight-sword', ctx()).state.hero!.equipped.weapon).toBe('wd-staff');
  });

  it('only allows the current rank, unlocked by level', () => {
    let s = withHero();
    s.hero!.classId = 'pure:strength';
    s.hero!.level = 3;
    s = E.equip(s, 'st-knight-sword', ctx()).state;
    expect(s.hero!.equipped.weapon).toBe('st-knight-sword');
    expect(E.equip(s, 'st-warden-axe', ctx()).state.hero!.equipped.weapon).toBe('st-knight-sword'); // a Warden's
    expect(E.equip(s, 'helm-iron', ctx()).state.hero!.equipped.helm).toBeUndefined(); // level 8 piece
  });

  it('hybrids wear both parents, paragons wear everything', () => {
    let s = withHero();
    s.hero!.level = 8;
    s.hero!.classId = 'hybrid:discipline+strength';
    s = E.equip(s, 'helm-iron', ctx()).state;
    s = E.equip(s, 'ro-fang', ctx()).state;
    expect(s.hero!.equipped).toMatchObject({ helm: 'helm-iron', weapon: 'ro-fang' });
    s.hero!.classId = 'paragon';
    expect(E.equip(s, 'he-cape', ctx()).state.hero!.equipped.cloak).toBe('he-cape');
  });

  it('puts away old-rank gear when the rank changes', () => {
    let s = withHero();
    s.settings.reviewMissed = false;
    s.hero!.level = 8;
    s.hero!.classId = 'pure:strength';
    s.hero!.classesAttained = ['pure:strength'];
    s = E.equipRankSet(s, ctx()).state;
    expect(s.hero!.equipped).toMatchObject({ armor: 'st-knight-armor', helm: 'helm-iron', weapon: 'sword-long', cloak: 'cloak-crimson' });
    s.hero!.stats.vitality = { level: 1, xp: 200 };
    const r = E.processDay(s, ctx(at(NOON, 1)));
    expect(r.state.hero!.classId).toBe('pure:vitality');
    expect(Object.values(r.state.hero!.equipped).filter((id) => id?.startsWith('st-knight') || id === 'helm-iron')).toEqual([]);
    const ev = r.events.find((e) => e.type === 'classchange');
    expect(ev && ev.type === 'classchange' && ev.kit).toContain('wa-antlers');
  });

  it('announces new pieces at level milestones', () => {
    let s = withHero();
    s.hero!.classId = 'pure:strength';
    s.hero!.level = 7;
    s.hero!.xp = heroXpToNext(7) - 1;
    blockPerfect(s);
    const id = addHabit(s, { title: 'x', difficulty: 'easy' });
    const r = E.completeHabit(s, id, ctx());
    const ev = r.events.find((e) => e.type === 'wardrobe');
    expect(ev && ev.type === 'wardrobe' && ev.items.sort()).toEqual(['cloak-crimson', 'helm-iron', 'sword-long']);
  });

  it('chests hold gold', () => {
    const s = withHero();
    s.pendingChests = 1;
    const r = E.openChest(s, ctx(NOON, 0.5));
    expect(r.state.hero!.gold).toBeGreaterThan(s.hero!.gold);
  });
});
