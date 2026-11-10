import { useEffect, useMemo, useState } from 'react';
import { useGame } from './store/useGame';
import { dayKey } from './game/dates';
import { REGION_BY_ID, highestRegion, type Region } from './data/regions';
import type { SpriteLook } from './art/sprite';
import type { Hero } from './game/types';
import { resolveClass } from './game/classes';
import type { ClassInfo } from './data/classes';

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useToday() {
  const resetHour = useGame((s) => s.settings.resetHour);
  const now = useNow();
  return dayKey(now, resetHour);
}

/** Runs the daily reset on mount, every minute, and whenever the app comes back to the foreground. */
export function useDailyReset() {
  const hydrated = useGame((s) => s.hydrated);
  const hasHero = useGame((s) => !!s.hero);
  useEffect(() => {
    if (!hydrated || !hasHero) return;
    const run = () => useGame.getState().processDay();
    run();
    const t = setInterval(run, 60_000);
    const onVis = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', run);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', run);
    };
  }, [hydrated, hasHero]);
}

export function useRegion(): Region {
  const level = useGame((s) => s.hero?.level ?? 1);
  const chosen = useGame((s) => s.settings.regionId);
  const r = chosen ? REGION_BY_ID[chosen] : undefined;
  return r && level >= r.minLevel ? r : highestRegion(level);
}

export function lookOf(hero: Pick<Hero, 'appearance' | 'equipped'>): SpriteLook {
  return { appearance: hero.appearance, equipped: hero.equipped };
}

export function useHeroLook(): SpriteLook | null {
  const ap = useGame((s) => s.hero?.appearance);
  const eq = useGame((s) => s.hero?.equipped);
  return useMemo(() => (ap && eq ? { appearance: ap, equipped: eq } : null), [ap, eq]);
}

/** The hero's current (earned) class, resolved against their stat definitions. */
export function useHeroClass(): ClassInfo {
  const classId = useGame((s) => s.hero?.classId ?? 'wanderer');
  const defs = useGame((s) => s.statDefs);
  return useMemo(() => resolveClass(classId, defs), [classId, defs]);
}
