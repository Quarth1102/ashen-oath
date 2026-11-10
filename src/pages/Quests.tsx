import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useGame } from '../store/useGame';
import { GoalCard, HabitCard, TodoCard } from '../components/ItemCards';
import ItemEditor, { type EditTarget } from '../components/ItemEditor';
import { Empty, PageHeader } from '../components/ui';

type Tab = 'habit' | 'todo' | 'goal';
const TABS: { id: Tab; label: string }[] = [
  { id: 'habit', label: 'Habits' },
  { id: 'todo', label: 'To-dos' },
  { id: 'goal', label: 'Goals' },
];

export default function Quests() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'habit';
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });
  const habits = useGame((s) => s.habits);
  const todos = useGame((s) => s.todos);
  const goals = useGame((s) => s.goals);
  const clearDone = useGame((s) => s.clearDoneTodos);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [showDone, setShowDone] = useState(false);

  const good = habits.filter((h) => h.polarity === 'good');
  const bad = habits.filter((h) => h.polarity === 'bad');
  const openTodos = todos.filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const doneTodos = todos.filter((t) => t.done);
  const activeGoals = goals.filter((g) => !g.done);
  const doneGoals = goals.filter((g) => g.done);

  return (
    <div>
      <PageHeader title="Quest Log" subtitle="Every deed recorded. Every promise weighed." />
      <div className="relative mb-4 flex border-b border-ash-600/50">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex-1 pb-3 pt-1 text-sm font-semibold transition ${tab === t.id ? 'text-ember-light' : 'text-bone-faint hover:text-bone'}`}>
            {t.label}
            <span className="ml-1.5 font-pixel text-[10px] opacity-60">
              {t.id === 'habit' ? habits.length : t.id === 'todo' ? openTodos.length : activeGoals.length}
            </span>
            {tab === t.id && <motion.span layoutId="quest-tab" className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-ember shadow-glow" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
          {tab === 'habit' && (
            <>
              {habits.length === 0 && <Empty icon="flame" title="No habits inscribed">Build virtues to grow stronger. Name your vices to resist them.</Empty>}
              {good.length > 0 && (
                <section className="space-y-2">
                  <p className="label">Virtues</p>
                  <AnimatePresence initial={false}>{good.map((h) => <HabitCard key={h.id} habit={h} onEdit={() => setEdit({ kind: 'habit', item: h })} />)}</AnimatePresence>
                </section>
              )}
              {bad.length > 0 && (
                <section className="space-y-2">
                  <p className="label">Vices to resist</p>
                  <AnimatePresence initial={false}>{bad.map((h) => <HabitCard key={h.id} habit={h} onEdit={() => setEdit({ kind: 'habit', item: h })} />)}</AnimatePresence>
                </section>
              )}
            </>
          )}
          {tab === 'todo' && (
            <>
              {openTodos.length === 0 && <Empty icon="check" title="Nothing left undone">Add one-off tasks. They are worth XP once.</Empty>}
              <div className="space-y-2">
                <AnimatePresence initial={false}>{openTodos.map((t) => <TodoCard key={t.id} todo={t} onEdit={() => setEdit({ kind: 'todo', item: t })} />)}</AnimatePresence>
              </div>
              {doneTodos.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button className="label hover:text-bone" onClick={() => setShowDone((v) => !v)}>{showDone ? '▾' : '▸'} Completed ({doneTodos.length})</button>
                    <button className="text-xs text-bone-faint hover:text-blood-light" onClick={clearDone}>Clear completed</button>
                  </div>
                  <AnimatePresence initial={false}>{showDone && doneTodos.map((t) => <TodoCard key={t.id} todo={t} onEdit={() => setEdit({ kind: 'todo', item: t })} />)}</AnimatePresence>
                </section>
              )}
            </>
          )}
          {tab === 'goal' && (
            <>
              {goals.length === 0 && <Empty icon="flag" title="No quests undertaken">Goals are long quests made of milestones. Finish one for big XP and a title.</Empty>}
              <div className="space-y-2">{activeGoals.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setEdit({ kind: 'goal', item: g })} defaultOpen />)}</div>
              {doneGoals.length > 0 && (
                <section className="space-y-2">
                  <p className="label">Completed sagas</p>
                  {doneGoals.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setEdit({ kind: 'goal', item: g })} />)}
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setEdit({ kind: tab })}
        className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl border border-ember-light/60 bg-gradient-to-b from-ember-light to-ember text-void shadow-glow md:bottom-8 md:right-8"
        aria-label={`New ${tab}`}
        data-testid="fab"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      <ItemEditor target={edit} onClose={() => setEdit(null)} />
    </div>
  );
}
