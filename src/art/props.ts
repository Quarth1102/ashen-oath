/** Pixel-art props for the camp scene, drawn at the same pixel scale as the hero sprite. */
import type { Region } from '../data/regions';
import { mix, mulberry32, shade } from './color';

const OUTLINE = '#0a070c';

export interface Strip {
  src: string;
  w: number; // one frame, in sprite pixels
  h: number;
  frames: number;
}

type Px = (x: number, y: number, c: string) => void;

function strip(w: number, h: number, frames: number, draw: (px: Px, frame: number) => void, outline = true): Strip {
  const c = document.createElement('canvas');
  c.width = w * frames;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let f = 0; f < frames; f++) {
    const px: Px = (x, y, col) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      ctx.fillStyle = col;
      ctx.fillRect(f * w + Math.round(x), Math.round(y), 1, 1);
    };
    draw(px, f);
    if (outline) {
      const img = ctx.getImageData(f * w, 0, w, h);
      const a = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && img.data[(y * w + x) * 4 + 3] > 0;
      const add: [number, number][] = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) add.push([x, y]);
      for (const [x, y] of add) px(x, y, OUTLINE);
    }
  }
  return { src: c.toDataURL(), w, h, frames };
}

const rect = (px: Px, x: number, y: number, w: number, h: number, c: string) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
};

const cache = new Map<string, Strip>();
const memo = (key: string, make: () => Strip) => {
  let s = cache.get(key);
  if (!s) cache.set(key, (s = make()));
  return s;
};

/** A-frame canvas tent, 30×22. */
export function tent(): Strip {
  return memo('tent', () =>
    strip(30, 22, 1, (px) => {
      const canvas = '#6b5a44';
      for (let y = 3; y < 21; y++) {
        const half = Math.round(((y - 3) / 18) * 13) + 1;
        for (let x = 15 - half; x <= 14 + half; x++) px(x, y, x < 15 ? shade(canvas, 0.08) : shade(canvas, -0.18));
      }
      // patched seam + opening
      for (let y = 9; y < 21; y++) {
        const half = Math.round(((y - 9) / 12) * 4);
        for (let x = 15 - half; x <= 14 + half; x++) px(x, y, '#120c10');
      }
      rect(px, 5, 15, 3, 3, '#7a1f2b');
      px(6, 16, '#a3202d');
      // poles and stakes
      px(14, 1, '#5a3e2b'); px(15, 1, '#5a3e2b'); px(14, 2, '#5a3e2b'); px(15, 2, '#5a3e2b');
      rect(px, 0, 21, 30, 1, '#3a2a1e');
      px(0, 20, '#5a3e2b'); px(29, 20, '#5a3e2b');
    }),
  );
}

/** Crackling campfire, 14×16, 3 frames. */
export function campfire(): Strip {
  return memo('fire', () =>
    strip(14, 16, 3, (px, f) => {
      // stones
      for (const [x, y] of [[1, 14], [3, 15], [6, 15], [9, 15], [12, 14], [2, 13], [11, 13]] as const) {
        px(x, y, '#5a5560'); px(x + 1, y, '#46424c');
      }
      // logs
      for (let i = 0; i < 10; i++) { px(2 + i, 13 - Math.floor(i / 4), '#5a3e2b'); px(11 - i, 13 - Math.floor(i / 4), '#4a3020'); }
      // flames: three layers with per-frame heights
      const r = mulberry32(7 + f * 13);
      const cols = [4, 5, 6, 7, 8, 9];
      for (const x of cols) {
        const peak = 2 + Math.floor(r() * 5) + Math.abs(x - 6.5) * 1.2;
        for (let y = Math.round(peak); y < 12; y++) {
          const t = (y - peak) / (12 - peak);
          px(x, y, t < 0.35 ? '#c8402a' : t < 0.7 ? '#f0a030' : '#fff0a0');
        }
      }
      // a stray spark
      px(3 + ((f * 4) % 8), 1 + f, '#f5c96a');
    }, false),
  );
}

/** Banked embers for the night, 14×8, 2 frames. */
export function embers(): Strip {
  return memo('embers', () =>
    strip(14, 8, 2, (px, f) => {
      for (let i = 0; i < 10; i++) { px(2 + i, 6 - Math.floor(i / 5), '#3a2a1e'); px(11 - i, 6 - Math.floor(i / 5), '#2a1e16'); }
      const glow = f ? ['#c8402a', '#7a1f2b', '#f0a030'] : ['#7a1f2b', '#c8402a', '#c8402a'];
      px(6, 5, glow[0]); px(7, 5, glow[1]); px(5, 6, glow[2]); px(8, 6, glow[0]);
      for (const [x, y] of [[1, 7], [4, 7], [9, 7], [12, 7]] as const) px(x, y, '#46424c');
    }),
  );
}

/** A small pond with reeds, 48×10, tinted to the region. 2 frames of shimmer. */
export function pond(r: Region): Strip {
  return memo('pond-' + r.id, () =>
    strip(48, 10, 2, (px, f) => {
      const water = mix(mix(r.sky[1], '#2a4a6a', 0.55), '#000000', 0.15);
      const deep = shade(water, -0.25);
      for (let y = 3; y < 10; y++) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((y - 6.5) / 3.6, 2))) * 22);
        for (let x = 24 - half; x < 24 + half; x++) {
          const edge = x === 24 - half || x === 23 + half;
          px(x, y, edge ? mix(water, r.moon, 0.3) : y > 6 ? deep : (x + y) % 2 ? water : shade(water, -0.06));
        }
      }
      rect(px, 6, 3, 36, 1, mix(water, r.moon, 0.35)); // far rim catches the light
      // moonlit glints, shifting
      for (let i = 0; i < 6; i++) {
        const x = 9 + ((i * 7 + f * 3) % 30);
        const y = 5 + (i % 3);
        px(x, y, mix(water, r.moon, 0.6));
        px(x + 1, y, mix(water, r.moon, 0.35));
        px(x + 2, y, mix(water, r.moon, 0.15));
      }
      // reeds at the ends
      const reed = mix(r.mid, '#4a6a3a', 0.6);
      for (const [x, h] of [[41, 6], [43, 8], [44, 5], [3, 5], [5, 7]] as const) {
        for (let j = 0; j < h; j++) px(x, 8 - j, reed);
        px(x, 8 - h, '#5a3e2b');
      }
    }),
  );
}

/** Rolled-out sleeping mat with a pillow, 26×5. */
export function bedroll(): Strip {
  return memo('bedroll', () =>
    strip(26, 5, 1, (px) => {
      rect(px, 0, 2, 26, 3, '#5e1219');
      rect(px, 0, 2, 26, 1, '#7a1f2b');
      for (let x = 3; x < 26; x += 5) px(x, 3, '#a3202d');
      rect(px, 0, 1, 6, 3, '#b5ab9b');
      rect(px, 0, 1, 6, 1, '#d8cfbf');
    }),
  );
}
