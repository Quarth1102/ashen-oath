import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palmtree, ScrollText, Sparkles } from 'lucide-react';
import { useGame } from '../store/useGame';
import { weekRecap } from '../game/recap';
import { addDays, parseDay } from '../game/dates';
import { useHeroClass } from '../hooks';
import { Bar } from './ui';
import { Icon } from './Icon';
import { rgba } from '../art/color';

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => parseDay(d).toLocaleDateString(undefined, opts);

/** One week of the Chronicle: totals, best day, stats trained, and how each habit held up. */
export default function WeeklyRecapView({ week, onClose }: { week: string; onClose?: () => void }) {
  const state = useGame();
  const cls = useHeroClass();
  const r = useMemo(() => weekRecap(state, week), [state, week]);
  const defs = state.statDefs;
  const def = (id: string) => defs.find((d) => d.id === id);
  const weakest = [...r.habits].reverse().find((h) => h.rate < 1);
  const strongest = r.habits.find((h) => h.rate === 1);
  const maxStat = Math.max(1, ...r.stats.map((x) => x.xp));

  const advice = (() => {
    if (!r.deeds) return 'A quiet week. Even one small deed a day rekindles the fire.';
    if (weakest && weakest.rate < 0.6) return `“${weakest.title}” slipped to ${weakest.done} of ${weakest.due}. Try doing it right after something you never miss.`;
    if (r.perfectDays.length >= 5) return 'A near-flawless week. Consider raising the difficulty of a habit that has become easy.';
    if (r.stats.length && r.stats.length < Math.min(3, defs.length)) return `Most of your effort went to ${def(r.stats[0].id)?.name}. A deed for another stat would round out your path.`;
    return 'A steady week. Keep the flame fed.';
  })();

  const tiles = [
    { label: 'XP earned', value: r.xp },
    { label: 'Deeds', value: r.deeds },
    { label: 'Perfect days', value: r.perfectDays.length },
    { label: 'Days active', value: r.activeDays },
  ];

  return (
    <div className="w-full text-left" data-testid="weekly-recap">
      <div className="flex items-center justify-center gap-2 text-ember-light">
        <ScrollText size={18} />
        <p className="label text-ember-light">The Chronicle</p>
      </div>
      <h2 className="h-display mt-1 text-center text-2xl font-black">
        Week of {fmt(week, { month: 'short', day: 'numeric' })} – {fmt(addDays(week, 6), { month: 'short', day: 'numeric' })}
      </h2>
      <p className="mt-1 text-center text-xs text-bone-faint">
        {state.hero?.name}, {cls.name} {cls.epithet}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="panel-inset px-1 py-2 text-center">
            <p className="font-pixel text-xl text-ember-light">{t.value}</p>
            <p className="text-[9px] uppercase leading-tight tracking-wider text-bone-faint">{t.label}</p>
          </motion.div>
        ))}
      </div>

      {r.vacationDays > 0 && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-spectral">
          <Palmtree size={13} /> {r.vacationDays} day{r.vacationDays > 1 ? 's' : ''} away on a journey
        </p>
      )}

      {r.bestDay && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-ash-900/60 px-3 py-2 text-sm">
          <Sparkles size={15} className="shrink-0 text-ember-light" />
          <span>
            Best day: <b>{fmt(r.bestDay.day, { weekday: 'long' })}</b>, {r.bestDay.xp} XP
          </span>
        </p>
      )}

      {r.stats.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="label">Stats trained</p>
          {r.stats.slice(0, 5).map((x) => {
            const d = def(x.id);
            return (
              <div key={x.id} className="flex items-center gap-2 text-xs">
                <span className="w-4" style={{ color: d?.color }}><Icon name={d?.icon ?? 'star'} size={13} /></span>
                <span className="w-20 truncate">{d?.name}</span>
                <Bar value={x.xp} max={maxStat} color={d?.color ?? '#e0a33a'} height={6} className="flex-1" />
                <span className="w-12 text-right tabular-nums text-bone-faint">{x.xp} XP</span>
              </div>
            );
          })}
        </div>
      )}

      {r.habits.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="label">Habits</p>
          {r.habits.map((h) => (
            <div key={h.id} className="flex items-center gap-2 text-xs">
              <span className="w-28 truncate" style={{ color: h.rate === 1 ? '#f5c96a' : h.rate < 0.6 ? '#ff5a64' : undefined }}>{h.title}</span>
              <Bar value={h.done} max={h.due} color={h.rate === 1 ? '#e0a33a' : h.rate < 0.6 ? '#d13a48' : '#5fd1c1'} height={6} className="flex-1" />
              <span className="w-10 text-right tabular-nums text-bone-faint">{h.done}/{h.due}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg border px-3 py-2.5 text-sm italic text-bone-dim" style={{ borderColor: rgba('#e0a33a', 0.3), background: rgba('#e0a33a', 0.06) }}>
        {strongest && <p className="mb-1 not-italic text-ember-light">Never missed: {strongest.title}.</p>}
        {advice}
      </div>

      {onClose && <button className="btn-primary mt-5 w-full" onClick={onClose} autoFocus>Onward</button>}
    </div>
  );
}
