import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { get } from 'idb-keyval';
import { Download } from 'lucide-react';
import { useGame, PRE_PILLARS_KEY } from '../store/useGame';
import { useHeroClass } from '../hooks';
import { Icon } from './Icon';
import { rgba } from '../art/color';

const MAPPING = [
  ['Strength + Vitality', 'body'],
  ['Intellect', 'mind'],
  ['Wisdom + Charisma', 'spirit'],
  ['Discipline', 'discipline'],
] as const;

/** One-time explanation shown after an existing save is upgraded to the four pillars. */
export default function PillarsNotice() {
  const show = useGame((s) => !!s.settings.pillarsNotice && !!s.hero);
  const defs = useGame((s) => s.statDefs);
  const stats = useGame((s) => s.hero?.stats);
  const updateSettings = useGame((s) => s.updateSettings);
  const cls = useHeroClass();

  const downloadOld = async () => {
    const json = await get<string>(PRE_PILLARS_KEY);
    if (!json) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'ashen-oath-before-pillars.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[85] grid place-items-center p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="pillars-notice">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="panel relative max-h-[calc(100dvh-2.5rem)] w-full max-w-sm overflow-y-auto p-6"
            style={{ background: 'linear-gradient(180deg, #1f1a25, #141118)' }}
          >
            <p className="label text-center text-ember-light">Your stats are reforged</p>
            <h2 className="h-display mt-1 text-center text-2xl font-black">The Four Pillars</h2>
            <p className="mt-2 text-center text-sm text-bone-dim">Six stats became four. Every point of progress was carried over.</p>
            <ul className="mt-4 space-y-2">
              {MAPPING.map(([from, to]) => {
                const d = defs.find((x) => x.id === to)!;
                return (
                  <li key={to} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: rgba(d.color, 0.08) }}>
                    <span className="flex-1 text-xs text-bone-faint">{from}</span>
                    <span className="text-bone-faint">→</span>
                    <span className="flex w-36 shrink-0 items-center gap-1.5 text-sm font-bold" style={{ color: d.color }}>
                      <Icon name={d.icon} size={14} /> {d.name}
                      <span className="ml-auto font-pixel text-xs">LV {stats?.[to]?.level ?? 1}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-bone-dim">
              Your rank is now <b style={{ color: cls.aura }}>{cls.name}</b>. Each habit now trains a single pillar. Yours were re-tagged automatically, so glance over them in Quests and adjust any that feel wrong.
            </p>
            <p className="mt-2 text-xs text-bone-faint">Discipline also grows on its own now, from perfect days, streak milestones and resisting vices.</p>
            <button className="btn-ghost mt-4 w-full text-xs" onClick={downloadOld}><Download size={14} /> Save a copy of the old save</button>
            <button className="btn-primary mt-2 w-full" onClick={() => updateSettings({ pillarsNotice: false })} autoFocus>Onward</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
