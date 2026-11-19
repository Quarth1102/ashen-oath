/** Generates the day's quest line, leaning toward the hero's weakest pillars. */
import type { DailyQuest, DailyQuestLine, GameState, Habit } from './types';
import { CHALLENGES, DAILY_REROLLS, QUEST_XP, boostTitle } from '../data/dailyQuests';
import { totalStatXp } from './classes';

let qid = 0;
const questId = () => `dq_${Date.now().toString(36)}${(qid++).toString(36)}`;

/** Pillars sorted weakest first, each with a pick weight (weaker = likelier). */
export function pillarWeights(s: GameState): { id: string; xp: number; w: number }[] {
  return s.statDefs
    .map((d) => {
      const xp = totalStatXp(s.hero?.stats[d.id]);
      return { id: d.id, xp, w: 1 / (xp + 30) };
    })
    .sort((a, b) => a.xp - b.xp);
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, rng: () => number): T | undefined {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (!items.length || total <= 0) return items[0];
  let r = rng() * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

const activeHabits = (s: GameState) => s.habits.filter((h) => h.polarity === 'good' && !h.paused && h.statIds[0] && s.statDefs.some((d) => d.id === h.statIds[0]));

/** Can the hero reasonably do `target` deeds of this pillar today? */
function countFeasible(s: GameState, pillar: string, target: number): boolean {
  const habits = activeHabits(s).filter((h) => h.statIds[0] === pillar).length;
  const todos = s.todos.filter((t) => !t.done && t.statIds[0] === pillar).length;
  return habits + todos >= target;
}

function challenge(pillar: string, rng: () => number, usedTitles: Set<string>): DailyQuest {
  const pool = (CHALLENGES[pillar] ?? CHALLENGES.discipline).filter((c) => !usedTitles.has(c.title));
  const c = pool[Math.floor(rng() * pool.length)] ?? CHALLENGES[pillar][0];
  return { id: questId(), kind: 'challenge', pillar, title: c.title, detail: c.detail, xp: QUEST_XP.challenge, done: false };
}

function boost(h: Habit): DailyQuest {
  const harder = boostTitle(h.title);
  return {
    id: questId(),
    kind: 'boost',
    pillar: h.statIds[0],
    habitId: h.id,
    title: harder ?? `${h.title}, and then some`,
    detail: harder ? `Your usual is “${h.title}”. Go further today.` : `Go longer, harder or twice today. Your usual is “${h.title}”.`,
    xp: QUEST_XP.boost,
    done: false,
  };
}

function count(s: GameState, pillar: string): DailyQuest {
  const name = s.statDefs.find((d) => d.id === pillar)?.name ?? pillar;
  const target = countFeasible(s, pillar, 3) ? 3 : 2;
  return {
    id: questId(),
    kind: 'count',
    pillar,
    target,
    progress: 0,
    title: `Complete ${target} ${name} deeds`,
    detail: 'Habits, to-dos or milestones tagged with this pillar. Tracked automatically.',
    xp: QUEST_XP.countPer * target + 5,
    done: false,
  };
}

export function generateQuestLine(s: GameState, day: string, rng: () => number): DailyQuestLine {
  const weights = pillarWeights(s);
  const weakest = weights[0]?.id ?? 'discipline';
  const used = new Set<string>();
  const quests: DailyQuest[] = [];
  const add = (q: DailyQuest) => {
    used.add(q.title);
    quests.push(q);
  };

  // 1 · always something for the weakest pillar
  add(rng() < 0.5 && countFeasible(s, weakest, 2) ? count(s, weakest) : challenge(weakest, rng, used));

  // 2 · push one of the hero's own habits further, preferring weaker pillars
  const habits = activeHabits(s);
  const others = habits.filter((h) => h.statIds[0] !== weakest);
  // habits with a number ("Walk 10,000 steps") make the best boosts, so they're likelier
  const boostWeight = (x: Habit) => (weights.find((w) => w.id === x.statIds[0])?.w ?? 0.01) * (boostTitle(x.title) ? 3 : 1);
  const h = pickWeighted(others.length ? others : habits, boostWeight, rng);
  if (h) add(boost(h));

  // 3+ · fill to three from the remaining pillars, weaker ones likelier
  while (quests.length < 3) {
    const taken = new Set(quests.map((q) => q.pillar));
    const pool = weights.filter((w) => !taken.has(w.id));
    const p = (pickWeighted(pool.length ? pool : weights, (w) => w.w, rng) ?? weights[0]).id;
    add(rng() < 0.4 && countFeasible(s, p, 2) && !quests.some((q) => q.kind === 'count') ? count(s, p) : challenge(p, rng, used));
  }
  return { day, quests, rerolls: DAILY_REROLLS };
}

/** A different quest for the same slot. */
export function rerolled(s: GameState, line: DailyQuestLine, q: DailyQuest, rng: () => number): DailyQuest {
  const used = new Set(line.quests.map((x) => x.title));
  if (q.kind === 'boost') {
    const taken = new Set(line.quests.map((x) => x.habitId).filter(Boolean));
    const h = pickWeighted(activeHabits(s).filter((x) => !taken.has(x.id)), () => 1, rng);
    if (h) return boost(h);
  }
  return challenge(q.pillar, rng, used);
}
