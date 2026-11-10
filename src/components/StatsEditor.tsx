import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { StatDef } from '../game/types';
import { Icon, STAT_ICON_KEYS } from './Icon';
import { STAT_COLORS } from '../data/stats';
import { rgba } from '../art/color';

interface Props {
  defs: StatDef[];
  onAdd: (d: Omit<StatDef, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<StatDef, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export default function StatsEditor({ defs, onAdd, onUpdate, onRemove }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {defs.map((d) => (
          <motion.div key={d.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="panel-inset overflow-hidden">
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => setOpen(open === d.id ? null : d.id)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition"
                style={{ color: d.color, borderColor: rgba(d.color, 0.5), background: rgba(d.color, 0.1) }}
                aria-label={`Change icon and colour for ${d.name}`}
                aria-expanded={open === d.id}
              >
                <Icon name={d.icon} size={18} />
              </button>
              <input className="input py-2" value={d.name} onChange={(e) => onUpdate(d.id, { name: e.target.value })} aria-label="Stat name" />
              {defs.length > 1 && (
                confirm === d.id ? (
                  <button type="button" className="btn-danger px-3 py-2 text-xs" onClick={() => { onRemove(d.id); setConfirm(null); }}>Remove?</button>
                ) : (
                  <button type="button" className="rounded-lg p-2 text-bone-faint hover:text-blood-light" onClick={() => setConfirm(d.id)} aria-label={`Remove ${d.name}`}>
                    <Trash2 size={16} />
                  </button>
                )
              )}
            </div>
            <AnimatePresence>
              {open === d.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="space-y-3 border-t border-ash-600/40 p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {STAT_ICON_KEYS.map((k) => (
                        <button type="button" key={k} onClick={() => onUpdate(d.id, { icon: k })} className={`grid h-8 w-8 place-items-center rounded-md ${d.icon === k ? 'bg-ash-600 text-bone' : 'text-bone-faint hover:bg-ash-700'}`} aria-label={k}>
                          <Icon name={k} size={15} />
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STAT_COLORS.map((c) => (
                        <button type="button" key={c} onClick={() => onUpdate(d.id, { color: c })} className={`h-7 w-7 rounded-full border-2 ${d.color === c ? 'border-bone' : 'border-transparent'}`} style={{ background: c }} aria-label={`colour ${c}`} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => onAdd({ name: 'New Stat', icon: STAT_ICON_KEYS[defs.length % STAT_ICON_KEYS.length], color: STAT_COLORS[defs.length % STAT_COLORS.length] })}
      >
        <Plus size={16} /> Add a stat
      </button>
    </div>
  );
}
