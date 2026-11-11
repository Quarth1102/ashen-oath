import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Check, ChevronDown, Flame, Repeat, Skull, Undo2 } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { Goal, Habit, StatDef, Todo } from '../game/types';
import { DIFFICULTIES, dailyLimit, habitXpPreview, isDueOn, isOptional, logsOn, weekCount } from '../game/engine';
import { BASE_XP } from '../game/xp';
import { diffDays, parseDay } from '../game/dates';
import { Bar, SkullRating, StatBadge } from './ui';
import { useToday } from '../hooks';

interface Float { id: number; text: string; color: string }
let fid = 0;

function useFloats() {
  const [floats, setFloats] = useState<Float[]>([]);
  const push = (text: string, color = '#f5c96a') => {
    const f = { id: fid++, text, color };
    setFloats((x) => [...x, f]);
    setTimeout(() => setFloats((x) => x.filter((y) => y.id !== f.id)), 1300);
  };
  return { floats, push };
}

function lastRewardText() {
  const evs = useGame.getState().events;
  const r = [...evs].reverse().find((e) => e.type === 'reward');
  return r && r.type === 'reward' ? `+${r.xp} XP  +${r.gold}g` : '';
}

function Floats({ floats }: { floats: Float[] }) {
  return (
    <AnimatePresence>
      {floats.map((f) => (
        <motion.span
          key={f.id}
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: -46, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="pointer-events-none absolute left-1 top-0 z-20 whitespace-nowrap font-pixel text-sm font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,.9)]"
          style={{ color: f.color }}
        >
          {f.text}
        </motion.span>
      ))}
    </AnimatePresence>
  );
}

function Burst({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-[1px]"
            style={{ background: color }}
            initial={{ x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 26, y: Math.sin(a) * 26, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

function CheckButton({
  done, onClick, color = '#e0a33a', label, count = 0,
}: { done: boolean; onClick: () => void; color?: string; label: string; count?: number }) {
  const [burstKey, setBurstKey] = useState(0);
  const partial = !done && count > 0;
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={done}
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) setBurstKey((k) => k + 1);
        onClick();
      }}
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 transition-colors"
      style={{ borderColor: done || partial ? color : '#4a4052', background: done ? color : partial ? 'rgba(224,163,58,.18)' : 'rgba(0,0,0,.35)' }}
    >
      <AnimatePresence mode="popLayout">
        {partial && (
          <motion.span key={count} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }} className="font-pixel text-base" style={{ color }}>
            ×{count}
          </motion.span>
        )}
        {done && (
          <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
            <Check size={22} strokeWidth={3} className="text-void" />
          </motion.span>
        )}
      </AnimatePresence>
      {burstKey > 0 && <Burst key={burstKey} color={color} />}
    </motion.button>
  );
}

function Tags({ ids, defs }: { ids: string[]; defs: StatDef[] }) {
  const list = defs.filter((d) => ids.includes(d.id));
  if (!list.length) return null;
  return (
    <>
      {list.map((d) => (
        <StatBadge key={d.id} def={d} size="xs" />
      ))}
    </>
  );
}

const diffN = (d: Todo['difficulty']) => DIFFICULTIES.indexOf(d) + 1;

const cardMotion = {
  layout: true,
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
  transition: { type: 'spring', stiffness: 380, damping: 32 },
} as const;

export function HabitCard({ habit, onEdit }: { habit: Habit; onEdit?: () => void }) {
  const defs = useGame((s) => s.statDefs);
  const { completeHabit, uncompleteHabit, slipHabit, undoSlip } = useGame.getState();
  const today = useToday();
  const { floats, push } = useFloats();
  const count = logsOn(habit, today);
  const limit = dailyLimit(habit);
  const repeatable = limit > 1;
  // a once-a-day habit is "done" after one log; a repeatable one only when its limit is reached
  const done = repeatable ? count >= limit : count > 0;
  const bad = habit.polarity === 'bad';
  const due = isDueOn(habit, today);
  const optional = isOptional(habit);
  const restDay = !bad && habit.frequency === 'daily' && !due && !optional && !habit.paused;
  const slipsToday = habit.slips[today] ?? 0;

  return (
    <motion.div {...cardMotion} className={`panel relative flex items-center gap-3 p-3 ${restDay || habit.paused ? 'brightness-[.6] saturate-50' : ''}`} data-testid="habit-card">
      <Floats floats={floats} />
      {bad ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.85, rotate: -8 }}
          onClick={(e) => {
            e.stopPropagation();
            slipHabit(habit.id);
            const evs = useGame.getState().events;
            const dmg = [...evs].reverse().find((x) => x.type === 'damage');
            push(dmg && dmg.type === 'damage' ? `−${dmg.hp} HP` : 'Gave in', '#ff5a64');
          }}
          aria-label={`Gave in to ${habit.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-blood/60 bg-blood-dark/40 text-blood-light"
        >
          <Skull size={20} />
        </motion.button>
      ) : (
        <CheckButton
          done={done}
          count={repeatable ? count : 0}
          label={done ? (repeatable ? `${habit.title}: daily limit reached` : `Undo ${habit.title}`) : `${count ? 'Log again' : 'Complete'} ${habit.title}`}
          onClick={() => {
            if (done) {
              if (!repeatable) uncompleteHabit(habit.id); // repeatable ones undo via the undo button
            } else {
              completeHabit(habit.id);
              push(lastRewardText());
            }
          }}
        />
      )}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={`truncate font-semibold ${done && !repeatable ? 'text-bone-faint line-through decoration-ember/60' : ''}`}>{habit.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-bone-faint">
          <SkullRating n={diffN(habit.difficulty)} />
          {habit.streak > 0 && (
            <span className={`inline-flex items-center gap-0.5 ${bad ? 'text-spectral' : 'text-ember-light'}`}>
              <Flame size={11} className="flame" /> {habit.streak}
              {bad ? ' clean' : habit.frequency === 'weekly' ? 'w' : 'd'}
            </span>
          )}
          {habit.frequency === 'weekly' && !bad && (
            <span className={`inline-flex items-center gap-0.5 ${weekCount(habit, today) >= habit.perWeek ? 'text-ember-light' : ''}`}>
              {weekCount(habit, today) >= habit.perWeek && <Check size={11} strokeWidth={3} />}
              {weekCount(habit, today)}/{habit.perWeek} this week
            </span>
          )}
          {repeatable && habit.frequency === 'daily' && (
            <span className={`inline-flex items-center gap-0.5 ${count ? 'text-ember-light' : ''}`}>
              <Repeat size={11} /> {limit === Infinity ? `×${count} today` : `${count}/${limit} today`}
            </span>
          )}
          {restDay && <span>rest day</span>}
          {optional && <span className="text-spectral/80">no penalty</span>}
          {habit.paused && <span className="text-bone-dim">paused</span>}
          {bad && slipsToday > 0 && <span className="text-blood-light">slipped ×{slipsToday} today</span>}
          <Tags ids={habit.statIds} defs={defs} />
        </div>
      </button>
      {bad && habit.lastSlip?.day === today && slipsToday > 0 ? (
        <button type="button" onClick={() => undoSlip(habit.id)} className="rounded-lg p-2 text-bone-faint hover:bg-ash-700 hover:text-bone" aria-label="Undo slip">
          <Undo2 size={16} />
        </button>
      ) : (
        !bad && (
          <div className="flex shrink-0 items-center gap-1">
            {repeatable && count > 0 && (
              <button type="button" onClick={() => uncompleteHabit(habit.id)} className="rounded-lg p-2 text-bone-faint hover:bg-ash-700 hover:text-bone" aria-label={`Undo last log of ${habit.title}`}>
                <Undo2 size={15} />
              </button>
            )}
            <span className="font-pixel text-xs text-ember/80">+{habitXpPreview(habit)}</span>
          </div>
        )
      )}
    </motion.div>
  );
}

export function TodoCard({ todo, onEdit }: { todo: Todo; onEdit?: () => void }) {
  const defs = useGame((s) => s.statDefs);
  const { completeTodo, uncompleteTodo } = useGame.getState();
  const today = useToday();
  const { floats, push } = useFloats();
  const overdue = !todo.done && todo.due && todo.due < today;
  const dueLabel = todo.due
    ? (() => {
        const d = diffDays(today, todo.due);
        if (d === 0) return 'today';
        if (d === 1) return 'tomorrow';
        if (d < 0) return `${-d}d overdue`;
        return parseDay(todo.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      })()
    : null;
  return (
    <motion.div {...cardMotion} className="panel relative flex items-center gap-3 p-3" data-testid="todo-card">
      <Floats floats={floats} />
      <CheckButton
        done={todo.done}
        color="#5fd1c1"
        label={todo.done ? `Undo ${todo.title}` : `Complete ${todo.title}`}
        onClick={() => {
          if (todo.done) uncompleteTodo(todo.id);
          else {
            completeTodo(todo.id);
            push(lastRewardText());
          }
        }}
      />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={`truncate font-semibold ${todo.done ? 'text-bone-faint line-through decoration-spectral/60' : ''}`}>{todo.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-bone-faint">
          <SkullRating n={diffN(todo.difficulty)} />
          {dueLabel && (
            <span className={`inline-flex items-center gap-0.5 ${overdue ? 'text-blood-light' : ''}`}>
              <CalendarClock size={11} /> {dueLabel}
            </span>
          )}
          <Tags ids={todo.statIds} defs={defs} />
        </div>
      </button>
      {!todo.done && <span className="shrink-0 font-pixel text-xs text-spectral/80">+{BASE_XP[todo.difficulty]}</span>}
    </motion.div>
  );
}

export function GoalCard({ goal, onEdit, defaultOpen = false }: { goal: Goal; onEdit?: () => void; defaultOpen?: boolean }) {
  const defs = useGame((s) => s.statDefs);
  const { toggleMilestone, toggleGoal } = useGame.getState();
  const [open, setOpen] = useState(defaultOpen);
  const { floats, push } = useFloats();
  const total = goal.milestones.length;
  const doneN = goal.milestones.filter((m) => m.done).length;
  return (
    <motion.div {...cardMotion} className={`panel relative overflow-hidden p-3 ${goal.done ? 'ring-1 ring-ember/40' : ''}`} data-testid="goal-card">
      <Floats floats={floats} />
      {goal.done && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ember/10 to-transparent" />}
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ember/40 bg-ember-dark/20 font-pixel text-xs text-ember-light">
          {total ? `${doneN}/${total}` : goal.done ? <Check size={20} /> : '—'}
        </div>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-display font-bold">{goal.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-bone-faint">
            <SkullRating n={diffN(goal.difficulty)} />
            {goal.rewardTitle && <span className="text-ember-light">Title: “{goal.rewardTitle}”</span>}
            {goal.due && <span className="inline-flex items-center gap-0.5"><CalendarClock size={11} /> {parseDay(goal.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
            <Tags ids={goal.statIds} defs={defs} />
          </div>
        </button>
        {total > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-bone-dim hover:bg-ash-700" aria-label="Toggle milestones" aria-expanded={open}>
            <motion.span animate={{ rotate: open ? 180 : 0 }} className="block"><ChevronDown size={18} /></motion.span>
          </button>
        )}
      </div>
      {total > 0 && <Bar value={doneN} max={total} color="#e0a33a" className="mt-3" height={6} glow />}
      {total === 0 && (
        <button
          type="button"
          className={`mt-3 w-full ${goal.done ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => {
            const was = goal.done;
            toggleGoal(goal.id);
            if (!was) push(lastRewardText());
          }}
        >
          {goal.done ? 'Reopen quest' : `Claim quest (+${BASE_XP[goal.difficulty] * 10} XP)`}
        </button>
      )}
      <AnimatePresence initial={false}>
        {open && total > 0 && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 space-y-1 overflow-hidden">
            {goal.milestones.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    const was = m.done;
                    toggleMilestone(goal.id, m.id);
                    if (!was) push(lastRewardText());
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-ash-700/50"
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${m.done ? 'border-ember bg-ember text-void' : 'border-ash-500'}`}>
                    {m.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className={m.done ? 'text-bone-faint line-through' : ''}>{m.title}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
