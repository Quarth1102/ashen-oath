import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Plus } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useHeroClass, useHeroLook, useRegion, useToday } from '../hooks';
import Landscape from '../components/Landscape';
import HeroSprite from '../components/HeroSprite';
import { GoalCard, HabitCard, TodoCard } from '../components/ItemCards';
import ItemEditor, { type EditTarget } from '../components/ItemEditor';
import { Empty } from '../components/ui';
import { Hud } from '../components/Chrome';
import { dailyLimit, isDueOn, logsOn } from '../game/engine';
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
  const region = useRegion();
  const today = useToday();
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const events = useGame((s) => s.events);
  const lastReward = [...events].reverse().find((e) => e.type === 'reward' || e.type === 'levelup');

  const due = habits.filter((h) => h.polarity === 'bad' || isDueOn(h, today));
  const doneCount = due.filter((h) => h.polarity === 'good' && h.history[today]).length;
  const goodDue = due.filter((h) => h.polarity === 'good').length;
  const finished = (h: (typeof due)[number]) => Number(logsOn(h, today) >= dailyLimit(h));
  const sorted = [...due].sort((a, b) => finished(a) - finished(b) || Number(a.polarity === 'bad') - Number(b.polarity === 'bad'));
  const openTodos = todos
    .filter((t) => !t.done || t.doneDay === today)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 5);
  const activeGoals = goals.filter((g) => !g.done).slice(0, 2);
  const streak = activeStreak(activity, today);
  const cls = useHeroClass();

  return (
    <div className="space-y-5">
      <div className="relative -mx-4 -mt-4 md:mx-0 md:mt-0">
        <Landscape region={region} className="h-[46vh] min-h-[300px] w-full md:rounded-2xl md:ring-1 md:ring-ash-600/50">
          {(g, s) => (
            <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center" style={{ bottom: g - 4 * s }}>
              <HeroSprite look={look} size={Math.round(32 * s * 1.15)} aura={cls.aura} celebrate={lastReward?.id} />
            </div>
          )}
        </Landscape>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 md:p-5">
          <div className="pr-3">
            <p className="label text-bone-dim">{region.name}</p>
            <p className="h-display mt-1 text-xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]">{greeting(new Date().getHours())}, {hero.name}.</p>
            <p className="text-xs text-ember-light/90 drop-shadow">{hero.name} {hero.title}</p>
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

      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="h-display text-lg font-bold">Today’s deeds</h2>
            <p className="text-xs text-bone-faint">{goodDue ? `${doneCount} of ${goodDue} habits kept` : 'No habits due today'}</p>
          </div>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setEdit({ kind: 'habit' })}><Plus size={14} /> New</button>
        </div>
        {sorted.length ? (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {sorted.map((h) => <HabitCard key={h.id} habit={h} onEdit={() => setEdit({ kind: 'habit', item: h })} />)}
            </AnimatePresence>
          </div>
        ) : (
          <Empty icon="flame" title="No habits yet">Habits are the backbone of your oath. <button className="text-ember-light underline" onClick={() => setEdit({ kind: 'habit' })}>Inscribe one</button>.</Empty>
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
