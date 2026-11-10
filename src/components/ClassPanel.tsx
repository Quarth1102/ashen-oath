import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lock } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useHeroClass } from '../hooks';
import {
  CLASS_BONUS, CLASS_UNLOCK_LEVEL, HYBRID_MIN_SHARE, HYBRID_RATIO, allClassIds, determineClassId, normalizeClassId,
  resolveClass, standing,
} from '../game/classes';
import { pairKey } from '../data/classes';
import { Icon } from './Icon';
import { Sheet } from './ui';
import { rgba } from '../art/color';

export default function ClassPanel() {
  const hero = useGame((s) => s.hero)!;
  const defs = useGame((s) => s.statDefs);
  const cls = useHeroClass();
  const [codex, setCodex] = useState(false);
  const { shares, total } = useMemo(() => standing(defs, hero.stats), [defs, hero.stats]);
  const name = (id: string) => defs.find((d) => d.id === id)?.name ?? id;
  const def = (id: string) => defs.find((d) => d.id === id);

  const hint = useMemo(() => {
    const [first, second] = shares;
    if (hero.level < CLASS_UNLOCK_LEVEL) {
      const lean = resolveClass(determineClassId(defs, hero.stats, CLASS_UNLOCK_LEVEL), defs);
      return total > 0
        ? `Your class awakens at level ${CLASS_UNLOCK_LEVEL}. Right now you lean toward ${lean.kind === 'wanderer' ? 'no path yet' : `the ${lean.name}`}.`
        : `Your class awakens at level ${CLASS_UNLOCK_LEVEL}, shaped by the stats your deeds train.`;
    }
    if (cls.kind === 'pure' && first && second) {
      const hybrid = resolveClass(`hybrid:${pairKey(first.id, second.id)}`, defs);
      const need = Math.ceil(first.xp * HYBRID_RATIO);
      return `Train ${name(second.id)} up to ${need} XP (now ${second.xp}) to walk the path of the ${hybrid.name}.`;
    }
    if (cls.kind === 'hybrid') return `Keep ${cls.stats.map(name).join(' and ')} close to remain a ${cls.name}. Let one fall behind and you return to a single path.`;
    if (cls.kind === 'paragon') return 'Keep every stat in balance to remain a Paragon.';
    return '';
  }, [shares, total, hero.level, hero.stats, cls, defs]);

  const bonusPct = cls.kind === 'pure' ? CLASS_BONUS.pure : cls.kind === 'hybrid' ? CLASS_BONUS.hybrid : cls.kind === 'paragon' ? CLASS_BONUS.paragon : 0;
  const attained = new Set((hero.classesAttained ?? []).map(normalizeClassId));
  const current = normalizeClassId(hero.classId);

  return (
    <div className="panel overflow-hidden p-4" data-testid="class-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">Class</p>
          <h2 className="h-display text-2xl font-black" style={{ color: cls.aura }}>{cls.name}</h2>
          <p className="text-xs" style={{ color: cls.aura }}>{cls.epithet}</p>
        </div>
        <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setCodex(true)}><BookOpen size={14} /> Codex</button>
      </div>
      <p className="mt-2 text-sm text-bone-dim">{cls.desc}</p>
      {bonusPct > 0 && (
        <p className="mt-1 text-xs text-spectral">+{bonusPct}% XP to {cls.kind === 'paragon' ? 'every stat' : cls.stats.map(name).join(' and ')}</p>
      )}

      <div className="mt-4 space-y-2">
        <p className="label">Where your effort goes</p>
        {total === 0 && <p className="text-xs text-bone-faint">Complete deeds tagged with stats to shape your path.</p>}
        {total > 0 && shares.slice(0, 4).map((r, i) => {
          const d = def(r.id);
          return (
            <div key={r.id} className="flex items-center gap-2">
              <span className="w-5" style={{ color: d?.color }}><Icon name={d?.icon ?? 'star'} size={14} /></span>
              <span className="w-20 truncate text-xs">{d?.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/50">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(r.share * 100)}%` }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 120, damping: 20 }}
                  style={{ background: d?.color }}
                />
              </div>
              <span className="w-9 text-right text-[11px] tabular-nums text-bone-faint">{Math.round(r.share * 100)}%</span>
            </div>
          );
        })}
      </div>
      {hint && <p className="mt-3 rounded-lg bg-ash-900/70 px-3 py-2 text-xs text-bone-dim">{hint}</p>}
      <p className="mt-2 text-[11px] text-bone-faint">Your class is reassessed at the start of each day and whenever you level up.</p>

      <Sheet open={codex} onClose={() => setCodex(false)} title="Codex of Paths">
        <p className="mb-3 text-xs text-bone-faint">
          One stat clearly ahead earns a single-path class. When your top two stats are close (the second at least {Math.round(HYBRID_RATIO * 100)}% of the first, and at least {Math.round(HYBRID_MIN_SHARE * 100)}% of all your stat XP), you walk a hybrid path. Train everything evenly to become a Paragon.
        </p>
        <ul className="space-y-2">
          {allClassIds(defs).map((id) => {
            const c = resolveClass(id, defs);
            const known = attained.has(id) || id === current;
            return (
              <li key={id} className="panel-inset flex items-center gap-3 p-3" style={id === current ? { borderColor: rgba(c.aura, 0.7) } : undefined}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: rgba(c.aura, known ? 0.18 : 0.06), color: known ? c.aura : '#6b5f73' }}>
                  {known ? <Icon name={c.kind === 'paragon' ? 'sparkles' : def(c.stats[0])?.icon ?? 'star'} size={16} /> : <Lock size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: known ? c.aura : undefined }}>
                    {c.name}{id === current && <span className="ml-2 text-[10px] font-semibold text-ember-light">CURRENT</span>}
                  </p>
                  <p className="text-[11px] text-bone-faint">{c.kind === 'paragon' ? 'All stats in balance' : c.stats.map(name).join(' + ')}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
