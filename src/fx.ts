/** Tiny event bus for screen-space effects (XP orbs flying to the HUD). */
export interface XpFlight {
  x: number;
  y: number;
  color: string;
  orbs: number;
}

export const XP_FLY = 'ashen:xp-fly';
export const XP_LAND = 'ashen:xp-land';

/** Launch XP orbs from an element (or a point) toward the HUD's XP bar. */
export function flyXp(from: Element | { x: number; y: number } | null | undefined, color = '#f5c96a', orbs = 7) {
  if (typeof window === 'undefined' || !from) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    window.dispatchEvent(new CustomEvent(XP_LAND));
    return;
  }
  let x: number;
  let y: number;
  if ('getBoundingClientRect' in from) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else ({ x, y } = from);
  window.dispatchEvent(new CustomEvent<XpFlight>(XP_FLY, { detail: { x, y, color, orbs } }));
}
