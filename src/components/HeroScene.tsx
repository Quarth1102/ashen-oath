import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HeroSprite from './HeroSprite';
import type { SpriteLook } from '../art/sprite';
import { banner, bedroll, sleeper, campfire, dock, embers, lanternPost, pet, pond, rack, tent, type Strip } from '../art/props';
import { DEFAULT_CAMP, FIRE_COLORS, tierOf, type CampState } from '../data/camp';
import type { Region } from '../data/regions';
import type { Activity } from '../game/activity';
import type { Chore } from '../game/chores';
import type { Pose } from '../art/sprite';
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
  /** what the hero is busy with at camp */
  chore?: Chore | null;
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

export default function HeroScene({ look, activity, region, ground, scale, zoom = 1.15, aura, celebrate, camp = DEFAULT_CAMP, perfect = false, combo = 0, chore = null }: Props) {
  const stoking = chore === 'tend';
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
          <FireGlow x={fireX} u={u} bottom={feet} color={flame[1]} big={perfect} boost={heat + (stoking ? 3 : 0)} />
          {stoking && <Stoked x={fireX} u={u} bottom={feet} color={flame[1]} />}
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
        <motion.div key={activity === 'watch' ? 'camp' : activity} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          {activity === 'away' && campsite(18, false)}

          {(activity === 'camp' || activity === 'watch') && (
            <>
              {campsite(18, true)}
              <CampLife chore={chore ?? 'warm'} look={look} u={u} size={size} base={base} feet={feet} aura={aura} celebrate={celebrate} petStrip={petStrip} />
            </>
          )}

          {activity === 'sleep' && (
            <>
              {campsite(40, false)}
              {petAt(58)}
              <Prop strip={bedroll()} u={u} style={at(6, 40, u, feet)} />
              <Prop strip={sleeper(look.appearance.skin, look.appearance.hairStyle, look.appearance.hairColor)} u={u} style={at(6, 40, u, feet + 2 * u)} speed={1.8} />
              <Zzz u={u} style={at(-9, 0, u, feet + 11 * u)} />
            </>
          )}

          {activity === 'fish' && <Fishing look={look} region={region} u={u} size={size} base={base} feet={feet} aura={aura} celebrate={celebrate} hasDock={tierOf(camp, 'dock') > 0} petEl={petAt(-30)} />}

          {activity === 'wander' && <Travel look={look} u={u} size={size} base={base} aura={aura} celebrate={celebrate} petStrip={petStrip} />}
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

/** On the road: the hero strides on the spot while the world scrolls past behind. */
function Travel({ look, u, size, base, aura, celebrate, petStrip }: { look: SpriteLook; u: number; size: number; base: number; aura?: string; celebrate?: number | string; petStrip?: Strip | null }) {
  return (
    <>
      {petStrip && (
        <motion.div
          className="absolute"
          style={at(-24, petStrip.w, u, base + u)}
          animate={{ x: [0, 3 * u, 0, -2 * u, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Prop strip={petStrip} u={u} speed={0.25} style={{ left: 0, bottom: 0 }} />
        </motion.div>
      )}
      <motion.div
        className="absolute"
        style={at(4, 32, u, base)}
        animate={{ x: [0, 4 * u, 0, -3 * u, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      >
        <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose="walk" />
      </motion.div>
    </>
  );
}

/** Where the hero sits (sprite px from centre) for each chore; the fire is at +18. */
const CHORE_SPOT: Record<Chore, number> = { warm: 2, clean: 0, cook: 2, read: -2, drink: 0, tend: 4, stand: -6, pet: -14 };

/** Life around the fire: the hero busies themselves with one chore after another. */
function CampLife({ chore, look, u, size, base, feet, aura, celebrate, petStrip }: { chore: Chore; look: SpriteLook; u: number; size: number; base: number; feet: number; aura?: string; celebrate?: number | string; petStrip?: Strip | null }) {
  const [glance, setGlance] = useState(false);
  useEffect(() => {
    if (chore !== 'stand') return setGlance(false);
    let t: ReturnType<typeof setTimeout>;
    const look = () => {
      t = setTimeout(() => {
        setGlance((g) => !g);
        look();
      }, 3500 + Math.random() * 5000);
    };
    look();
    return () => clearTimeout(t);
  }, [chore]);
  const x = CHORE_SPOT[chore];
  // the pet comes over to be fussed; otherwise it lies by the tent
  const petX = chore === 'pet' ? x - 16 + 28 : chore === 'stand' ? -28 : -24;
  return (
    <AnimatePresence mode="wait">
      <motion.div key={chore} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
        {petStrip && <Prop strip={petStrip} u={u} style={{ ...at(petX, petStrip.w, u, feet), transform: chore === 'pet' ? 'scaleX(-1)' : undefined }} speed={chore === 'pet' ? 0.35 : 0.9} />}
        <div className="absolute" style={at(x, 32, u, base)}>
          <HeroSprite look={look} size={size} aura={aura} celebrate={celebrate} pose={chore as Pose} flip={glance} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Sparks flung up while the fire is being stoked. */
function Stoked({ x, u, bottom, color }: { x: number; u: number; bottom: number; color: string }) {
  return (
    <div className="absolute" style={{ left: `calc(50% + ${x * u}px)`, bottom: bottom + 6 * u }}>
      {Array.from({ length: 7 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: Math.max(2, u * 0.8), height: Math.max(2, u * 0.8), background: i % 2 ? '#ffd27a' : color, boxShadow: `0 0 ${u * 2}px ${color}` }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: [0, (i % 3 - 1) * 4 * u + (i % 2 ? 2 : -2) * u], y: [0, -(12 + (i % 4) * 4) * u], opacity: [0, 1, 0] }}
          transition={{ duration: 1.3 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.27, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
