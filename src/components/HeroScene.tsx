import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import HeroSprite from './HeroSprite';
import type { SpriteLook } from '../art/sprite';
import { banner, bedroll, campfire, dock, embers, lanternPost, pet, pond, rack, tent, type Strip } from '../art/props';
import { DEFAULT_CAMP, FIRE_COLORS, tierOf, type CampState } from '../data/camp';
import type { Region } from '../data/regions';
import type { Activity } from '../game/activity';
export type SceneActivity = Activity | 'away';

interface Props {
  look: SpriteLook;
  activity: SceneActivity;
  region: Region;
  /** ground offset and landscape scale, from <Landscape> */
  ground: number;
  scale: number;
  /** sprite size relative to landscape pixels */
  zoom?: number;
  aura?: string;
  celebrate?: number | string;
  camp?: CampState;
  /** today was a perfect day: the fire roars */
  perfect?: boolean;
  /** current combo count: the fire swells with it */
  combo?: number;
}

/** A prop strip rendered at sprite-pixel scale, animated if it has frames. */
export function Prop({ strip, u, style, speed = 0.5 }: { strip: Strip; u: number; style?: CSSProperties; speed?: number }) {
  const n = strip.frames;
  return (
    <div
      className={`pixelated absolute ${n > 1 ? 'sprite-anim' : ''}`}
      style={{
        width: strip.w * u,
        height: strip.h * u,
        backgroundImage: `url(${strip.src})`,
        backgroundSize: `${n * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        animation: n > 1 ? `sprite-${n} ${speed * n}s steps(${n}) infinite` : undefined,
        ...style,
      }}
    />
  );
}

/** Places something centred at x (sprite px from the middle) with its bottom at `bottom` px. */
const at = (x: number, w: number, u: number, bottom: number): CSSProperties => ({ left: `calc(50% + ${(x - w / 2) * u}px)`, bottom });

export default function HeroScene({ look, activity, region, ground, scale, zoom = 1.15, aura, celebrate, camp = DEFAULT_CAMP, perfect = false, combo = 0 }: Props) {
  const heat = Math.min(Math.max(combo - 1, 0), 6); // 0..6
  const u = scale * zoom; // CSS px per sprite pixel
  const size = Math.round(32 * u);
  const base = ground - 4 * scale; // bottom of the hero's 32px box
  const feet = base + u; // where feet (and props) meet the ground

  // the camp's built pieces
  const tentTier = tierOf(camp, 'tent');
  const tentStrip = tent(tentTier, camp.tentColor);
  const tentX = -16 - tentStrip.w / 2;
  const flame = (FIRE_COLORS.find((c) => c.id === camp.fire) ?? FIRE_COLORS[0]).colors;
  const fireStrip = campfire(tierOf(camp, 'hearth'), flame);
  const petStrip = camp.pet ? pet(camp.pet) : null;
  const bannerTier = tierOf(camp, 'banner');
  const campsite = (fireX: number, lit: boolean) => (
    <>
      {tierOf(camp, 'lanterns') > 0 && (
        <>
          <Prop strip={lanternPost()} u={u} style={at(-62, 8, u, feet)} speed={0.9} />
          <Prop strip={lanternPost()} u={u} style={at(64, 8, u, feet)} speed={1.1} />
        </>
      )}
      {bannerTier > 0 && <Prop strip={banner(camp.bannerColor, camp.sigil, bannerTier)} u={u} style={at(52, 14, u, feet)} speed={0.8} />}
      <Prop strip={tentStrip} u={u} style={at(tentX, tentStrip.w, u, feet + 3 * u)} speed={0.9} />
      {tierOf(camp, 'rack') > 0 && <Prop strip={rack()} u={u} style={at(36, 16, u, feet + u)} />}
      {lit ? (
        <>
          <FireGlow x={fireX} u={u} bottom={feet} color={flame[1]} big={perfect} boost={heat} />
          <motion.div
            className="absolute"
            style={{ ...at(fireX, fireStrip.w, u, feet), width: fireStrip.w * u, height: fireStrip.h * u, transformOrigin: '50% 100%' }}
            animate={{ scale: 1 + heat * 0.08 }}
            transition={{ type: 'spring', stiffness: 120, damping: 10 }}
          >
            <Prop strip={fireStrip} u={u} style={{ left: 0, bottom: 0 }} speed={perfect || heat > 2 ? 0.1 : 0.16} />
          </motion.div>
        </>
      ) : (
        <>
          <FireGlow x={fireX} u={u} bottom={feet} dim color={flame[0]} />
          <Prop strip={embers()} u={u} style={at(fireX, 14, u, feet)} speed={1.2} />
        </>
      )}
    </>
  );
  const petAt = (x: number) => petStrip && <Prop strip={petStrip} u={u} style={at(x, petStrip.w, u, feet)} speed={0.9} />;

  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence mode="wait">
        <motion.div key={activity} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          {activity === 'watch' && (
            <>
              {campsite(20, true)}
              {petAt(-26)}
              <div className="absolute" style={at(0, 32, u, base)}>
                <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} />
              </div>
            </>
          )}

          {activity === 'away' && campsite(18, false)}

          {activity === 'camp' && (
            <>
              {campsite(18, true)}
              {petAt(-24)}
              <div className="absolute" style={at(-2, 32, u, base)}>
                <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose="sit" />
              </div>
            </>
          )}

          {activity === 'sleep' && (
            <>
              {campsite(24, false)}
              {petAt(15)}
              <Prop strip={bedroll()} u={u} style={at(0, 26, u, feet)} />
              <div className="absolute" style={{ ...at(1, 32, u, feet + 3 * u - 9 * u), transform: 'rotate(-90deg)' }}>
                <HeroSprite look={look} size={size} pose="sleep" shadow={false} celebrate={celebrate} />
              </div>
              <Zzz u={u} style={at(-9, 0, u, feet + 9 * u)} />
            </>
          )}

          {activity === 'fish' && <Fishing look={look} region={region} u={u} size={size} base={base} feet={feet} aura={aura} celebrate={celebrate} hasDock={tierOf(camp, 'dock') > 0} petEl={petAt(-30)} />}

          {activity === 'wander' && <Wander look={look} u={u} size={size} base={base} aura={aura} celebrate={celebrate} petStrip={petStrip} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FireGlow({ x, u, bottom, dim = false, big = false, color = '#f08c32', boost = 0 }: { x: number; u: number; bottom: number; dim?: boolean; big?: boolean; color?: string; boost?: number }) {
  const w = (dim ? 34 : big ? 96 : 60 + boost * 8) * u;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return (
    <div
      className="flame absolute rounded-full mix-blend-screen"
      style={{
        left: `calc(50% + ${x * u - w / 2}px)`,
        bottom: bottom - w * 0.3,
        width: w,
        height: w * 0.8,
        background: `radial-gradient(circle, rgba(${r},${g},${b},${dim ? 0.22 : big ? 0.6 : 0.4}), rgba(${r},${g},${b},${dim ? 0.08 : big ? 0.25 : 0.15}) 45%, transparent 70%)`,
      }}
    />
  );
}

function Zzz({ u, style }: { u: number; style: CSSProperties }) {
  return (
    <div className="absolute" style={style}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute font-pixel text-bone-dim"
          style={{ fontSize: (5 + i * 2) * u * 0.6, left: 0, bottom: 0 }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 0.9, 0], x: [0, 4 * u, 8 * u], y: [0, -8 * u, -16 * u] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
        >
          z
        </motion.span>
      ))}
    </div>
  );
}

function Fishing({ look, region, u, size, base, feet, aura, celebrate, hasDock, petEl }: { look: SpriteLook; region: Region; u: number; size: number; base: number; feet: number; aura?: string; celebrate?: number | string; hasDock?: boolean; petEl?: React.ReactNode }) {
  const heroX = -8;
  const pondX = 34;
  // rod tip is sprite pixel (31, 9.5) in the seated pose
  const tipX = heroX - 16 + 31.5;
  const tipY = base + (32 - 9.5) * u;
  const bobX = 26;
  const bobY = feet + 5 * u;
  const dx = (bobX - tipX) * u;
  const dy = tipY - bobY;
  return (
    <>
      <Prop strip={pond(region)} u={u} style={at(pondX, 48, u, feet)} speed={1.4} />
      {hasDock && <Prop strip={dock()} u={u} style={at(20, 26, u, feet + u)} />}
      {petEl}
      {/* line: from rod tip down to the float, with a little sag */}
      <svg className="absolute overflow-visible" style={{ left: `calc(50% + ${tipX * u}px)`, bottom: bobY, width: Math.max(1, dx), height: Math.max(1, dy) }}>
        <path d={`M0,0 Q${dx * 0.6},${dy * 0.55} ${dx},${dy}`} stroke="rgba(232,223,207,.55)" strokeWidth={Math.max(1, u * 0.3)} fill="none" />
      </svg>
      <motion.div
        className="absolute"
        style={{ left: `calc(50% + ${(bobX - 1) * u}px)`, bottom: bobY - u, width: 2 * u, height: 2 * u }}
        animate={{ y: [0, u * 0.6, 0, u * 0.2, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="h-1/2 w-full bg-[#d13a48]" />
        <div className="h-1/2 w-full bg-[#e8dfcf]" />
      </motion.div>
      <motion.div
        className="absolute rounded-[50%] border"
        style={{ left: `calc(50% + ${bobX * u}px)`, bottom: bobY - u * 1.2, borderColor: 'rgba(232,223,207,.35)', translateX: '-50%' }}
        animate={{ width: [2 * u, 10 * u], height: [u, 3 * u], opacity: [0.7, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <div className="absolute" style={at(heroX, 32, u, base)}>
        <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose="fish" />
      </div>
    </>
  );
}

/** Walks to random spots, pauses, turns around. */
function Wander({ look, u, size, base, aura, celebrate, petStrip }: { look: SpriteLook; u: number; size: number; base: number; aura?: string; celebrate?: number | string; petStrip?: Strip | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [moving, setMoving] = useState(false);
  const [left, setLeft] = useState(false);
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const range = useMemo(() => Math.max(0, width / 2 - 26 * u), [width, u]);

  useEffect(() => {
    if (!range || reduce) return;
    let alive = true;
    let x = 0;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        await sleep(1500 + Math.random() * 3000);
        if (!alive) break;
        const target = (Math.random() * 2 - 1) * range;
        if (Math.abs(target - x) < 12 * u) continue;
        setLeft(target < x);
        setMoving(true);
        const dur = Math.abs(target - x) / (11 * u); // ~11 sprite px per second
        await controls.start({ x: target, transition: { duration: dur, ease: 'linear' } });
        x = target;
        if (!alive) break;
        setMoving(false);
      }
    })();
    return () => {
      alive = false;
      controls.stop();
    };
  }, [range, u, controls, reduce]);

  return (
    <div ref={ref} className="absolute" style={at(0, 32, u, base)}>
      <motion.div animate={controls} initial={{ x: 0 }}>
        <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose={moving ? 'walk' : 'idle'} flip={left} />
        {petStrip && (
          <Prop
            strip={petStrip}
            u={u}
            speed={moving ? 0.25 : 0.9}
            style={{ left: `${(left ? 26 : -petStrip.w + 6) * u}px`, bottom: u, transform: left ? 'scaleX(-1)' : undefined, transition: 'left .4s ease' }}
          />
        )}
      </motion.div>
    </div>
  );
}
