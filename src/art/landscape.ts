/** Procedural pixel-art parallax landscapes, one set of layers per region. */
import type { Region } from '../data/regions';
import { mix, mulberry32, shade } from './color';

export const LW = 256;
export const LH = 128;
export const GROUND_Y = 106;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type Ctx2 = CanvasRenderingContext2D;

function canvas(): [HTMLCanvasElement, Ctx2] {
  const c = document.createElement('canvas');
  c.width = LW;
  c.height = LH;
  return [c, c.getContext('2d')!];
}

const px = (ctx: Ctx2, x: number, y: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
};
const rect = (ctx: Ctx2, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
function tri(ctx: Ctx2, cx: number, top: number, halfW: number, h: number, c: string) {
  for (let j = 0; j < h; j++) {
    const w = Math.round((j / h) * halfW);
    rect(ctx, cx - w, top + j, w * 2 + 1, 1, c);
  }
}

function noise1d(rng: () => number, step: number) {
  const pts = Array.from({ length: Math.ceil(LW / step) + 3 }, () => rng());
  return (x: number) => {
    const i = Math.floor(x / step);
    const t = x / step - i;
    const s = (1 - Math.cos(t * Math.PI)) / 2;
    return pts[i] * (1 - s) + pts[i + 1] * s;
  };
}

function skyColor(r: Region, y: number, x: number) {
  const steps = 9;
  const t = Math.min(1, y / (LH * 0.82));
  const th = BAYER[y % 4][x % 4] / 16;
  const idx = Math.min(steps, Math.floor(t * steps + th));
  return mix(r.sky[0], r.sky[1], idx / steps);
}

function drawSky(r: Region, rng: () => number) {
  const [c, ctx] = canvas();
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) px(ctx, x, y, skyColor(r, y, x));
  // stars
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rng() * LW);
    const y = Math.floor(rng() * LH * 0.55);
    const b = rng();
    px(ctx, x, y, mix(skyColor(r, y, x), '#f2ead8', 0.25 + b * 0.6));
    if (b > 0.93) {
      const dim = mix(skyColor(r, y, x), '#f2ead8', 0.25);
      px(ctx, x - 1, y, dim); px(ctx, x + 1, y, dim); px(ctx, x, y - 1, dim); px(ctx, x, y + 1, dim);
    }
  }
  // moon + halo
  const mx = 188, my = 28, mr = 10;
  for (let y = my - 30; y < my + 30; y++)
    for (let x = mx - 30; x < mx + 30; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d <= mr) {
        let col = r.moon;
        if (x - mx < -mr * 0.45 + (y - my) * 0.2) col = shade(r.moon, -0.12);
        px(ctx, x, y, col);
      } else if (d < mr + 26) {
        const k = Math.pow(1 - (d - mr) / 26, 2.2) * 0.35;
        const th = BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16;
        px(ctx, x, y, mix(skyColor(r, Math.max(0, y), Math.max(0, x)), r.moon, k + (th - 0.5) * 0.04));
      }
    }
  // craters
  for (const [dx, dy, rr] of [[3, -3, 2], [-2, 3, 1.5], [4, 4, 1]] as const) {
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.hypot(x, y) <= rr) px(ctx, mx + dx + x, my + dy + y, shade(r.moon, -0.15));
  }
  // thin cloud bands
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 5; i++) {
    const y = 18 + rng() * 40;
    const x = rng() * LW;
    rect(ctx, x, y, 40 + rng() * 60, 1, r.sky[1]);
    rect(ctx, x + 8, y + 1, 30 + rng() * 40, 1, r.sky[1]);
  }
  ctx.globalAlpha = 1;
  return c;
}

function drawFar(r: Region, rng: () => number) {
  const [c, ctx] = canvas();
  const peaks = r.feature === 'peaks';
  const n1 = noise1d(rng, peaks ? 22 : 34);
  const n1b = noise1d(rng, 9);
  const base1 = peaks ? 46 : 66;
  const amp1 = peaks ? 42 : 22;
  for (let x = 0; x < LW; x++) {
    const h = Math.round(base1 + (n1(x) - 0.5) * amp1 * 2 + (n1b(x) - 0.5) * (peaks ? 10 : 5));
    rect(ctx, x, h, 1, LH - h, r.far);
    px(ctx, x, h, mix(r.far, r.moon, 0.18));
    if (peaks) {
      // snowcaps on the tallest parts
      if (h < base1 - 8) rect(ctx, x, h, 1, Math.max(2, Math.round((base1 - 8 - h) / 2.5)), mix(r.far, '#e8e3d9', 0.55));
    }
  }
  const second = mix(r.far, r.mid, 0.5);
  const n2 = noise1d(rng, peaks ? 16 : 26);
  for (let x = 0; x < LW; x++) {
    const h = Math.round((peaks ? 70 : 82) + (n2(x) - 0.5) * (peaks ? 30 : 16));
    rect(ctx, x, h, 1, LH - h, second);
    if (x % 2 === 0) px(ctx, x, h, mix(second, r.moon, 0.1));
  }
  return c;
}

function deadTree(ctx: Ctx2, x: number, base: number, h: number, col: string, rng: () => number) {
  rect(ctx, x, base - h, 2, h, col);
  const branch = (bx: number, by: number, dir: number, len: number) => {
    for (let i = 0; i < len; i++) px(ctx, bx + dir * i, by - Math.floor(i * 0.7), col);
    if (len > 3) branch(bx + dir * len, by - Math.floor(len * 0.7), rng() > 0.5 ? dir : -dir, Math.floor(len * 0.55));
  };
  for (let i = 0; i < 4; i++) branch(x + (i % 2), base - h + 3 + Math.floor(rng() * h * 0.5), i % 2 ? 1 : -1, 4 + Math.floor(rng() * 6));
}

function pine(ctx: Ctx2, x: number, base: number, h: number, col: string) {
  rect(ctx, x, base - 4, 1, 4, col);
  const tiers = Math.max(3, Math.floor(h / 9));
  for (let t = 0; t < tiers; t++) {
    const top = base - h + t * (h / tiers) * 0.8;
    tri(ctx, x, Math.round(top), Math.round(3 + t * 2.2), Math.round(h / tiers + 4), col);
  }
}

function drawMid(r: Region, rng: () => number) {
  const [c, ctx] = canvas();
  const m = r.mid;
  const lit = r.accent;
  const G = GROUND_Y + 1;
  switch (r.feature) {
    case 'hamlet': {
      // watchtower
      rect(ctx, 34, G - 44, 9, 44, m);
      tri(ctx, 38, G - 54, 7, 11, m);
      rect(ctx, 37, G - 38, 2, 3, lit);
      for (let i = 0; i < 4; i++) rect(ctx, 33 + i * 3, G - 45, 2, 2, m);
      const huts = [[64, 18, 12], [92, 24, 15], [150, 20, 13], [176, 26, 16], [214, 18, 11]];
      for (const [x, w, h] of huts) {
        rect(ctx, x, G - h, w, h, m);
        tri(ctx, x + w / 2, G - h - Math.round(w / 2), Math.round(w / 2) + 2, Math.round(w / 2) + 1, m);
        rect(ctx, x + w - 5, G - h - w / 2 - 2, 3, 6, m);
        if (rng() > 0.25) {
          rect(ctx, x + 3, G - h + 4, 2, 2, lit);
          px(ctx, x + 3, G - h + 6, shade(lit, -0.4));
        }
        if (w > 20) rect(ctx, x + w - 8, G - h + 4, 2, 2, lit);
      }
      deadTree(ctx, 124, G, 26, m, rng);
      deadTree(ctx, 236, G, 20, m, rng);
      for (let x = 0; x < LW; x += 6) rect(ctx, x, G - 5, 1, 5, m); // fence
      rect(ctx, 0, G - 4, LW, 1, m);
      break;
    }
    case 'woods': {
      const back = mix(r.far, m, 0.55);
      for (let x = -4; x < LW + 4; x += 7 + Math.floor(rng() * 4)) pine(ctx, x, G - 4, 30 + rng() * 26, back);
      for (let x = 0; x < LW; x += 14 + Math.floor(rng() * 10)) {
        if (x > 108 && x < 148) continue; // a clearing for the hero
        pine(ctx, x, G, 44 + rng() * 30, m);
      }
      deadTree(ctx, 112, G, 30, m, rng);
      // glowing mushrooms
      for (const x of [100, 150, 160]) { px(ctx, x, G - 1, lit); px(ctx, x - 1, G - 2, shade(lit, -0.3)); px(ctx, x + 1, G - 2, shade(lit, -0.3)); }
      break;
    }
    case 'marsh': {
      // water band with reflections
      for (let y = G - 12; y < G; y++) for (let x = 0; x < LW; x++) {
        const th = BAYER[y % 4][x % 4] / 16;
        px(ctx, x, y, mix(r.sky[1], m, 0.55 + th * 0.15));
      }
      for (let i = 0; i < 30; i++) rect(ctx, rng() * LW, G - 12 + rng() * 12, 4 + rng() * 14, 1, mix(r.sky[1], r.moon, 0.25));
      rect(ctx, 176, G - 12 + 3, 14, 1, mix(r.moon, r.sky[1], 0.4)); // moon reflection
      rect(ctx, 179, G - 12 + 6, 8, 1, mix(r.moon, r.sky[1], 0.5));
      // sunken bell tower, tilted
      for (let j = 0; j < 40; j++) rect(ctx, 52 + Math.floor(j * 0.18), G - 12 - j, 10, 1, m);
      tri(ctx, 64, G - 12 - 50, 6, 10, m);
      rect(ctx, 58, G - 42, 3, 4, lit);
      // willows
      for (const [x, h] of [[18, 34], [210, 40], [240, 28]]) {
        rect(ctx, x, G - h, 3, h, m);
        for (let k = -10; k <= 10; k += 2) {
          const len = 8 + Math.floor(rng() * 14);
          rect(ctx, x + k, G - h + Math.abs(k) / 2, 1, len, m);
        }
        rect(ctx, x - 10, G - h - 2, 23, 4, m);
      }
      // reeds
      for (let x = 0; x < LW; x += 2 + Math.floor(rng() * 4)) {
        const h = 3 + Math.floor(rng() * 8);
        rect(ctx, x, G - h, 1, h, m);
        if (rng() > 0.8) px(ctx, x, G - h - 1, shade(m, 0.2));
      }
      break;
    }
    case 'cathedral': {
      const cx = 128;
      rect(ctx, cx - 30, G - 34, 60, 34, m);
      tri(ctx, cx, G - 52, 30, 19, m);
      for (const sx of [cx - 30, cx + 22]) {
        rect(ctx, sx, G - 58, 8, 58, m);
        tri(ctx, sx + 4, G - 84, 5, 27, m);
        rect(ctx, sx + 3, G - 50, 2, 5, lit);
      }
      // rose window
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
        const d = Math.hypot(x, y);
        if (d <= 5) px(ctx, cx + x, G - 40 + y, d < 1.5 ? shade(lit, 0.4) : (x + y) % 2 === 0 ? lit : shade(lit, -0.35));
      }
      for (const wx of [-20, -12, 10, 18]) { rect(ctx, cx + wx, G - 24, 3, 8, shade(lit, -0.2)); px(ctx, cx + wx + 1, G - 25, shade(lit, -0.2)); }
      rect(ctx, cx - 4, G - 14, 8, 14, '#000000');
      // graves
      for (let i = 0; i < 12; i++) {
        const x = 8 + i * 21 + Math.floor(rng() * 6);
        if (x > cx - 40 && x < cx + 40) continue;
        if (rng() > 0.5) { rect(ctx, x, G - 7, 1, 7, m); rect(ctx, x - 2, G - 5, 5, 1, m); }
        else { rect(ctx, x, G - 6, 4, 6, m); px(ctx, x, G - 6, r.sky[1]); px(ctx, x + 3, G - 6, r.sky[1]); }
      }
      deadTree(ctx, 30, G, 28, m, rng);
      deadTree(ctx, 226, G, 24, m, rng);
      break;
    }
    case 'peaks': {
      // fortress on a crag
      for (let x = 160; x < 256; x++) {
        const h = Math.round(30 + Math.sin((x - 160) / 18) * 10 + (x > 200 ? (x - 200) * 0.5 : 0));
        rect(ctx, x, G - h, 1, h, m);
      }
      rect(ctx, 196, G - 64, 26, 24, m);
      rect(ctx, 192, G - 74, 8, 34, m);
      rect(ctx, 218, G - 80, 9, 40, m);
      for (let i = 0; i < 5; i++) rect(ctx, 196 + i * 6, G - 67, 3, 3, m);
      tri(ctx, 222, G - 92, 6, 12, m);
      rect(ctx, 221, G - 70, 2, 3, lit);
      rect(ctx, 204, G - 56, 2, 3, lit);
      for (let x = 0; x < 120; x += 12 + Math.floor(rng() * 12)) pine(ctx, x, G, 18 + rng() * 14, m);
      // lava cracks
      for (let i = 0; i < 5; i++) {
        let x = 20 + rng() * 200;
        let y = G - 1;
        for (let k = 0; k < 6; k++) { px(ctx, x, y, lit); x += rng() > 0.5 ? 1 : -1; y -= rng() > 0.4 ? 1 : 0; }
      }
      break;
    }
  }
  return c;
}

function drawNear(r: Region, rng: () => number) {
  const [c, ctx] = canvas();
  const G = GROUND_Y;
  const n = noise1d(rng, 12);
  for (let x = 0; x < LW; x++) {
    const top = G + Math.round((n(x) - 0.5) * 3);
    rect(ctx, x, top, 1, LH - top, r.ground);
    px(ctx, x, top, mix(r.ground, r.moon, 0.14));
  }
  // path where the hero stands
  for (let y = G + 2; y < LH; y++)
    for (let x = 0; x < LW; x++) {
      const dx = (x - 128) / (22 + (y - G) * 2.2);
      if (Math.abs(dx) < 1 && BAYER[y % 4][x % 4] / 16 < 0.6 - Math.abs(dx) * 0.5) px(ctx, x, y, mix(r.ground, '#4a3f44', 0.35));
    }
  // grass tufts & stones
  const tuft = mix(r.mid, r.accent, 0.08);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rng() * LW);
    if (Math.abs(x - 128) < 14) continue;
    const y = G + Math.floor(rng() * 16);
    const h = 1 + Math.floor(rng() * 3);
    rect(ctx, x, y - h, 1, h, tuft);
    if (rng() > 0.5) px(ctx, x + 1, y - 1, tuft);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rng() * LW);
    const y = G + 4 + Math.floor(rng() * 16);
    rect(ctx, x, y, 3, 2, shade(r.ground, 0.2));
    px(ctx, x, y, shade(r.ground, 0.35));
  }
  // foreground framing silhouettes
  const fg = '#050307';
  for (let x = 0; x < 26; x++) {
    const h = Math.round(18 - x * 0.6 + Math.sin(x / 3) * 3);
    rect(ctx, x, LH - h, 1, h, fg);
  }
  for (let x = LW - 30; x < LW; x++) {
    const h = Math.round((x - (LW - 30)) * 0.7 + Math.cos(x / 4) * 3);
    rect(ctx, x, LH - h, 1, h, fg);
  }
  deadTree(ctx, 6, LH, 60, fg, rng);
  if (r.feature === 'hamlet' || r.feature === 'cathedral') {
    // a lantern post near the path
    rect(ctx, 96, G - 18, 1, 20, '#0a070c');
    rect(ctx, 95, G - 19, 4, 1, '#0a070c');
    rect(ctx, 98, G - 18, 1, 1, '#0a070c');
    rect(ctx, 97, G - 17, 3, 3, r.accent);
    px(ctx, 98, G - 16, shade(r.accent, 0.5));
  }
  return c;
}

export interface LayerSet {
  sky: string;
  far: string;
  mid: string;
  near: string;
}

const cache = new Map<string, LayerSet>();

export function regionLayers(r: Region): LayerSet {
  const hit = cache.get(r.id);
  if (hit) return hit;
  const seed = [...r.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const set: LayerSet = {
    sky: drawSky(r, mulberry32(seed)).toDataURL(),
    far: drawFar(r, mulberry32(seed + 1)).toDataURL(),
    mid: drawMid(r, mulberry32(seed + 2)).toDataURL(),
    near: drawNear(r, mulberry32(seed + 3)).toDataURL(),
  };
  cache.set(r.id, set);
  return set;
}
