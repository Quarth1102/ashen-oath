import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MapPin } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useRegion, useToday } from '../hooks';
import { ACHIEVEMENTS } from '../data/achievements';
import { REGIONS, type Region } from '../data/regions';
import { regionLayers } from '../art/landscape';
import { addDays, weekStart, parseDay } from '../game/dates';
import { activeStreak } from '../game/streaks';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/ui';

type Tab = 'deeds' | 'calendar' | 'journey' | 'log';
const TABS: { id: Tab; label: string }[] = [
  { id: 'deeds', label: 'Feats' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'journey', label: 'Journey' },
  { id: 'log', label: 'Log' },
];

function RegionThumb({ r, dim }: { r: Region; dim?: boolean }) {
  const l = useMemo(() => regionLayers(r), [r]);
  return (
    <div className={`relative h-24 overflow-hidden ${dim ? 'grayscale brightness-[.35]' : ''}`}>
      {[l.sky, l.far, l.mid, l.near].map((src, i) => (
        <img key={i} src={src} alt="" className="pixelated absolute inset-0 h-full w-full object-cover object-bottom" />
      ))}
    </div>
  );
}

export default function Chronicle() {
  const s = useGame();
  const hero = s.hero!;
  const today = useToday();
  const current = useRegion();
  const [tab, setTab] = useState<Tab>('deeds');
  const unlocked = Object.keys(s.achievements).length;

  const weeks = 17;
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const maxAct = Math.max(1, ...Object.values(s.dayActivity));

  const summary = [
    { label: 'Deeds done', value: s.counters.completions },
    { label: 'Best streak', value: s.habits.reduce((m, h) => Math.max(m, h.bestStreak), 0) },
    { label: 'Days active', value: Object.keys(s.dayActivity).length },
    { label: 'Current run', value: activeStreak(s.dayActivity, today) },
    { label: 'Quests won', value: s.counters.goalsDone },
    { label: 'Falls', value: s.counters.falls },
  ];

  return (
    <div>
      <PageHeader title="Chronicle" subtitle={`The saga of ${hero.name} ${hero.title}`} />
      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {summary.map((x) => (
          <div key={x.label} className="panel-inset px-2 py-3 text-center">
            <p className="font-pixel text-xl text-ember-light">{x.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone-faint">{x.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-4 flex border-b border-ash-600/50">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex-1 pb-3 text-sm font-semibold ${tab === t.id ? 'text-ember-light' : 'text-bone-faint hover:text-bone'}`}>
            {t.label}
            {tab === t.id && <motion.span layoutId="chron-tab" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ember shadow-glow" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === 'deeds' && (
            <>
              <p className="mb-3 text-sm text-bone-faint">{unlocked} of {ACHIEVEMENTS.length} feats achieved</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACHIEVEMENTS.map((a, i) => {
                  const got = s.achievements[a.id];
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} className={`panel-inset flex gap-3 p-3 ${got ? 'border-ember/40' : 'opacity-50'}`}>
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${got ? 'bg-ember/15 text-ember-light shadow-glow' : 'bg-ash-800 text-ash-400'}`}>
                        {got ? <Icon name={a.icon} size={18} /> : <Lock size={16} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight">{a.name}</p>
                        <p className="text-[11px] text-bone-faint">{a.desc}</p>
                        <p className="mt-0.5 text-[10px] text-ember/80">+{a.gold}g{a.title ? ` · “${a.title}”` : ''}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'calendar' && (
            <div className="panel overflow-x-auto p-4">
              <div className="flex gap-1">
                <div className="mr-1 flex flex-col gap-1 pt-5 text-[9px] text-bone-faint">
                  {['Mo', '', 'We', '', 'Fr', '', 'Su'].map((d, i) => <span key={i} className="h-3.5 leading-[14px]">{d}</span>)}
                </div>
                {Array.from({ length: weeks }, (_, w) => {
                  const ws = addDays(start, w * 7);
                  const month = parseDay(ws).getDate() <= 7 ? parseDay(ws).toLocaleDateString(undefined, { month: 'short' }) : '';
                  return (
                    <div key={w} className="flex flex-col gap-1">
                      <span className="h-4 text-[9px] text-bone-faint">{month}</span>
                      {Array.from({ length: 7 }, (_, d) => {
                        const day = addDays(ws, d);
                        const n = s.dayActivity[day] ?? 0;
                        const future = day > today;
                        const k = n / maxAct;
                        return (
                          <motion.span
                            key={d}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: (w * 7 + d) * 0.003 }}
                            title={`${day}: ${n} deeds`}
                            className={`h-3.5 w-3.5 rounded-[3px] ${day === today ? 'ring-1 ring-bone/70' : ''}`}
                            style={{ background: future ? 'transparent' : n ? `rgba(224,163,58,${0.25 + k * 0.75})` : '#27212d' }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-bone-faint">Each ember is a day you kept your oath.</p>
            </div>
          )}

          {tab === 'journey' && (
            <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-ash-600/60">
              {REGIONS.map((r) => {
                const open = hero.level >= r.minLevel;
                const here = current.id === r.id;
                return (
                  <li key={r.id} className="relative flex gap-4">
                    <span className={`relative z-10 mt-8 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${here ? 'border-ember bg-ember text-void shadow-glow' : open ? 'border-ember/50 bg-ash-800 text-ember-light' : 'border-ash-600 bg-ash-900 text-ash-400'}`}>
                      {open ? <MapPin size={16} /> : <Lock size={14} />}
                    </span>
                    <button
                      disabled={!open}
                      onClick={() => s.updateSettings({ regionId: r.id })}
                      className={`panel flex-1 overflow-hidden text-left transition ${here ? 'ring-1 ring-ember/60' : ''} ${open ? 'hover:brightness-110' : ''}`}
                    >
                      <RegionThumb r={r} dim={!open} />
                      <div className="p-3">
                        <div className="flex items-baseline justify-between">
                          <p className="font-display font-bold" style={{ color: open ? r.accent : undefined }}>{open ? r.name : '???'}</p>
                          <span className="font-pixel text-[11px] text-bone-faint">LV {r.minLevel}</span>
                        </div>
                        <p className="mt-1 text-xs text-bone-faint">{open ? r.lore : `Reach level ${r.minLevel} to discover this land.`}</p>
                        {here && <p className="mt-1 text-[11px] font-semibold text-ember-light">You are here</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {tab === 'log' && (
            <ul className="panel divide-y divide-ash-600/40">
              {s.log.length === 0 && <li className="p-4 text-sm text-bone-faint">Nothing written yet.</li>}
              {s.log.slice(0, 120).map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.type === 'penalty' || e.type === 'fall' || e.type === 'slip' ? 'bg-blood-light' : e.type === 'levelup' || e.type === 'achievement' || e.type === 'goal' ? 'bg-ember-light' : e.type === 'loot' || e.type === 'purchase' ? 'bg-spectral' : 'bg-ash-400'}`} />
                  <span className="flex-1 text-bone-dim">{e.text}</span>
                  <span className="shrink-0 text-[10px] text-bone-faint">{new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
