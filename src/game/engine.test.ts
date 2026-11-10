import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { addXp, heroXpToNext, splitXp, streakMultiplier } from './xp';
import { addDays, dayKey, weekStart } from './dates';
import { activeStreak } from './streaks';
import { rollRarity } from './economy';
import type { Ctx, GameState } from './types';
import { DEFAULT_STATS } from '../data/stats';
import { CLASS_BY_ID } from '../data/classes';

// Wednesday 2026-11-11, 12:00 local
const NOON = new Date(2026, 10, 11, 12, 0, 0);
const at = (d: Date, days = 0, hours = 0) => new Date(d.getTime() + days * 86400_000 + hours * 3600_000);
const ctx = (now = NOON, rngVal = 0.99): Ctx => ({ now, rng: () => rngVal });

function withHero(classId = 'knight'): GameState {
  return E.createHero(
    E.initialState(),
    {
      name: 'Test', backstory: '', classId, appearance: CLASS_BY_ID[classId].defaultLook,
      statDefs: DEFAULT_STATS.map((d) => ({ ...d })), starterQuests: false,
    },
    ctx(),
  ).state;
}

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
  it('applies class bonus and starter gear', () => {
    const s = withHero('witch');
    expect(s.hero!.stats.wisdom.level).toBe(2);
    expect(s.hero!.stats.strength.level).toBe(1);
    expect(s.hero!.equipped.weapon).toBe('st-witch-staff');
    expect(s.lastProcessedDay).toBe(E.today(s, NOON));
  });
});

describe('completing habits', () => {
  it('grants xp split across stats, gold, and can be undone exactly', () => {
    let s = withHero();
    const id = addHabit(s, { title: 'Run', difficulty: 'medium', statIds: ['strength', 'vitality'] });
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

  it('applies gear bonus to tagged stats', () => {
    let s = withHero();
    s.hero!.inventory.push('helm-iron');
    s = E.equip(s, 'helm-iron', ctx()).state; // +8% strength
    const id = addHabit(s, { title: 'Lift', difficulty: 'hard', statIds: ['strength'] });
    s = E.completeHabit(s, id, ctx()).state;
    expect(s.hero!.stats.strength.xp).toBe(Math.round(40 * 1.08));
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

describe('daily reset & penalties', () => {
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
    const r = E.toggleMilestone(s, g.id, 'm2', ctx());
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

describe('market & stats', () => {
  it('buys only with enough gold and level', () => {
    let s = withHero();
    s.hero!.gold = 100;
    expect(E.buyItem(s, 'helm-iron', ctx()).state.hero!.inventory).not.toContain('helm-iron'); // too poor + level
    s = E.buyItem(s, 'sword-long', ctx()).state;
    expect(s.hero!.inventory).toContain('sword-long');
    expect(s.hero!.gold).toBe(100 - 80 + 10); // + shopper achievement
  });

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
