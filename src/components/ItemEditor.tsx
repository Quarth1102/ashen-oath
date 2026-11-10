import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { useGame } from '../store/useGame';
import { DIFFICULTIES, DIFFICULTY_LABEL, makeGoal, makeHabit, makeTodo, newId } from '../game/engine';
import type { Difficulty, Goal, Habit, Todo } from '../game/types';
import { WEEKDAY_SHORT } from '../game/dates';
import { Segmented, Sheet, StatPicker } from './ui';
import { useToday } from '../hooks';
import { BASE_XP } from '../game/xp';

export type EditTarget =
  | { kind: 'habit'; item?: Habit }
  | { kind: 'todo'; item?: Todo }
  | { kind: 'goal'; item?: Goal };

const KIND_TITLE = { habit: 'Habit', todo: 'To-do', goal: 'Goal quest' };

// Only auto-focus the name field with a mouse/trackpad. On phones it pops the keyboard over the form.
const hasFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export default function ItemEditor({ target, onClose }: { target: EditTarget | null; onClose: () => void }) {
  const defs = useGame((s) => s.statDefs);
  const today = useToday();
  const { saveHabit, saveTodo, saveGoal, deleteItem } = useGame.getState();

  const [kind, setKind] = useState<'habit' | 'todo' | 'goal'>('habit');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [statIds, setStatIds] = useState<string[]>([]);
  const [polarity, setPolarity] = useState<'good' | 'bad'>('good');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [perWeek, setPerWeek] = useState(3);
  const [due, setDue] = useState('');
  const [milestones, setMilestones] = useState<Goal['milestones']>([]);
  const [msDraft, setMsDraft] = useState('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!target) return;
    const it = target.item;
    setKind(target.kind);
    setTitle(it?.title ?? '');
    setNotes(it?.notes ?? '');
    setDifficulty(it?.difficulty ?? (target.kind === 'goal' ? 'hard' : 'easy'));
    setStatIds(it?.statIds ?? []);
    setConfirmDel(false);
    setMsDraft('');
    if (target.kind === 'habit') {
      const h = target.item;
      setPolarity(h?.polarity ?? 'good');
      setFrequency(h?.frequency ?? 'daily');
      setDays(h?.days ?? [0, 1, 2, 3, 4, 5, 6]);
      setPerWeek(h?.perWeek ?? 3);
    }
    if (target.kind === 'todo') setDue(target.item?.due ?? '');
    if (target.kind === 'goal') {
      setDue(target.item?.due ?? '');
      setMilestones(target.item?.milestones ?? []);
      setRewardTitle(target.item?.rewardTitle ?? '');
    }
  }, [target]);

  const isNew = !target?.item;
  const valid = title.trim().length > 0 && (kind !== 'habit' || frequency === 'weekly' || days.length > 0 || polarity === 'bad');

  const save = () => {
    if (!valid || !target) return;
    const common = { title: title.trim(), notes, difficulty, statIds };
    if (kind === 'habit') {
      const base = target.kind === 'habit' && target.item ? target.item : makeHabit({ title }, today);
      saveHabit({ ...base, ...common, polarity, frequency, days, perWeek });
    } else if (kind === 'todo') {
      const base = target.kind === 'todo' && target.item ? target.item : makeTodo({ title }, today);
      saveTodo({ ...base, ...common, due: due || undefined });
    } else {
      const base = target.kind === 'goal' && target.item ? target.item : makeGoal({ title }, today);
      const extra = msDraft.trim() ? [{ id: newId('ms'), title: msDraft.trim(), done: false }] : [];
      saveGoal({ ...base, ...common, due: due || undefined, milestones: [...milestones, ...extra], rewardTitle: rewardTitle.trim() || undefined });
    }
    onClose();
  };

  const addMs = () => {
    if (!msDraft.trim()) return;
    setMilestones((m) => [...m, { id: newId('ms'), title: msDraft.trim(), done: false }]);
    setMsDraft('');
  };

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={`${isNew ? 'New' : 'Edit'} ${KIND_TITLE[kind].toLowerCase()}`}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            confirmDel ? (
              <button type="button" className="btn-danger" onClick={() => { deleteItem(kind, target!.item!.id); onClose(); }}>Really delete?</button>
            ) : (
              <button type="button" className="btn-ghost px-3 text-blood-light" onClick={() => setConfirmDel(true)} aria-label="Delete"><Trash2 size={16} /></button>
            )
          )}
          <button type="submit" form="item-form" className="btn-primary flex-1" disabled={!valid}>{isNew ? 'Inscribe' : 'Save'}</button>
        </div>
      }
    >
      <form
        id="item-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {isNew && (
          <Segmented
            layoutId="editor-kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'habit', label: 'Habit' },
              { value: 'todo', label: 'To-do' },
              { value: 'goal', label: 'Goal' },
            ]}
          />
        )}
        <div className="space-y-2">
          <label className="label" htmlFor="item-title">Name</label>
          <input id="item-title" className="input" autoFocus={hasFinePointer} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'habit' ? 'e.g. Walk 30 minutes' : kind === 'todo' ? 'e.g. Book the dentist' : 'e.g. Run a half marathon'} />
        </div>

        {kind === 'habit' && (
          <div className="space-y-3">
            <Segmented
              layoutId="editor-polarity"
              value={polarity}
              onChange={setPolarity}
              options={[
                { value: 'good', label: 'Virtue (build it)' },
                { value: 'bad', label: 'Vice (resist it)' },
              ]}
            />
            {polarity === 'good' && (
              <>
                <Segmented
                  layoutId="editor-freq"
                  value={frequency}
                  onChange={setFrequency}
                  options={[
                    { value: 'daily', label: 'On set days' },
                    { value: 'weekly', label: 'X times a week' },
                  ]}
                />
                {frequency === 'daily' ? (
                  <div className="flex justify-between gap-1">
                    {WEEKDAY_SHORT.map((d, i) => {
                      const on = days.includes(i);
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())}
                          className={`h-10 flex-1 rounded-lg border text-xs font-bold transition ${on ? 'border-ember bg-ember/90 text-void' : 'border-ash-600 bg-ash-900 text-bone-faint'}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={7} value={perWeek} onChange={(e) => setPerWeek(+e.target.value)} className="flex-1 accent-[#e0a33a]" />
                    <span className="w-24 text-right font-pixel text-sm">{perWeek}× / week</span>
                  </div>
                )}
              </>
            )}
            {polarity === 'bad' && <p className="text-xs text-bone-faint">Tap the skull whenever you give in. It costs HP. Every clean day adds to your streak.</p>}
          </div>
        )}

        <div className="space-y-2">
          <p className="label">Difficulty</p>
          <Segmented
            layoutId="editor-diff"
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES.map((d) => ({ value: d, label: <span>{DIFFICULTY_LABEL[d]}<span className="ml-1 opacity-60">{BASE_XP[d] * (kind === 'goal' ? 10 : 1)}</span></span> }))}
          />
        </div>

        <div className="space-y-2">
          <p className="label">Trains which stats?</p>
          <StatPicker defs={defs} value={statIds} onChange={setStatIds} />
          <p className="text-[11px] text-bone-faint">XP is split across the stats you pick.</p>
        </div>

        {(kind === 'todo' || kind === 'goal') && (
          <div className="space-y-2">
            <label className="label" htmlFor="item-due">Due date (optional)</label>
            <input id="item-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        )}

        {kind === 'goal' && (
          <>
            <div className="space-y-2">
              <p className="label">Milestones</p>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {milestones.map((m, i) => (
                    <motion.li key={m.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2 rounded-lg bg-ash-900/70 px-3 py-2 text-sm">
                      <span className="font-pixel text-xs text-ember/70">{i + 1}</span>
                      <span className={`flex-1 ${m.done ? 'text-bone-faint line-through' : ''}`}>{m.title}</span>
                      {!m.done && (
                        <button type="button" onClick={() => setMilestones(milestones.filter((x) => x.id !== m.id))} className="text-bone-faint hover:text-blood-light" aria-label="Remove milestone">
                          <X size={14} />
                        </button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={msDraft}
                  onChange={(e) => setMsDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMs();
                    }
                  }}
                  placeholder="Add a milestone…"
                  aria-label="New milestone"
                />
                <button type="button" onClick={addMs} className="btn-ghost px-3" aria-label="Add milestone"><Plus size={16} /></button>
              </div>
              <p className="text-[11px] text-bone-faint">Each milestone gives {BASE_XP[difficulty] * 2} XP. Finishing the quest gives {BASE_XP[difficulty] * 10} XP.</p>
            </div>
            <div className="space-y-2">
              <label className="label" htmlFor="item-reward-title">Title earned on completion (optional)</label>
              <input id="item-reward-title" className="input" value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} placeholder="e.g. the Marathoner" />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="label" htmlFor="item-notes">Notes</label>
          <textarea id="item-notes" className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why does this matter to you?" />
        </div>

      </form>
    </Sheet>
  );
}
