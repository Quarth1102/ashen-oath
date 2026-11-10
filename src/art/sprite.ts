/**
 * Procedural 32×32 layered pixel-art hero. Every layer is drawn in code so the look
 * can be recoloured / re-equipped instantly. Output is a 2-frame idle sprite sheet.
 */
import type { Appearance, Slot } from '../game/types';
import { GEAR_BY_ID, type GearLook } from '../data/gear';
import { GLOWING_EYES } from '../data/appearance';
import { mix, shade } from './color';

export const SPRITE = 32;
const OUTLINE = '#0a070c';
const TUNIC = '#3a3340';
const PANTS = '#2a2430';
const BOOTS = '#1e1a1c';
const LEATHER = '#3a2616';

type Cell = string | null;

class Grid {
  px: Cell[] = new Array(SPRITE * SPRITE).fill(null);
  set(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < SPRITE && y < SPRITE) this.px[y * SPRITE + x] = c;
  }
  get(x: number, y: number): Cell {
    if (x < 0 || y < 0 || x >= SPRITE || y >= SPRITE) return null;
    return this.px[y * SPRITE + x];
  }
  clear(x: number, y: number) {
    if (x >= 0 && y >= 0 && x < SPRITE && y < SPRITE) this.px[y * SPRITE + x] = null;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** rect with a darker right column and bottom row for volume */
  srect(x: number, y: number, w: number, h: number, c: string) {
    this.rect(x, y, w, h, c);
    if (w > 1) this.rect(x + w - 1, y, 1, h, shade(c, -0.25));
    if (h > 2) this.rect(x, y + h - 1, w - 1, 1, shade(c, -0.15));
  }
  pts(list: [number, number][], c: string, ox = 0, oy = 0) {
    for (const [x, y] of list) this.set(x + ox, y + oy, c);
  }
  outline() {
    const add: number[] = [];
    for (let y = 0; y < SPRITE; y++)
      for (let x = 0; x < SPRITE; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * SPRITE + x);
      }
    for (const i of add) this.px[i] = OUTLINE;
  }
}

export interface SpriteLook {
  appearance: Appearance;
  equipped: Partial<Record<Slot, string>>;
}

const lookOf = (eq: SpriteLook['equipped'], slot: Slot): GearLook | undefined => {
  const id = eq[slot];
  return id ? GEAR_BY_ID[id]?.look : undefined;
};

function drawCloakBack(g: Grid, c: GearLook, oy: number) {
  const bottom = c.style === 'short' ? 24 : 29;
  const top = 15 + oy;
  g.rect(8, top, 16, bottom - top + 1, shade(c.color, -0.4));
  g.rect(8, top, 1, bottom - top + 1, c.color);
  g.rect(23, top, 1, bottom - top + 1, shade(c.color, -0.2));
  g.rect(8, bottom, 16, 1, c.trim);
  if (c.style === 'tattered') {
    for (let x = 8; x <= 23; x++) {
      if (x % 3 === 0) g.clear(x, bottom);
      if (x % 5 === 1) { g.clear(x, bottom); g.clear(x, bottom - 1); }
      else if (g.get(x, bottom)) g.set(x, bottom, shade(c.color, -0.3));
    }
  }
}

function drawLegs(g: Grid) {
  g.srect(12, 23, 3, 5, PANTS);
  g.srect(17, 23, 3, 5, PANTS);
  g.rect(15, 23, 2, 1, PANTS);
  g.srect(11, 28, 4, 3, BOOTS);
  g.srect(17, 28, 4, 3, BOOTS);
  g.rect(11, 28, 4, 1, shade(BOOTS, 0.15));
  g.rect(17, 28, 4, 1, shade(BOOTS, 0.15));
}

function drawBelt(g: Grid, oy: number, buckle: string) {
  g.rect(11, 22 + oy, 10, 1, LEATHER);
  g.rect(15, 22 + oy, 2, 1, buckle);
}

function drawArmor(g: Grid, a: GearLook | undefined, oy: number): string {
  const y = 15 + oy;
  if (!a) {
    g.srect(11, y, 10, 8, TUNIC);
    g.rect(14, y, 4, 1, shade(TUNIC, -0.3));
    drawBelt(g, oy, '#8a7a62');
    return TUNIC;
  }
  const c = a.color;
  switch (a.style) {
    case 'plate': {
      g.srect(11, y, 10, 8, c);
      g.rect(12, y + 1, 1, 6, shade(c, 0.25));
      g.rect(15, y + 1, 1, 6, shade(c, 0.15));
      g.rect(11, y + 3, 10, 1, shade(c, -0.15));
      drawBelt(g, oy, a.trim);
      g.srect(8, y - 1, 4, 3, c);
      g.srect(20, y - 1, 4, 3, c);
      g.rect(8, y + 1, 4, 1, a.trim);
      g.rect(20, y + 1, 4, 1, a.trim);
      g.set(9, y - 1, shade(c, 0.3));
      g.set(21, y - 1, shade(c, 0.3));
      return c;
    }
    case 'chain': {
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 10; i++) g.set(11 + i, y + j, (i + j) % 2 ? shade(c, -0.2) : c);
      g.rect(20, y, 1, 8, shade(c, -0.3));
      g.rect(13, y + 1, 6, 3, a.trim); // tabard
      g.rect(14, y + 2, 4, 1, shade(a.trim, 0.2));
      drawBelt(g, oy, '#a08a5a');
      return shade(c, -0.1);
    }
    case 'robe': {
      g.srect(11, y, 10, 8, c);
      // skirt flares over legs
      g.rect(11, 23, 10, 3, c);
      g.rect(10, 26, 12, 4, c);
      g.rect(21, 23, 1, 7, shade(c, -0.25));
      g.rect(10, 29, 12, 1, a.trim);
      g.rect(15, y + 1, 2, 29 - y - 1, shade(c, -0.2));
      g.rect(15, y + 1, 1, 29 - y - 1, shade(a.trim, -0.2));
      g.rect(13, y, 6, 1, a.trim);
      g.rect(11, 22 + oy, 10, 1, shade(c, -0.35));
      return c;
    }
    case 'leather':
    default: {
      g.srect(11, y, 10, 8, c);
      g.rect(13, y, 6, 1, shade(c, -0.35));
      for (let j = 1; j < 6; j += 2) { g.set(15, y + j, a.trim); g.set(16, y + j + 1, a.trim); }
      g.rect(11, y + 4, 2, 1, shade(c, 0.15));
      drawBelt(g, oy, a.trim);
      return c;
    }
  }
}

function drawArms(g: Grid, sleeve: string, armor: GearLook | undefined, skin: string, oy: number, holding: boolean) {
  const y = 15 + oy;
  if (armor?.style === 'robe') {
    g.srect(8, y + 1, 3, 6, sleeve);
    g.srect(21, y + 1, 3, 6, sleeve);
    g.rect(8, y + 6, 3, 1, armor.trim);
    g.rect(21, y + 6, 3, 1, armor.trim);
    g.rect(9, y + 7, 2, 1, skin);
    g.rect(21, y + 7, 2, 1, skin);
  } else {
    g.srect(9, y, 2, 7, sleeve);
    g.srect(21, y, 2, 7, sleeve);
    g.rect(9, y + 7, 2, 1, skin);
    g.rect(21, y + 7, 2, 1, skin);
  }
  if (holding) g.set(23, y + 7, skin);
}

function drawCloakCollar(g: Grid, c: GearLook, oy: number) {
  g.rect(10, 14 + oy, 3, 2, c.color);
  g.rect(19, 14 + oy, 3, 2, shade(c.color, -0.15));
  g.set(13, 15 + oy, c.trim);
  g.set(18, 15 + oy, c.trim);
}

function drawHead(g: Grid, ap: Appearance, oy: number) {
  const s = ap.skin;
  g.rect(14, 14 + oy, 4, 1, shade(s, -0.2));
  g.rect(12, 6 + oy, 8, 8, s);
  g.rect(19, 7 + oy, 1, 7, shade(s, -0.15));
  g.rect(12, 13 + oy, 8, 1, shade(s, -0.1));
  g.rect(13, 13 + oy, 6, 1, shade(s, -0.12));
  g.set(11, 10 + oy, shade(s, -0.1));
  g.set(20, 10 + oy, shade(s, -0.2));
  const glow = GLOWING_EYES.has(ap.eyeColor);
  const brow = ap.hairStyle === 'bald' ? shade(s, -0.4) : shade(ap.hairColor, -0.1);
  g.rect(13, 9 + oy, 2, 1, brow);
  g.rect(17, 9 + oy, 2, 1, brow);
  if (!glow) {
    g.set(13, 10 + oy, '#e8dfcf');
    g.set(18, 10 + oy, '#e8dfcf');
  }
  g.set(14, 10 + oy, ap.eyeColor);
  g.set(17, 10 + oy, ap.eyeColor);
  if (glow) {
    g.set(13, 10 + oy, shade(ap.eyeColor, -0.3));
    g.set(18, 10 + oy, shade(ap.eyeColor, -0.3));
  }
  g.rect(15, 12 + oy, 2, 1, shade(s, -0.32));
  const scar = mix(s, '#7a1f2b', 0.65);
  if (ap.scar === 'cheek') g.pts([[18, 11], [17, 12], [19, 10]], scar, 0, oy);
  if (ap.scar === 'eye') g.pts([[17, 8], [17, 9], [17, 11], [17, 12]], scar, 0, oy);
  if (ap.scar === 'jaw') g.pts([[13, 12], [14, 13], [12, 11]], scar, 0, oy);
}

function drawHair(g: Grid, ap: Appearance, oy: number) {
  const c = ap.hairColor;
  const hi = shade(c, 0.25);
  const dk = shade(c, -0.3);
  const short = () => {
    g.rect(12, 5 + oy, 8, 3, c);
    g.rect(13, 4 + oy, 6, 1, c);
    g.pts([[12, 8], [12, 9], [19, 8]], c, 0, oy);
    g.pts([[14, 5], [15, 5]], hi, 0, oy);
    g.rect(19, 5 + oy, 1, 3, dk);
  };
  switch (ap.hairStyle) {
    case 'short': short(); break;
    case 'long':
      short();
      g.rect(11, 7 + oy, 2, 9, c);
      g.rect(19, 7 + oy, 2, 9, dk);
      g.set(11, 16 + oy, dk);
      g.set(20, 16 + oy, dk);
      break;
    case 'wild':
      g.rect(11, 4 + oy, 10, 4, c);
      g.pts([[11, 3], [13, 3], [14, 2], [16, 3], [18, 2], [20, 3]], c, 0, oy);
      g.rect(11, 8 + oy, 1, 4, c);
      g.rect(20, 8 + oy, 1, 4, dk);
      g.pts([[13, 4], [14, 3], [16, 4]], hi, 0, oy);
      g.rect(20, 4 + oy, 1, 4, dk);
      g.pts([[12, 8], [13, 8]], c, 0, oy);
      break;
    case 'braid':
      short();
      for (let j = 0; j < 11; j++) g.set(20, 8 + j + oy, j % 2 ? dk : c);
      g.set(21, 9 + oy, c);
      g.set(20, 19 + oy, '#7a1f2b');
      break;
    case 'mohawk':
      g.rect(12, 6 + oy, 8, 1, shade(ap.skin, -0.18));
      g.rect(14, 2 + oy, 4, 5, c);
      g.rect(14, 2 + oy, 1, 5, dk);
      g.rect(17, 2 + oy, 1, 5, dk);
      g.set(15, 2 + oy, hi);
      break;
    case 'bald':
      g.set(14, 7 + oy, shade(ap.skin, 0.18));
      break;
  }
}

function drawHelm(g: Grid, h: GearLook, ap: Appearance, oy: number) {
  const c = h.color;
  const dk = shade(c, -0.3);
  const glow = GLOWING_EYES.has(ap.eyeColor);
  switch (h.style) {
    case 'hood': {
      for (let y = 4; y <= 15; y++) {
        const [x0, x1] = y === 4 ? [13, 18] : y === 5 ? [12, 19] : [11, 20];
        for (let x = x0; x <= x1; x++) {
          if (x >= 13 && x <= 18 && y >= 8 && y <= 13) continue;
          g.set(x, y + oy, x >= 19 ? dk : c);
        }
      }
      g.rect(10, 14 + oy, 12, 2, c);
      g.rect(20, 14 + oy, 2, 2, dk);
      g.rect(13, 8 + oy, 6, 1, shade(ap.skin, -0.45));
      g.set(13, 9 + oy, shade(ap.skin, -0.3));
      g.set(18, 9 + oy, shade(ap.skin, -0.3));
      g.rect(13, 15 + oy, 6, 1, h.trim);
      g.pts([[14, 4], [13, 5]], shade(c, 0.2), 0, oy);
      break;
    }
    case 'greathelm': {
      g.srect(12, 5 + oy, 8, 9, c);
      g.rect(13, 4 + oy, 6, 1, c);
      g.rect(13, 10 + oy, 6, 1, '#0a0a0c');
      g.set(14, 10 + oy, glow ? ap.eyeColor : '#2a2a2e');
      g.set(17, 10 + oy, glow ? ap.eyeColor : '#2a2a2e');
      g.rect(15, 3 + oy, 2, 6, h.trim);
      g.set(15, 2 + oy, h.trim);
      g.pts([[14, 12], [16, 12], [17, 12]], shade(c, -0.4), 0, oy);
      g.set(13, 6 + oy, shade(c, 0.3));
      g.rect(12, 13 + oy, 8, 1, shade(c, -0.2));
      break;
    }
    case 'crown': {
      g.rect(12, 5 + oy, 8, 2, c);
      g.pts([[12, 4], [12, 3], [14, 4], [15, 3], [16, 3], [15, 2], [17, 4], [19, 4], [19, 3]], c, 0, oy);
      g.rect(15, 5 + oy, 2, 1, h.trim);
      g.set(12, 5 + oy, h.trim);
      g.set(19, 5 + oy, h.trim);
      g.rect(12, 6 + oy, 8, 1, dk);
      break;
    }
    case 'horned': {
      g.srect(12, 5 + oy, 8, 4, c);
      g.rect(13, 4 + oy, 6, 1, c);
      g.rect(12, 8 + oy, 8, 1, shade(c, -0.25));
      g.rect(15, 5 + oy, 2, 3, shade(c, 0.15));
      const horn: [number, number][] = [[11, 7], [10, 7], [10, 6], [9, 5], [9, 4], [9, 3], [10, 2]];
      g.pts(horn, h.trim, 0, oy);
      g.pts(horn.map(([x, y]) => [31 - x, y] as [number, number]), shade(h.trim, -0.15), 0, oy);
      g.set(10, 2 + oy, shade(h.trim, -0.3));
      g.set(21, 2 + oy, shade(h.trim, -0.35));
      break;
    }
    case 'circlet': {
      g.rect(12, 7 + oy, 8, 1, c);
      g.rect(15, 7 + oy, 2, 1, h.trim);
      g.set(15, 6 + oy, h.trim);
      g.set(16, 6 + oy, shade(h.trim, 0.3));
      break;
    }
    case 'mask': {
      g.srect(12, 7 + oy, 8, 7, c);
      g.set(14, 10 + oy, glow ? ap.eyeColor : '#0a0a0c');
      g.set(17, 10 + oy, glow ? ap.eyeColor : '#0a0a0c');
      g.set(13, 10 + oy, shade(c, -0.35));
      g.set(18, 10 + oy, shade(c, -0.35));
      g.rect(14, 11 + oy, 4, 2, shade(c, -0.08));
      g.rect(15, 13 + oy, 2, 2, shade(c, -0.15));
      g.set(16, 15 + oy, shade(c, -0.3));
      g.pts([[12, 9], [19, 9], [12, 8], [19, 8]], h.trim, 0, oy);
      // hat brim
      g.rect(11, 6 + oy, 10, 1, h.trim);
      g.rect(13, 4 + oy, 6, 2, h.trim);
      break;
    }
  }
}

function drawWeapon(g: Grid, w: GearLook, oy: number) {
  const c = w.color;
  const t = w.trim;
  switch (w.style) {
    case 'sword':
      g.rect(24, 8 + oy, 1, 13, c);
      g.rect(25, 9 + oy, 1, 12, shade(c, -0.35));
      g.set(24, 7 + oy, shade(c, 0.3));
      g.rect(24, 9 + oy, 1, 2, shade(c, 0.35));
      g.rect(22, 21 + oy, 5, 1, t);
      g.rect(24, 22 + oy, 1, 3, '#3a2616');
      g.set(24, 25 + oy, t);
      break;
    case 'staff':
      g.rect(24, 4 + oy, 1, 27 - oy, c);
      g.rect(23, 1 + oy, 3, 3, t);
      g.set(24, 2 + oy, shade(t, 0.6));
      g.pts([[22, 2], [26, 2], [24, 0]], shade(t, -0.2), 0, oy);
      g.set(25, 3 + oy, shade(t, -0.3));
      break;
    case 'scythe':
      g.rect(24, 3 + oy, 1, 28 - oy, c);
      g.rect(19, 3 + oy, 5, 1, t);
      g.rect(17, 4 + oy, 4, 1, shade(t, -0.15));
      g.rect(16, 5 + oy, 2, 1, shade(t, 0.3));
      g.set(15, 6 + oy, shade(t, 0.3));
      g.set(25, 3 + oy, c);
      break;
    case 'dagger':
      g.rect(24, 16 + oy, 1, 5, c);
      g.rect(25, 17 + oy, 1, 4, shade(c, -0.35));
      g.set(24, 15 + oy, shade(c, 0.3));
      g.rect(23, 21 + oy, 3, 1, t);
      g.rect(24, 22 + oy, 1, 2, '#2a1a14');
      break;
    case 'axe':
      g.rect(24, 9 + oy, 1, 19, '#5a3e2b');
      g.srect(25, 9 + oy, 3, 5, c);
      g.rect(28, 10 + oy, 1, 3, shade(c, 0.35));
      g.pts([[23, 10], [23, 11]], c, 0, oy);
      g.set(24, 9 + oy, t);
      break;
    case 'tome':
      g.srect(22, 18 + oy, 5, 6, c);
      g.rect(22, 18 + oy, 1, 6, shade(c, -0.4));
      g.rect(27, 19 + oy, 1, 5, '#e8dfcf');
      g.pts([[24, 20], [24, 21], [23, 21], [25, 21], [24, 22]], t, 0, oy);
      break;
    case 'lantern':
      g.rect(24, 21 + oy, 1, 2, '#2a2a2e');
      g.rect(23, 23 + oy, 3, 1, c);
      g.rect(23, 24 + oy, 3, 3, shade(c, -0.2));
      g.rect(24, 24 + oy, 1, 2, t);
      g.set(24, 24 + oy, shade(t, 0.5));
      g.rect(23, 27 + oy, 3, 1, c);
      break;
  }
}

export function renderHeroGrid(look: SpriteLook, frame: 0 | 1 = 0): Cell[] {
  const g = new Grid();
  const oy = frame;
  const ap = look.appearance;
  const eq = look.equipped;
  const helm = lookOf(eq, 'helm');
  const armor = lookOf(eq, 'armor');
  const cloak = lookOf(eq, 'cloak');
  const weapon = lookOf(eq, 'weapon');

  if (cloak) drawCloakBack(g, cloak, oy);
  if (weapon && (weapon.style === 'staff' || weapon.style === 'scythe')) drawWeapon(g, weapon, oy); // long shafts sit behind the hand
  drawLegs(g);
  const sleeve = drawArmor(g, armor, oy);
  drawArms(g, sleeve, armor, ap.skin, oy, !!weapon);
  if (cloak) drawCloakCollar(g, cloak, oy);
  drawHead(g, ap, oy);
  const hairHidden = helm && (helm.style === 'greathelm' || helm.style === 'hood');
  if (!hairHidden) drawHair(g, ap, oy);
  if (helm) drawHelm(g, helm, ap, oy);
  if (weapon && weapon.style !== 'staff' && weapon.style !== 'scythe') drawWeapon(g, weapon, oy);
  g.outline();
  return g.px;
}

const sheetCache = new Map<string, string>();

/** 2-frame horizontal sprite sheet (64×32) as a data URL. */
export function heroSheet(look: SpriteLook): string {
  const key = JSON.stringify(look);
  const hit = sheetCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE * 2;
  canvas.height = SPRITE;
  const ctx = canvas.getContext('2d')!;
  ([0, 1] as const).forEach((f) => {
    const px = renderHeroGrid(look, f);
    for (let i = 0; i < px.length; i++) {
      const c = px[i];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(f * SPRITE + (i % SPRITE), Math.floor(i / SPRITE), 1, 1);
    }
  });
  const url = canvas.toDataURL();
  if (sheetCache.size > 200) sheetCache.clear();
  sheetCache.set(key, url);
  return url;
}
