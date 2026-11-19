/**
 * The hero seen side-on, facing right, for travelling. Same 32×32 grid, palette and gear as
 * the front-facing sprite, redrawn in profile, with a 4-frame stride:
 *   0 near leg forward · 1 passing · 2 near leg back · 3 passing
 * Arms swing against the legs; the body dips on each footfall.
 */
import type { GearLook } from '../data/gear';
import { GLOWING_EYES } from '../data/appearance';
import type { Appearance } from '../game/types';
import { mix, shade } from './color';
import { BOOTS, Grid, LEATHER, PANTS, TUNIC, lookOf, type Cell, type SpriteLook } from './sprite';

type Pt = [number, number];
type LegPose = 'forward' | 'back' | 'support' | 'swing';

/** Thick line between two points (a limb). */
function limb(g: Grid, [x0, y0]: Pt, [x1, y1]: Pt, w: number, c: string) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    g.rect(x - Math.floor(w / 2), y, w, 1, c);
  }
}

/** Leg joints for each phase of the stride: [knee, ankle, boot x, boot y]. */
const LEG: Record<LegPose, { knee: Pt; ankle: Pt; boot: Pt }> = {
  forward: { knee: [18, 26], ankle: [20, 28], boot: [19, 29] },
  back: { knee: [14, 26], ankle: [12, 28], boot: [10, 29] },
  support: { knee: [16, 26], ankle: [16, 28], boot: [15, 29] },
  swing: { knee: [19, 25], ankle: [17, 27], boot: [16, 27] },
};

function drawLeg(g: Grid, pose: LegPose, far: boolean, hipY: number) {
  const d = far ? -0.25 : 0;
  const pants = shade(PANTS, far ? -0.2 : 0.2);
  const boots = shade(BOOTS, d);
  const L = LEG[pose];
  limb(g, [16, hipY], L.knee, 3, pants);
  limb(g, L.knee, L.ankle, 3, pants);
  const [bx, by] = L.boot;
  // boot: heel at bx, toe pointing right
  g.rect(bx, by, 5, 2, boots);
  g.rect(bx, by - 1, 3, 1, boots);
  if (!far) g.rect(bx, by - 1, 3, 1, shade(BOOTS, 0.15));
  if (pose === 'back') g.clear(bx, by + 1); // heel lifting off
}

/** Cloak streaming behind the hero; the hem flutters with the stride. */
function drawCloak(g: Grid, c: GearLook, oy: number, frame: number) {
  const top = 15 + oy;
  const bottom = c.style === 'short' ? 24 : 29;
  const flare = [2, 3, 2, 1][frame];
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    const back = Math.round(13 - 2 - t * (2 + flare)); // trailing edge drifts back as it falls
    g.rect(back, y, 16 - back, 1, shade(c.color, -0.35));
    g.set(back, y, c.color);
  }
  const hemBack = Math.round(11 - (2 + flare));
  g.rect(hemBack, bottom, 16 - hemBack, 1, c.trim);
  if (c.style === 'tattered')
    for (let x = hemBack; x < 16; x++) {
      if ((x + frame) % 3 === 0) g.clear(x, bottom);
      if ((x + frame) % 4 === 1) { g.clear(x, bottom); g.clear(x, bottom - 1); }
    }
}

function drawTorso(g: Grid, a: GearLook | undefined, oy: number, frame: number): string {
  const y = 15 + oy;
  const belt = (buckle: string) => {
    g.rect(13, 22 + oy, 7, 1, LEATHER);
    g.set(19, 22 + oy, buckle);
  };
  if (!a) {
    g.srect(13, y, 7, 8, TUNIC);
    g.rect(18, y, 2, 1, shade(TUNIC, -0.3));
    belt('#8a7a62');
    return TUNIC;
  }
  const c = a.color;
  switch (a.style) {
    case 'plate':
      g.srect(13, y, 7, 8, c);
      g.rect(19, y + 1, 1, 6, shade(c, 0.2));
      g.rect(13, y + 3, 7, 1, shade(c, -0.15));
      belt(a.trim);
      return c;
    case 'chain':
      for (let j = 0; j < 8; j++) for (let i = 0; i < 7; i++) g.set(13 + i, y + j, (i + j) % 2 ? shade(c, -0.2) : c);
      g.rect(17, y + 1, 3, 4, a.trim); // tabard front
      belt('#a08a5a');
      return shade(c, -0.1);
    case 'robe': {
      g.srect(13, y, 7, 8, c);
      // skirt over the legs, swinging with the stride
      const wide = frame % 2 === 0;
      for (let j = 0; j < 7; j++) {
        const x0 = 13 - (wide ? Math.floor(j / 2) : Math.floor(j / 3));
        const x1 = 19 + (wide ? Math.floor(j / 2) : Math.floor(j / 3));
        g.rect(x0, 23 + oy + j, x1 - x0 + 1, 1, j === 6 ? a.trim : c);
        g.set(x0, 23 + oy + j, j === 6 ? a.trim : shade(c, -0.25));
      }
      g.rect(18, y, 2, 1, a.trim);
      g.rect(13, 22 + oy, 7, 1, shade(c, -0.35));
      return c;
    }
    case 'leather':
    default:
      g.srect(13, y, 7, 8, c);
      for (let j = 1; j < 6; j += 2) g.set(19, y + j, a.trim);
      g.rect(14, y + 4, 2, 1, shade(c, 0.15));
      belt(a.trim);
      return c;
  }
}

function drawPauldron(g: Grid, a: GearLook | undefined, oy: number) {
  if (a?.style !== 'plate') return;
  g.srect(14, 14 + oy, 5, 3, a.color);
  g.rect(14, 16 + oy, 5, 1, a.trim);
  g.set(15, 14 + oy, shade(a.color, 0.3));
}

function drawArm(g: Grid, hand: Pt, sleeve: string, skin: string, oy: number, far: boolean) {
  const d = far ? -0.3 : 0.14;
  limb(g, [16, 15 + oy], hand, 2, shade(sleeve, d));
  if (!far) limb(g, [15, 16 + oy], [hand[0] - 1, hand[1]], 1, shade(sleeve, -0.25)); // shadowed back edge
  g.rect(hand[0] - 1, hand[1] + 1, 2, 1, shade(skin, far ? -0.3 : 0));
}

function drawHeadSide(g: Grid, ap: Appearance, oy: number) {
  const s = ap.skin;
  g.rect(15, 14 + oy, 3, 1, shade(s, -0.2)); // neck
  g.rect(13, 6 + oy, 7, 8, s);
  g.rect(20, 9 + oy, 1, 2, s); // nose
  g.set(20, 11 + oy, shade(s, -0.15));
  g.rect(13, 6 + oy, 2, 8, shade(s, -0.12)); // back of the head
  g.rect(14, 13 + oy, 4, 1, shade(s, -0.18)); // jaw shadow
  g.set(19, 13 + oy, shade(s, -0.1));
  g.set(15, 10 + oy, shade(s, -0.25)); // ear
  g.set(15, 11 + oy, shade(s, -0.2));
  const glow = GLOWING_EYES.has(ap.eyeColor);
  const brow = ap.hairStyle === 'bald' ? shade(s, -0.4) : shade(ap.hairColor, -0.1);
  g.rect(18, 9 + oy, 2, 1, brow);
  g.set(19, 10 + oy, ap.eyeColor);
  g.set(18, 10 + oy, glow ? shade(ap.eyeColor, -0.3) : '#e8dfcf');
  g.set(19, 12 + oy, shade(s, -0.32)); // mouth
  const scar = mix(s, '#7a1f2b', 0.65);
  if (ap.scar === 'cheek') g.pts([[17, 11], [18, 12]], scar, 0, oy);
  if (ap.scar === 'eye') g.pts([[18, 8], [18, 11]], scar, 0, oy);
  if (ap.scar === 'jaw') g.pts([[16, 13], [17, 12]], scar, 0, oy);
}

function drawHairSide(g: Grid, ap: Appearance, oy: number, frame: number) {
  const c = ap.hairColor;
  const hi = shade(c, 0.25);
  const dk = shade(c, -0.3);
  const sway = frame % 2;
  const cap = () => {
    g.rect(13, 5 + oy, 7, 2, c);
    g.rect(14, 4 + oy, 5, 1, c);
    g.rect(12, 6 + oy, 3, 4, c);
    g.set(19, 7 + oy, c); // fringe
    g.pts([[15, 4], [16, 4]], hi, 0, oy);
    g.rect(12, 7 + oy, 1, 3, dk);
  };
  switch (ap.hairStyle) {
    case 'short': cap(); break;
    case 'long':
      cap();
      g.rect(12 - sway, 9 + oy, 3, 7, c); // hangs down the back, swaying
      g.rect(12 - sway, 9 + oy, 1, 7, dk);
      break;
    case 'wild':
      g.rect(12, 4 + oy, 8, 4, c);
      g.pts([[12, 3], [14, 2], [16, 3], [18, 2], [11, 5], [11, 7], [20, 5]], c, 0, oy);
      g.rect(11, 8 + oy, 3, 4, c);
      g.pts([[14, 3], [16, 4]], hi, 0, oy);
      g.rect(11, 8 + oy, 1, 4, dk);
      break;
    case 'braid':
      cap();
      for (let j = 0; j < 10; j++) g.set(11 - (j > 4 ? sway : 0), 9 + j + oy, j % 2 ? dk : c);
      g.set(11 - sway, 19 + oy, '#7a1f2b');
      break;
    case 'mohawk':
      g.rect(13, 6 + oy, 7, 1, shade(ap.skin, -0.18));
      g.rect(13, 2 + oy, 6, 4, c);
      g.rect(13, 2 + oy, 6, 1, dk);
      g.set(17, 3 + oy, hi);
      break;
    case 'bald':
      g.set(16, 7 + oy, shade(ap.skin, 0.18));
      break;
  }
}

function drawHelmSide(g: Grid, h: GearLook, ap: Appearance, oy: number) {
  const c = h.color;
  const dk = shade(c, -0.3);
  const glow = GLOWING_EYES.has(ap.eyeColor);
  switch (h.style) {
    case 'hood':
      for (let y = 4; y <= 15; y++) {
        const x0 = y < 6 ? 13 : 11;
        const x1 = y === 4 ? 18 : 19;
        for (let x = x0; x <= x1; x++) {
          if (x >= 17 && y >= 8 && y <= 13) continue; // face opening
          g.set(x, y + oy, x <= 12 ? dk : c);
        }
      }
      g.rect(17, 8 + oy, 3, 1, shade(ap.skin, -0.45)); // shadow under the brim
      g.rect(12, 15 + oy, 6, 1, h.trim);
      g.set(14, 4 + oy, shade(c, 0.2));
      break;
    case 'greathelm':
      g.srect(13, 5 + oy, 8, 9, c);
      g.rect(14, 4 + oy, 6, 1, c);
      g.rect(17, 10 + oy, 4, 1, '#0a0a0c');
      g.set(19, 10 + oy, glow ? ap.eyeColor : '#2a2a2e');
      g.rect(14, 3 + oy, 5, 1, h.trim); // crest
      g.pts([[19, 12], [20, 12]], shade(c, -0.4), 0, oy);
      g.set(14, 6 + oy, shade(c, 0.3));
      break;
    case 'crown':
      g.rect(13, 5 + oy, 7, 2, c);
      g.pts([[13, 4], [13, 3], [15, 4], [16, 3], [16, 2], [18, 4], [19, 3]], c, 0, oy);
      g.set(16, 5 + oy, h.trim);
      g.rect(13, 6 + oy, 7, 1, dk);
      break;
    case 'horned': {
      g.srect(13, 4 + oy, 7, 4, c);
      g.rect(13, 7 + oy, 7, 1, shade(c, -0.25));
      const horn: Pt[] = [[14, 3], [13, 2], [12, 1], [11, 1]]; // sweeping back
      g.pts(horn, h.trim, 0, oy);
      g.pts([[18, 3], [19, 2], [20, 1], [21, 1]], shade(h.trim, -0.15), 0, oy); // and forward
      break;
    }
    case 'circlet':
      g.rect(13, 7 + oy, 7, 1, c);
      g.set(19, 7 + oy, h.trim);
      g.set(19, 6 + oy, shade(h.trim, 0.3));
      break;
    case 'mask':
      g.srect(18, 7 + oy, 3, 7, c);
      g.set(19, 10 + oy, glow ? ap.eyeColor : '#0a0a0c');
      g.rect(20, 11 + oy, 1, 3, shade(c, -0.15)); // beak
      g.set(21, 12 + oy, shade(c, -0.15));
      g.rect(11, 6 + oy, 11, 1, h.trim); // hat brim
      g.rect(13, 4 + oy, 6, 2, h.trim);
      break;
  }
}

/** The weapon, held in the near hand. Returns true when the hand is busy (arm doesn't swing). */
function drawWeaponSide(g: Grid, w: GearLook, hand: Pt, frame: number) {
  const c = w.color;
  const t = w.trim;
  const [hx, hy] = hand;
  switch (w.style) {
    case 'sword': // resting upright against the shoulder
      g.rect(hx, hy - 12, 1, 12, c);
      g.rect(hx + 1, hy - 11, 1, 11, shade(c, -0.35));
      g.set(hx, hy - 13, shade(c, 0.3));
      g.rect(hx - 2, hy, 5, 1, t);
      g.rect(hx, hy + 1, 1, 2, '#3a2616');
      break;
    case 'staff': // a walking staff, held out ahead
      g.rect(hx + 1, hy - 16, 1, 30 - (hy - 16), c);
      g.rect(hx, hy - 19, 3, 3, t);
      g.set(hx + 1, hy - 18, shade(t, 0.6));
      break;
    case 'scythe':
      g.rect(hx + 1, hy - 18, 1, 30 - (hy - 18), c);
      g.rect(hx - 4, hy - 18, 5, 1, t);
      g.rect(hx - 6, hy - 17, 3, 1, shade(t, -0.15));
      g.set(hx - 7, hy - 16, shade(t, 0.3));
      break;
    case 'dagger':
      g.rect(hx + 1, hy, 4, 1, c);
      g.set(hx + 5, hy, shade(c, 0.3));
      g.rect(hx, hy - 1, 1, 3, t);
      break;
    case 'axe': // carried low, head forward
      g.rect(hx + 1, hy - 3, 1, 10, '#5a3e2b');
      g.srect(hx + 2, hy - 4, 3, 4, c);
      g.rect(hx + 5, hy - 3, 1, 2, shade(c, 0.35));
      g.set(hx + 1, hy - 4, t);
      break;
    case 'tome':
      g.srect(hx - 1, hy + 1, 4, 5, c);
      g.rect(hx + 3, hy + 2, 1, 4, '#e8dfcf');
      g.set(hx + 1, hy + 3, t);
      break;
    case 'lantern': { // swings on its handle
      const sw = [0, 1, 0, -1][frame];
      g.rect(hx, hy + 1, 1, 2, '#2a2a2e');
      g.rect(hx - 1 + sw, hy + 3, 3, 1, c);
      g.rect(hx - 1 + sw, hy + 4, 3, 3, shade(c, -0.2));
      g.set(hx + sw, hy + 5, shade(t, 0.5));
      g.rect(hx - 1 + sw, hy + 7, 3, 1, c);
      break;
    }
  }
}

const NEAR_LEG: LegPose[] = ['forward', 'support', 'back', 'swing'];
const FAR_LEG: LegPose[] = ['back', 'swing', 'forward', 'support'];
// near hand swings opposite the near leg
const NEAR_HAND: Pt[] = [[13, 21], [16, 22], [19, 20], [16, 22]];
const FAR_HAND: Pt[] = [[19, 20], [16, 22], [13, 21], [16, 22]];

export function renderSideWalk(look: SpriteLook, frame = 0): Cell[] {
  const f = frame % 4;
  const g = new Grid();
  const oy = f % 2 === 0 ? 1 : 0; // the body dips as each foot lands
  const ap = look.appearance;
  const eq = look.equipped;
  const helm = lookOf(eq, 'helm');
  const armor = lookOf(eq, 'armor');
  const cloak = lookOf(eq, 'cloak');
  const weapon = lookOf(eq, 'weapon');
  const sleeveOf = (a: GearLook | undefined) => (a ? (a.style === 'chain' ? shade(a.color, -0.1) : a.color) : TUNIC);
  const sleeve = sleeveOf(armor);
  // a carried weapon steadies the near hand a little forward of the body
  const longShaft = weapon && (weapon.style === 'staff' || weapon.style === 'scythe');
  const nearHand: Pt = longShaft ? [21, 19 + oy] : weapon ? [19, 21 + oy] : [NEAR_HAND[f][0], NEAR_HAND[f][1] + oy];
  const farHand: Pt = [FAR_HAND[f][0], FAR_HAND[f][1] + oy];

  if (cloak) drawCloak(g, cloak, oy, f);
  drawArm(g, farHand, sleeve, ap.skin, oy, true);
  drawLeg(g, FAR_LEG[f], true, 23 + oy);
  drawLeg(g, NEAR_LEG[f], false, 23 + oy);
  drawTorso(g, armor, oy, f);
  if (cloak) {
    g.rect(14, 14 + oy, 4, 2, cloak.color); // collar / clasp
    g.set(17, 15 + oy, cloak.trim);
  }
  drawHeadSide(g, ap, oy);
  const hairHidden = helm && (helm.style === 'greathelm' || helm.style === 'hood');
  if (!hairHidden) drawHairSide(g, ap, oy, f);
  if (helm) drawHelmSide(g, helm, ap, oy);
  drawPauldron(g, armor, oy);
  const behind = longShaft;
  if (weapon && behind) drawWeaponSide(g, weapon, nearHand, f);
  drawArm(g, nearHand, sleeve, ap.skin, oy, false);
  if (armor?.style === 'robe') g.rect(nearHand[0] - 1, nearHand[1], 2, 1, armor.trim); // cuff
  if (weapon && !behind) drawWeaponSide(g, weapon, nearHand, f);
  g.outline();
  return g.px;
}
