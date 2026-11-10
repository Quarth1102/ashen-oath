import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { StatDef } from '../game/types';
import { rgba } from '../art/color';

export function Bar({
  value, max, color, className = '', height = 8, glow = false,
}: { value: number; max: number; color: string; className?: string; height?: number; glow?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`relative overflow-hidden rounded-full bg-black/50 ring-1 ring-white/5 ${className}`} style={{ height }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{
          background: `linear-gradient(180deg, ${color}, ${rgba(color, 0.7)})`,
          boxShadow: glow ? `0 0 10px ${rgba(color, 0.6)}` : undefined,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/10" />
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={title}
            className={`panel relative max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 pb-[calc(1.25rem+var(--safe-bottom))] sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{ background: 'linear-gradient(180deg, #1f1a25, #141118)' }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="h-display text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-bone-dim hover:bg-ash-700 hover:text-bone" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StatBadge({ def, size = 'sm' }: { def: StatDef; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ color: def.color, borderColor: rgba(def.color, 0.35), background: rgba(def.color, 0.08) }}
    >
      <Icon name={def.icon} size={size === 'xs' ? 10 : 12} />
      {def.name}
    </span>
  );
}

export function StatPicker({ defs, value, onChange }: { defs: StatDef[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {defs.map((d) => {
        const on = value.includes(d.id);
        return (
          <button
            type="button"
            key={d.id}
            onClick={() => onChange(on ? value.filter((x) => x !== d.id) : [...value, d.id])}
            className="chip"
            style={{
              color: on ? '#0d0b10' : d.color,
              background: on ? d.color : rgba(d.color, 0.06),
              borderColor: rgba(d.color, on ? 0.9 : 0.35),
            }}
          >
            <Icon name={d.icon} size={13} />
            {d.name}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange, layoutId,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; layoutId: string }) {
  return (
    <div className="relative flex rounded-lg border border-ash-600/60 bg-ash-900/80 p-1">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${value === o.value ? 'text-void' : 'text-bone-dim hover:text-bone'}`}
        >
          {value === o.value && (
            <motion.span layoutId={layoutId} className="absolute inset-0 -z-10 rounded-md bg-gradient-to-b from-ember-light to-ember" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SkullRating({ n, max = 4 }: { n: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`difficulty ${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="skull" size={11} className={i < n ? 'text-bone-dim' : 'text-ash-500'} />
      ))}
    </span>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="panel-inset flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Icon name={icon} size={28} className="text-ash-400" />
      <p className="h-display text-base">{title}</p>
      {children && <div className="text-sm text-bone-faint">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-bone-faint">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
