import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useGame } from '../store/useGame';
import { HABIT_TIERS, groupByStat, habitTier } from '../game/groups';
import type { Habit } from '../game/types';
import type { StatDef } from '../game/types';
import { Icon } from './Icon';
import { rgba } from '../art/color';

/** A collapsible list section. Its open/closed state is remembered under `id`. */
export function GroupSection({
  id, title, icon, color = '#b5ab9b', count, children, muted = false,
}: { id: string; title: string; icon: string; color?: string; count: number; children: ReactNode; muted?: boolean }) {
  const collapsed = useGame((s) => (s.settings.collapsed ?? []).includes(id));
  const toggle = useGame((s) => s.toggleCollapsed);
  return (
    <motion.section layout="position" className="space-y-2" data-testid={`group-${id}`}>
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-ash-800/60 ${muted ? 'opacity-70' : ''}`}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: rgba(color, 0.14), color }}>
          <Icon name={icon} size={13} />
        </span>
        <span className="font-display text-sm font-bold tracking-wide" style={{ color }}>{title}</span>
        <span className="font-pixel text-xs text-bone-faint">{count}</span>
        <span className="h-px flex-1 bg-ash-600/50" />
        <motion.span animate={{ rotate: collapsed ? -90 : 0 }} className="text-bone-faint">
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="space-y-2 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Renders items in collapsible sections, one per primary stat. */
export function StatGroups<T extends { id: string; statIds: string[] }>({
  scope, items, defs, render,
}: { scope: string; items: T[]; defs: StatDef[]; render: (item: T) => ReactNode }) {
  return (
    <div className="space-y-3">
      {groupByStat(items, defs).map((g) => (
        <GroupSection
          key={g.key}
          id={`${scope}:${g.key}`}
          title={g.def?.name ?? 'Untagged'}
          icon={g.def?.icon ?? 'scroll'}
          color={g.def?.color}
          count={g.items.length}
        >
          <AnimatePresence initial={false}>{g.items.map(render)}</AnimatePresence>
        </GroupSection>
      ))}
    </div>
  );
}

/** Habits split into Daily / Weekly / Anytime / Vices, each grouped by stat inside. */
export function HabitTiers({ scope, habits, defs, render }: { scope: string; habits: Habit[]; defs: StatDef[]; render: (h: Habit) => ReactNode }) {
  return (
    <div className="space-y-5">
      {HABIT_TIERS.map((t) => {
        const items = habits.filter((h) => habitTier(h) === t.id);
        if (!items.length) return null;
        return (
          <TierSection key={t.id} id={`${scope}:tier:${t.id}`} title={t.title} subtitle={t.subtitle} icon={t.icon} color={t.color} count={items.length}>
            <StatGroups scope={`${scope}:${t.id}`} items={items} defs={defs} render={render} />
          </TierSection>
        );
      })}
    </div>
  );
}

/** A top-level, collapsible section with a heading and a short explanation. */
export function TierSection({
  id, title, subtitle, icon, color, count, children,
}: { id: string; title: string; subtitle: string; icon: string; color: string; count: number; children: ReactNode }) {
  const collapsed = useGame((s) => (s.settings.collapsed ?? []).includes(id));
  const toggle = useGame((s) => s.toggleCollapsed);
  return (
    <motion.section layout="position" className="rounded-2xl border p-3" style={{ borderColor: rgba(color, 0.3), background: rgba(color, 0.04) }} data-testid={`tier-${id}`}>
      <button type="button" onClick={() => toggle(id)} aria-expanded={!collapsed} className="flex w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: rgba(color, 0.16), color }}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="h-display text-lg font-bold" style={{ color }}>{title}</span>
            <span className="font-pixel text-sm text-bone-faint">{count}</span>
          </span>
          <span className="block text-[11px] text-bone-faint">{subtitle}</span>
        </span>
        <motion.span animate={{ rotate: collapsed ? -90 : 0 }} className="text-bone-faint">
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
