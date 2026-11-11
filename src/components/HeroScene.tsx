import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import HeroSprite from './HeroSprite';
import type { SpriteLook } from '../art/sprite';
import { bedroll, campfire, embers, pond, tent, type Strip } from '../art/props';
import type { Region } from '../data/regions';
import type { Activity } from '../game/activity';

interface Props {
  look: SpriteLook;
  activity: Activity;
  region: Region;
  /** ground offset and landscape scale, from <Landscape> */
  ground: number;
  scale: number;
  /** sprite size relative to landscape pixels */
  zoom?: number;
  aura?: string;
  celebrate?: number | string;
}

/** A prop strip rendered at sprite-pixel scale, animated if it has frames. */
function Prop({ strip, u, style, speed = 0.5 }: { strip: Strip; u: number; style?: CSSProperties; speed?: number }) {
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

export default function HeroScene({ look, activity, region, ground, scale, zoom = 1.15, aura, celebrate }: Props) {
  const u = scale * zoom; // CSS px per sprite pixel
  const size = Math.round(32 * u);
  const base = ground - 4 * scale; // bottom of the hero's 32px box
  const feet = base + u; // where feet (and props) meet the ground

  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence mode="wait">
        <motion.div key={activity} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          {activity === 'watch' && (
            <div className="absolute" style={at(0, 32, u, base)}>
              <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} />
            </div>
          )}

          {activity === 'camp' && (
            <>
              <Prop strip={tent()} u={u} style={at(-30, 30, u, feet + 3 * u)} />
              <FireGlow x={18} u={u} bottom={feet} />
              <Prop strip={campfire()} u={u} style={at(18, 14, u, feet)} speed={0.16} />
              <div className="absolute" style={at(-2, 32, u, base)}>
                <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose="sit" />
              </div>
            </>
          )}

          {activity === 'sleep' && (
            <>
              <Prop strip={tent()} u={u} style={at(-34, 30, u, feet + 3 * u)} />
              <FireGlow x={24} u={u} bottom={feet} dim />
              <Prop strip={embers()} u={u} style={at(24, 14, u, feet)} speed={1.2} />
              <Prop strip={bedroll()} u={u} style={at(0, 26, u, feet)} />
              <div className="absolute" style={{ ...at(1, 32, u, feet + 3 * u - 9 * u), transform: 'rotate(-90deg)' }}>
                <HeroSprite look={look} size={size} pose="sleep" shadow={false} celebrate={celebrate} />
              </div>
              <Zzz u={u} style={at(-9, 0, u, feet + 9 * u)} />
            </>
          )}

          {activity === 'fish' && <Fishing look={look} region={region} u={u} size={size} base={base} feet={feet} aura={aura} celebrate={celebrate} />}

          {activity === 'wander' && <Wander look={look} u={u} size={size} base={base} aura={aura} celebrate={celebrate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FireGlow({ x, u, bottom, dim = false }: { x: number; u: number; bottom: number; dim?: boolean }) {
  const w = (dim ? 34 : 60) * u;
  return (
    <div
      className="flame absolute rounded-full mix-blend-screen"
      style={{
        left: `calc(50% + ${x * u - w / 2}px)`,
        bottom: bottom - w * 0.3,
        width: w,
        height: w * 0.8,
        background: `radial-gradient(circle, rgba(240,140,50,${dim ? 0.22 : 0.4}), rgba(200,64,42,${dim ? 0.08 : 0.15}) 45%, transparent 70%)`,
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

function Fishing({ look, region, u, size, base, feet, aura, celebrate }: { look: SpriteLook; region: Region; u: number; size: number; base: number; feet: number; aura?: string; celebrate?: number | string }) {
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
function Wander({ look, u, size, base, aura, celebrate }: { look: SpriteLook; u: number; size: number; base: number; aura?: string; celebrate?: number | string }) {
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
      </motion.div>
    </div>
  );
}
