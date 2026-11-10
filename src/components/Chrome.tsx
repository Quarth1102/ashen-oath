import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, Gift, ListChecks, Scroll, Settings, Shield, Store, Tent } from 'lucide-react';
import { useGame } from '../store/useGame';
import { heroXpToNext } from '../game/xp';
import { Bar } from './ui';
import HeroSprite from './HeroSprite';
import { useHeroLook } from '../hooks';
import { CLASS_BY_ID } from '../data/classes';

export const NAV = [
  { to: '/', label: 'Camp', icon: Tent },
  { to: '/quests', label: 'Quests', icon: ListChecks },
  { to: '/hero', label: 'Hero', icon: Shield },
  { to: '/market', label: 'Market', icon: Store },
  { to: '/chronicle', label: 'Chronicle', icon: Scroll },
];

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span key={value} initial={{ scale: 1.35, color: '#f5c96a' }} animate={{ scale: 1, color: 'inherit' }} transition={{ duration: 0.5 }} className={`inline-block tabular-nums ${className}`}>
      {value.toLocaleString()}
    </motion.span>
  );
}

export function Hud() {
  const hero = useGame((s) => s.hero);
  const chests = useGame((s) => s.pendingChests);
  const look = useHeroLook();
  if (!hero || !look) return null;
  const need = heroXpToNext(hero.level);
  return (
    <div className="panel flex items-center gap-3 px-3 py-2.5" data-testid="hud">
      <NavLink to="/hero" className="shrink-0 overflow-hidden rounded-lg bg-ash-900/80 ring-1 ring-ash-600/60">
        <div className="-mb-1 -mt-0.5 h-11 w-11 overflow-hidden">
          <HeroSprite look={look} size={64} idle={false} shadow={false} className="-ml-[10px] -mt-[2px]" />
        </div>
      </NavLink>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-sm font-bold">
            {hero.name} <span className="font-body text-xs font-normal text-bone-faint">{CLASS_BY_ID[hero.classId]?.name}</span>
          </p>
          <p className="font-pixel text-xs text-ember-light" data-testid="hud-level">LV {hero.level}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 font-pixel text-[10px] text-blood-light">HP</span>
          <Bar value={hero.hp} max={hero.maxHp} color="#d13a48" className="flex-1" height={7} />
          <span className="w-14 text-right text-[10px] font-medium text-bone-dim tabular-nums" data-testid="hud-hp">{hero.hp}/{hero.maxHp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 font-pixel text-[10px] text-ember-light">XP</span>
          <Bar value={hero.xp} max={need} color="#e0a33a" className="flex-1" height={7} glow />
          <span className="w-14 text-right text-[10px] font-medium text-bone-dim tabular-nums" data-testid="hud-xp">{hero.xp}/{need}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <NavLink to="/market" className="flex items-center gap-1 rounded-full bg-ember-dark/30 px-2 py-0.5 font-pixel text-sm text-ember-light ring-1 ring-ember/30" data-testid="hud-gold">
          <Coins size={13} /> <AnimatedNumber value={hero.gold} />
        </NavLink>
        <div className="flex items-center gap-1">
          {chests > 0 && (
            <NavLink to="/market" className="relative rounded-full p-1 text-ember-light" aria-label={`${chests} chests to open`}>
              <motion.span animate={{ rotate: [0, -12, 12, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6, repeatDelay: 1.2 }} className="block">
                <Gift size={16} />
              </motion.span>
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-blood px-1 text-[9px] font-bold">{chests}</span>
            </NavLink>
          )}
          <NavLink to="/settings" className="rounded-full p-1 text-bone-faint hover:text-bone md:hidden" aria-label="Settings">
            <Settings size={16} />
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ash-600/50 bg-ash-900/90 pb-[var(--safe-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {NAV.map(({ to, label, icon: I }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <NavLink to={to} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold tracking-wide transition ${active ? 'text-ember-light' : 'text-bone-faint'}`}>
                {active && <motion.span layoutId="nav-dot" className="absolute top-0 h-0.5 w-10 rounded-full bg-ember shadow-glow" />}
                <motion.span animate={{ y: active ? -2 : 0, scale: active ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                  <I size={20} />
                </motion.span>
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideRail() {
  const { pathname } = useLocation();
  const items = [...NAV, { to: '/settings', label: 'Settings', icon: Settings }];
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-ash-600/40 bg-ash-900/60 p-4 md:flex">
      <div className="mb-6 px-2 pt-2">
        <p className="h-display text-xl font-black text-ember-light">Ashen Oath</p>
        <p className="text-xs text-bone-faint">Forge yourself in ash.</p>
      </div>
      {items.map(({ to, label, icon: I }) => {
        const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
        return (
          <NavLink key={to} to={to} className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? 'text-ember-light' : 'text-bone-dim hover:bg-ash-800 hover:text-bone'}`}>
            {active && <motion.span layoutId="rail-bg" className="absolute inset-0 -z-0 rounded-lg border border-ember/30 bg-ember-dark/20" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <I size={18} className="relative" />
            <span className="relative">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
