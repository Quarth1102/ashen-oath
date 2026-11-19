import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Dices, Gift, Repeat, ScrollText, TrendingUp } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useToday } from '../hooks';
import type { DailyQuest } from '../game/types';
import { Icon } from './Icon';
import { rgba } from '../art/color';

function QuestRow({ q, canReroll }: { q: DailyQuest; canReroll: boolean }) {
  const def = useGame((s) => s.statDefs.find((d) => d.id === q.pillar));
  const { completeDailyQuest, uncompleteDailyQuest, rerollDailyQuest } = useGame.getState();
  const [float, setFloat] = useState(0);
  const color = def?.color ?? '#e0a33a';
  const manual = q.kind !== 'count';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="relative flex items-center gap-3 rounded-xl border p-2.5"
      style={{ borderColor: rgba(color, q.done ? 0.55 : 0.22), background: rgba(color, q.done ? 0.1 : 0.03) }}
      data-testid="daily-quest"
    >
      <AnimatePresence>
        {float > 0 && (
          <motion.span
            key={float}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -34 }}
            transition={{ duration: 1.2 }}
            onAnimationComplete={() => setFloat(0)}
            className="pointer-events-none absolute left-12 top-0 font-pixel text-sm font-semibold"
            style={{ color }}
          >
            +{q.xp} XP
          </motion.span>
        )}
      </AnimatePresence>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: rgba(color, 0.15), color }}>
        <Icon name={def?.icon ?? 'star'} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-snug ${q.done ? 'text-bone-faint line-through' : ''}`} style={{ textDecorationColor: color }}>{q.title}</p>
        <p className="text-[11px] leading-snug text-bone-faint">{q.detail}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
          {q.kind === 'boost' && <span className="inline-flex items-center gap-0.5 text-ember-light"><TrendingUp size={10} /> Boost</span>}
          {q.kind === 'count' && <span className="inline-flex items-center gap-0.5 text-spectral"><Repeat size={10} /> Tracked</span>}
          <span style={{ color }}>{def?.name} · +{q.xp} XP</span>
          {canReroll && !q.done && (
            <button type="button" onClick={() => rerollDailyQuest(q.id)} className="inline-flex items-center gap-0.5 text-bone-faint hover:text-bone" data-testid="reroll">
              <Dices size={11} /> Reroll
            </button>
          )}
        </div>
      </div>
      {manual ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            if (q.done) uncompleteDailyQuest(q.id);
            else {
              completeDailyQuest(q.id);
              setFloat(Date.now());
            }
          }}
          aria-label={q.done ? `Undo ${q.title}` : `Complete ${q.title}`}
          aria-pressed={q.done}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 transition-colors"
          style={{ borderColor: q.done ? color : '#4a4052', background: q.done ? color : 'rgba(0,0,0,.35)' }}
        >
          {q.done && <Check size={20} strokeWidth={3} className="text-void" />}
        </motion.button>
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 font-pixel text-sm" style={{ borderColor: q.done ? color : rgba(color, 0.4), background: q.done ? color : 'transparent', color: q.done ? '#0d0b10' : color }}>
          {q.done ? <Check size={20} strokeWidth={3} /> : `${q.progress ?? 0}/${q.target}`}
        </div>
      )}
    </motion.li>
  );
}

/** Today's generated quest line: three quests, weighted toward the weakest pillars. */
export default function DailyQuests() {
  const line = useGame((s) => s.dailyQuests);
  const resetHour = useGame((s) => s.settings.resetHour);
  const today = useToday();
  if (!line || line.day !== today) return null;
  const done = line.quests.filter((q) => q.done).length;
  const complete = done === line.quests.length;
  return (
    <section className="panel overflow-hidden p-3" style={complete ? { borderColor: rgba('#e0a33a', 0.6) } : undefined} data-testid="daily-quests">
      <div className="mb-2.5 flex items-start gap-2.5">
        <ScrollText size={20} className="mt-0.5 shrink-0 text-ember-light" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="h-display text-lg font-bold">Daily Quests</h2>
            <span className="font-pixel text-sm text-ember-light">{done}/{line.quests.length}</span>
          </div>
          <p className="text-[11px] text-bone-faint">
            {complete ? 'Quest line complete. Your chest waits in Camp.' : `Finish all three for a loot chest · new quests at ${resetHour === 0 ? 'midnight' : `${resetHour}:00`}`}
          </p>
        </div>
      </div>
      <AnimatePresence>
        {complete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 flex items-center gap-2 rounded-lg bg-ember-dark/25 px-3 py-2 text-xs text-ember-light">
            <Gift size={14} /> +1 loot chest and bonus XP for every pillar
          </motion.div>
        )}
      </AnimatePresence>
      <ul className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {line.quests.map((q) => <QuestRow key={q.id} q={q} canReroll={line.rerolls > 0} />)}
        </AnimatePresence>
      </ul>
    </section>
  );
}
