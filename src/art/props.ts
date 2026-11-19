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

/** Tents by tier (0 ragged … 3 war pavilion), in any canvas colour. */
export function tent(tier = 0, color = '#6b5a44'): Strip {
  return memo(`tent-${tier}-${color}`, () => {
    const lit = shade(color, 0.1);
    const dark = shade(color, -0.2);
    const wood = '#5a3e2b';
    if (tier <= 1) {
      const W = tier === 0 ? 30 : 34;
      const H = tier === 0 ? 22 : 24;
      return strip(W, H, 1, (px) => {
        const mid = W / 2;
        const top = 3;
        const base = H - 1;
        for (let y = top; y < base; y++) {
          const half = Math.round(((y - top) / (base - top)) * (mid - 2)) + 1;
          for (let x = Math.ceil(mid - half); x < mid + half; x++) px(x, y, x < mid ? lit : dark);
        }
        // door
        for (let y = top + 6; y < base; y++) {
          const half = Math.round(((y - top - 6) / (base - top - 6)) * (tier === 0 ? 4 : 5));
          for (let x = Math.ceil(mid - half); x < mid + half; x++) px(x, y, '#120c10');
        }
        if (tier === 0) {
          rect(px, 5, 15, 3, 3, '#7a1f2b');
          px(6, 16, '#a3202d');
        } else {
          // tied-back flap and guy ropes
          for (let y = top + 7; y < base - 2; y++) px(mid + 2 + Math.floor((y - top - 7) / 3), y, lit);
          for (let i = 0; i < 6; i++) { px(1 + i, base - 1 - Math.floor(i * 1.6), '#8a7a62'); px(W - 2 - i, base - 1 - Math.floor(i * 1.6), '#8a7a62'); }
          rect(px, Math.floor(mid) - 1, top - 1, 2, 1, wood);
        }
        px(Math.floor(mid) - 1, 1, wood); px(Math.floor(mid), 1, wood); px(Math.floor(mid) - 1, 2, wood); px(Math.floor(mid), 2, wood);
        rect(px, 0, base, W, 1, '#3a2a1e');
      });
    }
    // pavilions: walls + peaked roof
    const W = tier === 2 ? 44 : 50;
    const H = tier === 2 ? 32 : 36;
    const trim = tier === 2 ? '#e0a33a' : '#6b6f78';
    return strip(W, H, 2, (px, f) => {
      const mid = W / 2;
      const roofTop = 8;
      const wallTop = tier === 2 ? 18 : 20;
      const base = H - 1;
      // roof
      for (let y = roofTop; y < wallTop; y++) {
        const half = Math.round(((y - roofTop) / (wallTop - roofTop)) * (mid - 1)) + 1;
        for (let x = Math.ceil(mid - half); x < mid + half; x++) px(x, y, (Math.floor(x / 4) % 2 ? lit : shade(color, 0.22)));
      }
      rect(px, 1, wallTop, W - 2, 1, trim);
      // scalloped valance
      for (let x = 1; x < W - 1; x += 3) px(x + 1, wallTop + 1, trim);
      // walls
      rect(px, 2, wallTop + 1, W - 4, base - wallTop - 1, dark);
      rect(px, 2, wallTop + 1, Math.floor(W / 2) - 2, base - wallTop - 1, color);
      // doorway
      rect(px, Math.floor(mid) - 4, wallTop + 4, 8, base - wallTop - 4, '#120c10');
      rect(px, Math.floor(mid) - 5, wallTop + 3, 1, base - wallTop - 3, trim);
      rect(px, Math.floor(mid) + 4, wallTop + 3, 1, base - wallTop - 3, trim);
      // centre pole + pennant (waves between frames)
      rect(px, Math.floor(mid), 1, 1, roofTop, wood);
      const flag = tier === 2 ? '#a3202d' : '#14121a';
      for (let i = 0; i < 6; i++) px(Math.floor(mid) + 1 + i, 2 + ((i + f) % 2), flag);
      for (let i = 0; i < 4; i++) px(Math.floor(mid) + 1 + i, 3 + ((i + f) % 2), flag);
      if (tier === 3) {
        // iron band and a crest above the door
        rect(px, 2, wallTop + 2, W - 4, 1, shade(trim, -0.3));
        for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) + Math.abs(y) <= 2) px(Math.floor(mid) + x, wallTop - 4 + y, y === 0 && x === 0 ? '#ff4a5a' : trim);
        rect(px, 4, wallTop - 2, 1, 4, wood);
        rect(px, W - 5, wallTop - 2, 1, 4, wood);
      }
      rect(px, 0, base, W, 1, '#3a2a1e');
    });
  });
}

/** Campfire by hearth tier (0 pit, 1 stone hearth, 2 cooking spit, 3 cauldron), 3 frames. */
export function campfire(tier = 0, flame: [string, string, string] = ['#c8402a', '#f0a030', '#fff0a0']): Strip {
  return memo(`fire-${tier}-${flame.join()}`, () => {
    const W = tier === 0 ? 14 : tier === 1 ? 18 : 22;
    const H = tier === 3 ? 24 : tier === 2 ? 20 : 16;
    return strip(W, H, 3, (px, f) => {
      const cx = W / 2;
      const base = H - 1;
      // stones
      const stones = tier === 0 ? [[1, 0], [3, 1], [6, 1], [9, 1], [12, 0]] : Array.from({ length: Math.floor(W / 2) }, (_, i) => [i * 2, i % 2]);
      for (const [x, dy] of stones) {
        px(x, base - dy, '#5a5560'); px(x + 1, base - dy, '#46424c');
        if (tier >= 1) px(x, base - dy - 1, '#6a6570');
      }
      // logs
      for (let i = 0; i < 10; i++) {
        px(cx - 5 + i, base - 2 - Math.floor(i / 4), '#5a3e2b');
        px(cx + 4 - i, base - 2 - Math.floor(i / 4), '#4a3020');
      }
      // flames
      const r = mulberry32(7 + f * 13 + tier);
      const fireBase = base - 3;
      for (let x = Math.round(cx) - 3; x <= Math.round(cx) + 2; x++) {
        const peak = fireBase - 9 + Math.floor(r() * 5) + Math.abs(x - cx + 0.5) * 1.2;
        for (let y = Math.round(peak); y <= fireBase; y++) {
          const t = (y - peak) / (fireBase - peak);
          px(x, y, t < 0.35 ? flame[0] : t < 0.7 ? flame[1] : flame[2]);
        }
      }
      if (tier === 2) {
        // Y-sticks and a roast on the spit
        for (let y = base - 12; y < base; y++) { px(1, y, '#5a3e2b'); px(W - 2, y, '#5a3e2b'); }
        px(0, base - 13, '#5a3e2b'); px(2, base - 13, '#5a3e2b'); px(W - 3, base - 13, '#5a3e2b'); px(W - 1, base - 13, '#5a3e2b');
        rect(px, 1, base - 12, W - 2, 1, '#3a2a1e');
        rect(px, Math.round(cx) - 3, base - 14, 6, 3, '#8a4a2a');
        rect(px, Math.round(cx) - 2, base - 14, 4, 1, '#b06a3a');
      }
      if (tier === 3) {
        // tripod and cauldron, steam rising
        for (let i = 0; i < 14; i++) { px(2 + Math.floor(i / 2.2), base - i, '#3a3640'); px(W - 3 - Math.floor(i / 2.2), base - i, '#3a3640'); }
        rect(px, Math.round(cx) - 1, base - 16, 1, 3, '#3a3640');
        rect(px, Math.round(cx) - 5, base - 13, 9, 5, '#1e1a22');
        rect(px, Math.round(cx) - 6, base - 13, 11, 1, '#3a3640');
        rect(px, Math.round(cx) - 4, base - 12, 7, 1, flame[1]);
        for (let i = 0; i < 4; i++) px(Math.round(cx) - 2 + ((i + f) % 3), base - 15 - i - f, 'rgba(232,223,207,0.5)');
      }
      // a stray spark
      px(2 + ((f * 4) % (W - 4)), 1 + f, flame[2]);
    }, false);
  });
}

/** Banner on a pole with a sigil; tier 2 is taller with a gilded finial. 2 frames of wave. */
export function banner(color: string, sigil: string, tier = 1): Strip {
  return memo(`banner-${color}-${sigil}-${tier}`, () => {
    const H = tier >= 2 ? 48 : 40;
    const W = 14;
    const glyphs: Record<string, string[]> = {
      sword: ['..#..', '..#..', '..#..', '.###.', '..#..'],
      skull: ['.###.', '#.#.#', '#####', '.#.#.', '.###.'],
      moon: ['.##..', '#....', '#....', '#....', '.##..'],
      crown: ['#.#.#', '#####', '#####', '.....', '.....'],
      flame: ['..#..', '.##..', '.###.', '####.', '.##..'],
    };
    return strip(W, H, 2, (px, f) => {
      const wood = '#5a3e2b';
      rect(px, 1, 3, 2, H - 3, wood);
      if (tier >= 2) { rect(px, 0, 0, 4, 3, '#e0a33a'); px(1, 0, '#f5c96a'); }
      else rect(px, 1, 1, 2, 2, '#8a7a62');
      rect(px, 1, 5, 11, 1, wood);
      const clothTop = 6;
      const len = 18;
      for (let y = 0; y < len; y++) {
        const wave = Math.round(Math.sin((y + f * 2) / 3) * 0.6);
        for (let x = 0; x < 9; x++) {
          // swallowtail
          if (y > len - 4 && x > 2 && x < 6 && y - (len - 4) > Math.abs(x - 4) - 1) continue;
          px(3 + x + wave, clothTop + y, x === 8 ? shade(color, -0.3) : x === 0 ? shade(color, 0.15) : color);
        }
      }
      const g = glyphs[sigil] ?? glyphs.sword;
      const gold = color === '#e0a33a' ? '#14121a' : '#f5c96a';
      g.forEach((row, y) => [...row].forEach((c, x) => c === '#' && px(5 + x, clothTop + 5 + y, gold)));
    });
  });
}

/** Weapon rack with a sword, an axe and a spear. */
export function rack(): Strip {
  return memo('rack', () =>
    strip(16, 18, 1, (px) => {
      const wood = '#5a3e2b';
      rect(px, 1, 4, 2, 14, wood); rect(px, 13, 4, 2, 14, wood);
      rect(px, 0, 6, 16, 1, '#4a3020'); rect(px, 0, 14, 16, 1, '#4a3020');
      rect(px, 5, 1, 1, 15, '#b8bcc4'); px(5, 0, '#e8e3d9'); rect(px, 4, 12, 3, 1, '#a08a5a');
      rect(px, 8, 3, 1, 14, wood); rect(px, 9, 3, 2, 4, '#8a9098'); px(11, 4, '#c8ccd4');
      rect(px, 12, 0, 1, 16, wood); px(12, 0, '#c8ccd4'); px(11, 1, '#c8ccd4'); px(13, 1, '#c8ccd4');
      rect(px, 0, 17, 16, 1, '#3a2a1e');
    }),
  );
}

/** A lantern on a hooked post. */
export function lanternPost(color = '#f0a840'): Strip {
  return memo(`lantern-${color}`, () =>
    strip(8, 24, 2, (px, f) => {
      rect(px, 1, 2, 1, 22, '#2a2024');
      rect(px, 1, 2, 5, 1, '#2a2024');
      px(5, 3, '#2a2024');
      rect(px, 4, 4, 3, 1, '#3a3640');
      rect(px, 4, 5, 3, 3, '#3a3640');
      px(5, 5, f ? shade(color, 0.4) : color); px(5, 6, color);
      rect(px, 4, 8, 3, 1, '#3a3640');
    }),
  );
}

/** A short plank dock reaching over the pond. */
export function dock(): Strip {
  return memo('dock', () =>
    strip(26, 9, 1, (px) => {
      for (let x = 0; x < 26; x++) px(x, 3, x % 4 === 3 ? '#4a3020' : '#7a5a3a');
      rect(px, 0, 4, 26, 1, '#5a3e2b');
      for (const x of [2, 12, 22]) rect(px, x, 5, 2, 4, '#3a2a1e');
      rect(px, 24, 0, 1, 3, '#5a3e2b');
    }),
  );
}

/** Pets: raven, black cat, wolf pup. 2 frames. */
export function pet(id: string): Strip {
  return memo(`pet-${id}`, () => {
    if (id === 'raven')
      return strip(11, 10, 2, (px, f) => {
        const b = '#15121c';
        rect(px, 3, 4, 5, 4, b); rect(px, 2, 5, 1, 2, b);
        rect(px, 5 + f, 1, 3, 3, b); // head bobs
        px(7 + f, 2, '#e8dfcf');
        px(8 + f, 2, '#3a3640'); px(9 + f, 3, '#3a3640');
        rect(px, 0, 6, 2, 1, b);
        px(4, 8, '#3a3640'); px(6, 8, '#3a3640'); px(4, 9, '#3a3640'); px(6, 9, '#3a3640');
        px(4, 5, '#2a2a3a');
      });
    if (id === 'cat')
      return strip(13, 12, 2, (px, f) => {
        const b = '#17141c';
        rect(px, 3, 5, 6, 6, b); rect(px, 2, 7, 1, 4, b); rect(px, 9, 7, 1, 4, b);
        rect(px, 3, 1, 6, 5, b);
        px(3, 0, b); px(8, 0, b);
        px(4, 3, '#9fd16a'); px(7, 3, '#9fd16a');
        px(5, 4, '#3a3640'); px(6, 4, '#3a3640');
        // tail swishes
        if (f) { rect(px, 10, 9, 2, 1, b); rect(px, 11, 6, 1, 3, b); px(12, 5, b); }
        else { rect(px, 10, 10, 2, 1, b); rect(px, 12, 8, 1, 2, b); }
        rect(px, 3, 11, 2, 1, '#2a2430'); rect(px, 7, 11, 2, 1, '#2a2430');
      });
    return strip(15, 13, 2, (px, f) => {
      const g = '#7a7480';
      const dg = shade(g, -0.25);
      rect(px, 3, 6, 7, 6, g); rect(px, 3, 10, 7, 2, dg);
      rect(px, 2, 2, 7, 5, g);
      px(2, 0, g); px(2, 1, g); px(3, 1, g); px(7, 0, g); px(7, 1, g); px(8, 1, g);
      rect(px, 0, 4, 3, 2, shade(g, 0.15)); px(0, 4, '#1a1418');
      px(4, 3, '#f5c96a'); px(7, 3, '#f5c96a');
      if (f) px(1, 6, '#d13a48'); // tongue
      // tail wags
      if (f) { rect(px, 10, 6, 2, 1, g); rect(px, 12, 4, 1, 2, g); px(13, 3, shade(g, 0.2)); }
      else { rect(px, 10, 7, 3, 1, g); px(13, 6, shade(g, 0.2)); }
      rect(px, 3, 12, 2, 1, dg); rect(px, 8, 12, 2, 1, dg);
    });
  });
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

/** Rolled-out sleeping mat with a pillow at the left, 40×5. */
export function bedroll(): Strip {
  return memo('bedroll', () =>
    strip(40, 5, 1, (px) => {
      rect(px, 0, 2, 40, 3, '#5e1219');
      rect(px, 0, 2, 40, 1, '#7a1f2b');
      for (let x = 11; x < 40; x += 5) px(x, 3, '#a3202d');
      rect(px, 0, 1, 10, 3, '#b5ab9b');
      rect(px, 0, 1, 10, 1, '#d8cfbf');
    }),
  );
}

/**
 * The hero lying flat on their back under a blanket, seen from the side: head on the
 * pillow at the left, feet at the right. Two frames: the chest rises and falls. 40×11.
 */
export function sleeper(skin: string, hairStyle: string, hair: string): Strip {
  return memo(`sleeper-${skin}-${hairStyle}-${hair}`, () =>
    strip(40, 11, 2, (px, f) => {
      const o = 1; // leave room for the outline
      const sk = skin;
      const skD = shade(skin, -0.18);
      // head in profile, face turned up: crown at the left, chin at the right
      const face: [number, number][] = [[1, 5], [2, 4], [3, 3], [4, 3], [5, 2], [6, 4], [7, 4]]; // [x, top row]
      for (const [x, t] of face) rect(px, o + x, t, 1, (x === 7 ? 7 : 9) - t, sk);
      px(o + 5, 3, skD); // nostril shadow under the nose
      rect(px, o + 1, 8, 6, 1, skD); // back of the head, in shadow
      px(o + 3, 6, skD); // ear
      px(o + 4, 4, '#2a1a1a'); // closed eye
      px(o + 3, 4, shade(skin, -0.3));
      px(o + 6, 5, shade(skin, -0.35)); // mouth
      if (hairStyle !== 'bald') {
        rect(px, o + 0, 5, 2, 4, hair); // crown against the pillow
        px(o + 1, 4, hair);
        px(o + 2, 3, hair);
        rect(px, o + 1, 8, 3, 1, hair);
        if (hairStyle === 'long' || hairStyle === 'braid' || hairStyle === 'wild') {
          rect(px, o - 1, 6, 1, 4, hair); // spilling over the pillow
          rect(px, o + 1, 9, 4, 1, hair);
        }
        if (hairStyle === 'wild') { px(o - 1, 4, hair); px(o, 3, hair); }
        if (hairStyle === 'mohawk') { px(o - 1, 5, hair); px(o - 1, 6, hair); }
        px(o + 1, 5, shade(hair, 0.2));
      }
      // the blanket: a low mound over chest, belly, legs, with feet poking up at the end
      const wool = '#7a1f2b';
      const woolD = '#5e1219';
      const top = (x: number) => {
        if (x < 11) return 4; // folded edge at the chin
        if (x < 21) return 4 - (f === 1 && x > 12 && x < 19 ? 1 : 0); // chest, breathing
        if (x < 26) return 5; // belly
        if (x < 33) return 6; // legs
        if (x < 37) return 4; // feet
        return 6;
      };
      for (let x = 8; x < 38; x++) {
        const t = top(x);
        rect(px, o + x, t, 1, 10 - t, wool);
        rect(px, o + x, 9, 1, 1, woolD);
        if (x % 6 === 2) rect(px, o + x, t + 1, 1, 8 - t, '#a3202d'); // stripes
      }
      rect(px, o + 8, 4, 3, 1, '#d8cfbf'); // folded linen edge under the chin
      rect(px, o + 8, 5, 3, 2, '#b5ab9b');
      rect(px, o + 20, 7, 1, 2, woolD); // a fold where the legs begin
      rect(px, o + 33, 4, 4, 1, shade(wool, 0.15));
    }),
  );
}
