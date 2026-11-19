/**
 * Seamless, horizontally-tiling layers for the "travelling" scene: the hero walks a road
 * while hills, roadside scenery, the road itself and foreground brush scroll past.
 */
import type { Region } from '../data/regions';
import { mix, mulberry32, shade } from './color';
import { BAYER, GROUND_Y, LH, deadTree, pine, px, rect, tri, type Ctx2 } from './landscape';

export interface JourneyLayer {
  src: string;
  width: number; // tile width in landscape pixels
  speed: number; // landscape pixels per second
}

export interface JourneyLayers {
  far: JourneyLayer;
  mid: JourneyLayer;
  near: JourneyLayer;
  front: JourneyLayer;
}

function canvasOf(w: number): [HTMLCanvasElement, Ctx2] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = LH;
  return [c, c.getContext('2d')!];
}

/** Smooth noise that wraps around at `w`, so the tile has no seam. */
function loopNoise(rng: () => number, w: number, step: number) {
  const n = Math.max(2, Math.round(w / step));
  const pts = Array.from({ length: n }, () => rng());
  return (x: number) => {
    const f = (((x % w) + w) % w) / (w / n);
    const i = Math.floor(f);
    const t = f - i;
    const s = (1 - Math.cos(t * Math.PI)) / 2;
    return pts[i % n] * (1 - s) + pts[(i + 1) % n] * s;
  };
}

function drawFar(r: Region, rng: () => number, W: number) {
  const [c, ctx] = canvasOf(W);
  const peaks = r.feature === 'peaks';
  const a = loopNoise(rng, W, peaks ? 24 : 40);
  const b = loopNoise(rng, W, 10);
  for (let x = 0; x < W; x++) {
    const h = Math.round((peaks ? 50 : 68) + (a(x) - 0.5) * (peaks ? 70 : 40) + (b(x) - 0.5) * 6);
    rect(ctx, x, h, 1, LH - h, r.far);
    px(ctx, x, h, mix(r.far, r.moon, 0.18));
    if (peaks && h < 42) rect(ctx, x, h, 1, Math.max(2, Math.round((42 - h) / 2.5)), mix(r.far, '#e8e3d9', 0.55));
  }
  const second = mix(r.far, r.mid, 0.5);
  const d = loopNoise(rng, W, 28);
  for (let x = 0; x < W; x++) {
    const h = Math.round(84 + (d(x) - 0.5) * 18);
    rect(ctx, x, h, 1, LH - h, second);
    if (x % 2 === 0) px(ctx, x, h, mix(second, r.moon, 0.1));
  }
  return c;
}

/* ── roadside scenery ─────────────────────────────────────────── */

type Piece = (ctx: Ctx2, x: number, G: number, r: Region, rng: () => number) => number; // returns width used

const hut = (ctx: Ctx2, x: number, G: number, w: number, h: number, r: Region, lit: boolean, rng: () => number) => {
  const m = r.mid;
  rect(ctx, x, G - h, w, h, m);
  tri(ctx, x + w / 2, G - h - Math.round(w / 2), Math.round(w / 2) + 2, Math.round(w / 2) + 1, m);
  rect(ctx, x + w - 5, G - h - w / 2 - 2, 3, 6, m); // chimney
  if (lit) {
    rect(ctx, x + 3, G - h + 4, 2, 2, r.accent);
    if (w > 18) rect(ctx, x + w - 7, G - h + 4, 2, 2, r.accent);
    // a wisp of chimney smoke
    for (let i = 0; i < 6; i++) px(ctx, x + w - 4 + Math.round(Math.sin(i + rng() * 2) * 1.5) - i * 0.3, G - h - w / 2 - 4 - i * 2, `rgba(200,200,210,${0.35 - i * 0.05})`);
  }
  rect(ctx, x + Math.floor(w / 2) - 1, G - 5, 3, 5, '#000000');
};

const tree = (ctx: Ctx2, x: number, G: number, r: Region, rng: () => number, size = 1) => {
  const m = r.mid;
  if (r.feature === 'woods' || r.feature === 'peaks') pine(ctx, x, G, Math.round((26 + rng() * 22) * size), m);
  else if (r.feature === 'marsh') {
    const h = Math.round((22 + rng() * 14) * size);
    rect(ctx, x, G - h, 3, h, m);
    rect(ctx, x - 9, G - h - 2, 21, 4, m);
    for (let k = -9; k <= 11; k += 2) rect(ctx, x + k, G - h + Math.abs(k) / 2, 1, 6 + Math.floor(rng() * 12), m);
  } else deadTree(ctx, x, G, Math.round((22 + rng() * 14) * size), m, rng);
};

const PIECES: Record<string, Piece> = {
  grove: (ctx, x, G, r, rng) => {
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) tree(ctx, x + 6 + i * (8 + Math.floor(rng() * 6)), G, r, rng, 0.8 + rng() * 0.5);
    return 16 + n * 12;
  },
  lone: (ctx, x, G, r, rng) => {
    tree(ctx, x + 10, G, r, rng, 1.2);
    return 24;
  },
  village: (ctx, x, G, r, rng) => {
    // three or four huts, a fence and a well
    let cx = x;
    const n = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const w = 14 + Math.floor(rng() * 10);
      const h = 10 + Math.floor(rng() * 6);
      hut(ctx, cx, G, w, h, r, rng() > 0.2, rng);
      cx += w + 4 + Math.floor(rng() * 6);
      if (i === 1) {
        // well
        rect(ctx, cx, G - 5, 7, 5, r.mid);
        rect(ctx, cx + 1, G - 11, 1, 6, r.mid);
        rect(ctx, cx + 5, G - 11, 1, 6, r.mid);
        rect(ctx, cx, G - 12, 7, 1, r.mid);
        cx += 11;
      }
    }
    for (let fx = x - 6; fx < cx + 4; fx += 5) rect(ctx, fx, G - 4, 1, 4, r.mid);
    rect(ctx, x - 6, G - 3, cx - x + 10, 1, r.mid);
    return cx - x + 8;
  },
  signpost: (ctx, x, G, r) => {
    rect(ctx, x + 4, G - 16, 2, 16, r.mid);
    rect(ctx, x, G - 15, 11, 3, r.mid);
    rect(ctx, x + 2, G - 10, 9, 3, r.mid);
    px(ctx, x + 11, G - 14, r.mid);
    px(ctx, x + 1, G - 9, r.mid);
    return 16;
  },
  stones: (ctx, x, G, r) => {
    for (const [dx, h] of [[0, 9], [6, 13], [12, 11], [18, 8]] as const) {
      rect(ctx, x + dx, G - h, 4, h, r.mid);
      px(ctx, x + dx + 1, G - h + 2, mix(r.mid, r.accent, 0.4));
    }
    rect(ctx, x + 4, G - 14, 12, 2, r.mid);
    return 28;
  },
  ruin: (ctx, x, G, r) => {
    rect(ctx, x, G - 30, 10, 30, r.mid);
    for (let i = 0; i < 4; i++) rect(ctx, x + i * 3, G - 33 + (i % 2) * 2, 2, 3, r.mid);
    rect(ctx, x + 3, G - 22, 2, 4, mix(r.mid, r.accent, 0.6));
    rect(ctx, x + 10, G - 12, 8, 12, r.mid);
    rect(ctx, x + 13, G - 15, 3, 3, r.mid);
    return 24;
  },
  shrine: (ctx, x, G, r) => {
    rect(ctx, x, G - 14, 12, 14, r.mid);
    tri(ctx, x + 6, G - 22, 7, 9, r.mid);
    rect(ctx, x + 5, G - 26, 2, 5, r.mid);
    rect(ctx, x + 4, G - 24, 4, 1, r.mid);
    rect(ctx, x + 4, G - 10, 4, 5, r.accent);
    px(ctx, x + 5, G - 9, shade(r.accent, 0.4));
    return 18;
  },
  graves: (ctx, x, G, r) => {
    for (let i = 0; i < 5; i++) {
      const gx = x + i * 7;
      if (i % 2) { rect(ctx, gx, G - 7, 1, 7, r.mid); rect(ctx, gx - 2, G - 5, 5, 1, r.mid); }
      else { rect(ctx, gx, G - 6, 4, 6, r.mid); px(ctx, gx, G - 6, r.sky[1]); px(ctx, gx + 3, G - 6, r.sky[1]); }
    }
    return 40;
  },
};

/** What lines the road, by region. Every tile has at least one settlement. */
const ROADSIDE: Record<Region['feature'], string[]> = {
  hamlet: ['village', 'lone', 'signpost', 'grove', 'stones', 'shrine', 'lone', 'ruin'],
  woods: ['grove', 'grove', 'village', 'grove', 'shrine', 'stones', 'grove', 'signpost'],
  marsh: ['lone', 'village', 'grove', 'ruin', 'lone', 'signpost', 'grove', 'shrine'],
  cathedral: ['graves', 'lone', 'shrine', 'village', 'graves', 'ruin', 'lone', 'signpost'],
  peaks: ['grove', 'ruin', 'stones', 'village', 'grove', 'shrine', 'signpost', 'grove'],
};

function drawMid(r: Region, rng: () => number, W: number) {
  const [c, ctx] = canvasOf(W);
  const G = GROUND_Y + 1;
  // a hedge line of distant bushes, tiling
  const hedge = loopNoise(rng, W, 14);
  const back = mix(r.far, r.mid, 0.6);
  for (let x = 0; x < W; x++) rect(ctx, x, G - 3 - Math.round(hedge(x) * 5), 1, 8, back);
  const shuffle = () => [...ROADSIDE[r.feature]].sort(() => rng() - 0.5);
  const order = [...shuffle(), ...shuffle()];
  order.splice(order.indexOf('village'), 1);
  order.unshift('village'); // every stretch of road passes a settlement
  let x = 8;
  for (const kind of order) {
    if (x > W - 60) break;
    x += PIECES[kind](ctx, x, G, r, rng) + 10 + Math.floor(rng() * 20);
  }
  return c;
}

function drawNear(r: Region, rng: () => number, W: number) {
  const [c, ctx] = canvasOf(W);
  const G = GROUND_Y;
  const n = loopNoise(rng, W, 16);
  for (let x = 0; x < W; x++) {
    const top = G + Math.round((n(x) - 0.5) * 3);
    rect(ctx, x, top, 1, LH - top, r.ground);
    px(ctx, x, top, mix(r.ground, r.moon, 0.14));
  }
  // the road: a dithered band the hero walks along
  const road = mix(r.ground, '#4a3f44', 0.4);
  for (let y = G + 3; y < G + 12; y++)
    for (let x = 0; x < W; x++) {
      const edge = Math.min(y - (G + 3), G + 11 - y) / 4;
      if (BAYER[y % 4][x % 4] / 16 < 0.35 + edge * 0.5) px(ctx, x, y, road);
    }
  // ruts, stones, tufts, the odd flower and puddle
  for (let x = 0; x < W; x += 3) if (rng() > 0.55) px(ctx, x, G + 6 + Math.floor(rng() * 2), shade(road, -0.2));
  const tuft = mix(r.mid, r.accent, 0.08);
  for (let i = 0; i < Math.floor(W / 4); i++) {
    const x = Math.floor(rng() * W);
    const y = rng() > 0.5 ? G + 1 + Math.floor(rng() * 2) : G + 13 + Math.floor(rng() * 8);
    const h = 1 + Math.floor(rng() * 3);
    rect(ctx, x, y - h, 1, h, tuft);
    if (rng() > 0.85) px(ctx, x, y - h - 1, rng() > 0.5 ? r.accent : '#d8cfbf');
  }
  for (let i = 0; i < Math.floor(W / 24); i++) {
    const x = Math.floor(rng() * (W - 4));
    const y = G + 13 + Math.floor(rng() * 10);
    rect(ctx, x, y, 3, 2, shade(r.ground, 0.2));
    px(ctx, x, y, shade(r.ground, 0.35));
  }
  for (let i = 0; i < 2; i++) {
    const x = 20 + Math.floor(rng() * (W - 60));
    rect(ctx, x, G + 9, 9, 1, mix(r.sky[1], r.moon, 0.2));
    rect(ctx, x + 2, G + 8, 5, 1, mix(r.sky[1], r.moon, 0.12));
  }
  // a mile stone
  const mx = Math.floor(W * 0.6);
  rect(ctx, mx, G - 5, 4, 6, shade(r.ground, 0.25));
  px(ctx, mx + 1, G - 3, shade(r.ground, 0.45));
  return c;
}

function drawFront(r: Region, rng: () => number, W: number) {
  const [c, ctx] = canvasOf(W);
  const fg = '#050307';
  // a few dark bushes and grass clumps right in front of the camera
  for (let i = 0; i < 4; i++) {
    const x = Math.floor((i + 0.2 + rng() * 0.5) * (W / 4));
    const w = 14 + Math.floor(rng() * 18);
    for (let k = 0; k < w; k++) {
      const h = Math.round(Math.sin((k / w) * Math.PI) * (8 + rng() * 2) + rng() * 2);
      rect(ctx, x + k, LH - h, 1, h, fg);
    }
    for (let k = 0; k < 4; k++) rect(ctx, x + Math.floor(rng() * w), LH - 10 - Math.floor(rng() * 6), 1, 6, fg);
  }
  void r;
  return c;
}

const cache = new Map<string, JourneyLayers>();

export function journeyLayers(r: Region): JourneyLayers {
  const hit = cache.get(r.id);
  if (hit) return hit;
  const seed = [...r.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11);
  const set: JourneyLayers = {
    far: { src: drawFar(r, mulberry32(seed), 512).toDataURL(), width: 512, speed: 2.5 },
    mid: { src: drawMid(r, mulberry32(seed + 1), 640).toDataURL(), width: 640, speed: 9 },
    near: { src: drawNear(r, mulberry32(seed + 2), 384).toDataURL(), width: 384, speed: 16 },
    front: { src: drawFront(r, mulberry32(seed + 3), 768).toDataURL(), width: 768, speed: 30 },
  };
  cache.set(r.id, set);
  return set;
}
