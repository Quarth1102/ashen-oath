import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useGame } from '../store/useGame';
import { groupByStat } from '../game/groups';
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
