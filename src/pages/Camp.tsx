import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, Flame, Palmtree, Plus } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useActivity, useHeroClass, useHeroLook, useRegion, useToday } from '../hooks';
import Landscape from '../components/Landscape';
import HeroScene, { type SceneActivity } from '../components/HeroScene';
import AmbientSound from '../components/AmbientSound';
import { parseDay } from '../game/dates';
import { activityCaption } from '../game/activity';
import { GoalCard, HabitCard, TodoCard } from '../components/ItemCards';
import ItemEditor, { type EditTarget } from '../components/ItemEditor';
import { Empty } from '../components/ui';
import { Hud } from '../components/Chrome';
import { HabitTiers } from '../components/GroupSection';
import { dailyLimit, isDueOn, isOptional, logsOn } from '../game/engine';
import type { Habit } from '../game/types';
import { activeStreak } from '../game/streaks';

function greeting(h: number) {
  if (h < 5) return 'The night is deep';
  if (h < 12) return 'Dawn breaks grey';
  if (h < 17) return 'The ash drifts at midday';
  if (h < 21) return 'Dusk gathers';
  return 'The moon watches';
}

export default function Camp() {
  const hero = useGame((s) => s.hero)!;
  const habits = useGame((s) => s.habits);
  const todos = useGame((s) => s.todos);
  const goals = useGame((s) => s.goals);
  const activity = useGame((s) => s.dayActivity);
  const look = useHeroLook()!;
  const today = useToday();
  const activityNow = useActivity();
  const vacation = useGame((s) => s.settings.vacation);
  const endVacation = useGame((s) => s.endVacation);
  const camp = useGame((s) => s.camp);
  const perfect = useGame((s) => !!s.perfectDays?.[today]);
  const doing: SceneActivity = vacation ? 'away' : activityNow;
  const region = useRegion();
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const events = useGame((s) => s.events);
  const lastReward = [...events].reverse().find((e) => e.type === 'reward' || e.type === 'levelup');

  // everything relevant today: due virtues, no-penalty virtues, and vices
  const defs = useGame((s) => s.statDefs);
  const todays = habits.filter((h) => !h.paused && (h.polarity === 'bad' || isDueOn(h, today) || isOptional(h)));
  const due = todays.filter((h) => h.polarity === 'good' && isDueOn(h, today));
  const doneCount = due.filter((h) => h.history[today]).length;
  const goodDue = due.length;
  const maxed = (h: Habit) => h.polarity === 'good' && logsOn(h, today) >= dailyLimit(h);

  // A habit that just hit its limit lingers ~1.2s so its checkmark and reward play, then leaves until tomorrow.
  const [linger, setLinger] = useState<Set<string>>(new Set());
  const prevMaxed = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = new Set(todays.filter(maxed).map((h) => h.id));
    const prev = prevMaxed.current;
    prevMaxed.current = now;
    if (!prev) return;
    const fresh = [...now].filter((id) => !prev.has(id));
    if (!fresh.length) return;
    setLinger((l) => new Set([...l, ...fresh]));
    setTimeout(() => setLinger((l) => { const n = new Set(l); fresh.forEach((id) => n.delete(id)); return n; }), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, today]);

  // unfinished virtues first, then vices, then repeatable virtues already logged today
  const rank = (h: Habit) => (h.polarity === 'bad' ? 1 : linger.has(h.id) || logsOn(h, today) === 0 ? 0 : 2);
  const sorted = todays
    .filter((h) => !maxed(h) || linger.has(h.id))
    .map((h, i) => ({ h, i }))
    .sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i)
    .map(({ h }) => h);
  const doneToday = todays.filter((h) => maxed(h) && !linger.has(h.id)).length;
  const openTodos = todos
    .filter((t) => !t.done || t.doneDay === today)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 5);
  const activeGoals = goals.filter((g) => !g.done).slice(0, 2);
  const streak = activeStreak(activity, today, useGame.getState().vacationDays);
  const cls = useHeroClass();

  return (
    <div className="space-y-5">
      <div className="relative -mx-4 -mt-4 md:mx-0 md:mt-0">
        <Landscape region={region} className="h-[46vh] min-h-[300px] w-full md:rounded-2xl md:ring-1 md:ring-ash-600/50">
          {(g, s) => <HeroScene look={look} activity={doing} region={region} ground={g} scale={s} aura={cls.aura} celebrate={lastReward?.id} camp={camp} perfect={perfect} />}
        </Landscape>
        <AmbientSound activity={doing} />
        <AnimatePresence>
          {perfect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="pointer-events-none absolute inset-0 mix-blend-screen md:rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at 50% 85%, rgba(245,180,90,.28), transparent 60%), linear-gradient(to bottom, rgba(245,201,106,.10), transparent 50%)' }}
              data-testid="perfect-glow"
            />
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 md:p-5">
          <div className="pr-3">
            <p className="label text-bone-dim">{region.name}</p>
            <p className="h-display mt-1 text-xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]">{greeting(new Date().getHours())}, {hero.name}.</p>
            <p className="text-xs text-ember-light/90 drop-shadow">{hero.name} {hero.title}</p>
            <AnimatePresence mode="wait">
              <motion.p key={doing} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs italic text-bone-dim drop-shadow" data-testid="activity-caption">
                {doing === 'away' ? `${hero.name} is away on a journey. The camp waits.` : activityCaption(doing, hero.name)}
              </motion.p>
            </AnimatePresence>
          </div>
          <motion.div
            className="pointer-events-auto flex flex-col items-center rounded-xl bg-black/40 px-3 py-2 ring-1 ring-ember/30 backdrop-blur-sm"
            title="Days active in a row"
            data-testid="streak"
          >
            <Flame size={22} className={`flame ${streak ? 'text-ember-light' : 'text-ash-400'}`} />
            <span className="font-pixel text-sm">{streak}</span>
            <span className="text-[9px] uppercase tracking-widest text-bone-faint">days</span>
          </motion.div>
        </div>
        <div className="relative z-10 -mt-10 px-3 md:px-4">
          <Hud />
        </div>
      </div>

      {vacation && (
        <div className="panel flex items-center gap-3 p-3" style={{ borderColor: 'rgba(95,209,193,.45)' }} data-testid="vacation-banner">
          <Palmtree size={22} className="shrink-0 text-spectral" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-spectral">On a journey{vacation.until ? ` until ${parseDay(vacation.until).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}</p>
            <p className="text-xs text-bone-faint">No penalties, streaks frozen. Deeds still earn XP.</p>
          </div>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={endVacation}>Return</button>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="h-display text-lg font-bold">Today’s deeds{perfect && <span className="ml-2 align-middle text-xs font-semibold text-ember-light">✦ Perfect Day</span>}</h2>
            <p className="text-xs text-bone-faint">{goodDue ? `${doneCount} of ${goodDue} habits kept` : 'No habits due today'}</p>
          </div>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setEdit({ kind: 'habit' })}><Plus size={14} /> New</button>
        </div>
        {sorted.length ? (
          <HabitTiers scope="camp" habits={sorted} defs={defs} render={(h) => <HabitCard key={h.id} habit={h} onEdit={() => setEdit({ kind: 'habit', item: h })} />} />
        ) : doneToday ? (
          <Empty icon="sparkles" title="Every deed is done for today">Rest, wanderer. They return at dawn.</Empty>
        ) : (
          <Empty icon="flame" title="No habits yet">Habits are the backbone of your oath. <button className="text-ember-light underline" onClick={() => setEdit({ kind: 'habit' })}>Inscribe one</button>.</Empty>
        )}
        {doneToday > 0 && (
          <Link to="/quests" className="mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs text-bone-faint hover:text-bone" data-testid="done-today">
            <CheckCheck size={14} className="text-ember/80" /> {doneToday} done today · tap to view or undo in Quests
          </Link>
        )}
      </section>

      {openTodos.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="h-display text-lg font-bold">To-dos</h2>
            <Link to="/quests?tab=todo" className="text-xs text-bone-faint hover:text-bone">All →</Link>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {openTodos.map((t) => <TodoCard key={t.id} todo={t} onEdit={() => setEdit({ kind: 'todo', item: t })} />)}
            </AnimatePresence>
          </div>
        </section>
      )}

      {activeGoals.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="h-display text-lg font-bold">Quests</h2>
            <Link to="/quests?tab=goal" className="text-xs text-bone-faint hover:text-bone">All →</Link>
          </div>
          <div className="space-y-2">
            {activeGoals.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setEdit({ kind: 'goal', item: g })} />)}
          </div>
        </section>
      )}

      <ItemEditor target={edit} onClose={() => setEdit(null)} />
    </div>
  );
}
