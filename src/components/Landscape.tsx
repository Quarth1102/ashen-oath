import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { GROUND_Y, LH, LW, regionLayers } from '../art/landscape';
import type { ParticleKind, Region } from '../data/regions';
import { rgba } from '../art/color';

interface Props {
  region: Region;
  className?: string;
  /** rendered standing on the ground, centred */
  children?: (groundPx: number, scale: number) => ReactNode;
  interactive?: boolean;
}

function timeTint(hour: number): string {
  if (hour >= 21 || hour < 5) return 'rgba(8,12,40,.32)';
  if (hour < 8) return 'rgba(140,70,50,.14)';
  if (hour < 17) return 'rgba(200,190,170,.05)';
  return 'rgba(150,50,30,.16)';
}

function Layer({ src, x, scale }: { src: string; x: MotionValue<number>; scale: number }) {
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      className="pixelated pointer-events-none absolute bottom-0 left-1/2 max-w-none select-none"
      style={{ width: LW * scale, height: LH * scale, x, translateX: '-50%' }}
    />
  );
}

export default function Landscape({ region, className = '', children, interactive = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 360, h: 260 });
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.max(box.w / LW, box.h / LH) * 1.08;
  const groundPx = (LH - GROUND_Y) * scale;

  const raw = useMotionValue(0);
  const still = useMotionValue(0);
  const p = useSpring(raw, { stiffness: 40, damping: 18 });
  const farX = useTransform(p, (v) => v * 3 * scale);
  const midX = useTransform(p, (v) => v * 6 * scale);
  const nearX = useTransform(p, (v) => v * 9 * scale);

  useEffect(() => {
    if (!interactive || reduce) return;
    const onMove = (e: PointerEvent) => raw.set(-((e.clientX / window.innerWidth) * 2 - 1));
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) raw.set(-Math.max(-1, Math.min(1, e.gamma / 30)));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [interactive, reduce, raw]);

  const layers = useMemo(() => regionLayers(region), [region]);
  const tint = timeTint(new Date().getHours());

  return (
    <div ref={ref} className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} overflow-hidden bg-void ${className}`}>
      <AnimatePresence mode="sync">
        <motion.div
          key={region.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <Layer src={layers.sky} x={still} scale={scale} />
          <Layer src={layers.far} x={farX} scale={scale} />
          <Layer src={layers.mid} x={midX} scale={scale} />
          <Particles kind={region.particle} accent={region.accent} scale={scale} x={midX} reduce={!!reduce} />
          <Fog color={region.sky[1]} groundPx={groundPx} />
          <Layer src={layers.near} x={nearX} scale={scale} />
        </motion.div>
      </AnimatePresence>
      <motion.div className="absolute inset-0" style={{ x: nearX }}>
        {children?.(groundPx, scale)}
      </motion.div>
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ background: tint }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void/80 to-transparent" />
    </div>
  );
}

function Fog({ color, groundPx }: { color: string; groundPx: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 overflow-hidden" style={{ bottom: groundPx * 0.6, height: groundPx * 3 }}>
      <div
        className="fog-drift absolute inset-y-0 left-0 w-[200%] opacity-60"
        style={{
          background: `radial-gradient(ellipse 18% 60% at 10% 60%, ${rgba(color, 0.55)}, transparent 70%),
            radial-gradient(ellipse 22% 50% at 35% 70%, ${rgba(color, 0.45)}, transparent 70%),
            radial-gradient(ellipse 16% 55% at 60% 55%, ${rgba(color, 0.5)}, transparent 70%),
            radial-gradient(ellipse 22% 50% at 85% 70%, ${rgba(color, 0.45)}, transparent 70%)`,
        }}
      />
    </div>
  );
}

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; seed: number }

function Particles({ kind, accent, scale, x, reduce }: { kind: ParticleKind; accent: string; scale: number; x: MotionValue<number>; reduce: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const count = { embers: 40, fireflies: 26, mist: 10, ash: 60, snow: 90 }[kind];
    const spawn = (initial: boolean): P => {
      const r = Math.random;
      switch (kind) {
        case 'embers':
          return { x: r() * LW, y: initial ? r() * LH : LH + 2, vx: (r() - 0.5) * 0.1, vy: -(0.15 + r() * 0.35), life: 0, max: 200 + r() * 200, seed: r() * 10 };
        case 'fireflies':
          return { x: r() * LW, y: 40 + r() * 66, vx: (r() - 0.5) * 0.2, vy: (r() - 0.5) * 0.2, life: 0, max: 300 + r() * 300, seed: r() * 10 };
        case 'mist':
          return { x: initial ? r() * LW : -40, y: 70 + r() * 40, vx: 0.05 + r() * 0.08, vy: 0, life: 0, max: 4000, seed: r() * 10 };
        case 'ash':
          return { x: r() * LW, y: initial ? r() * LH : -2, vx: 0.05 + r() * 0.1, vy: 0.08 + r() * 0.15, life: 0, max: 2000, seed: r() * 10 };
        case 'snow':
        default:
          return { x: r() * LW, y: initial ? r() * LH : -2, vx: -0.1 - r() * 0.25, vy: 0.25 + r() * 0.4, life: 0, max: 2000, seed: r() * 10 };
      }
    };
    const ps = Array.from({ length: count }, () => spawn(true));
    let raf = 0;
    let t = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 33) return; // ~30fps is plenty for pixel particles
      last = now;
      t++;
      ctx.clearRect(0, 0, LW, LH);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.life++;
        p.x += p.vx + (kind === 'embers' || kind === 'ash' ? Math.sin((t + p.seed * 50) / 25) * 0.12 : 0);
        p.y += p.vy;
        if (kind === 'fireflies') {
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vy += (Math.random() - 0.5) * 0.04;
          p.vx = Math.max(-0.3, Math.min(0.3, p.vx));
          p.vy = Math.max(-0.3, Math.min(0.3, p.vy));
        }
        const k = p.life / p.max;
        if (p.life > p.max || p.y < -4 || p.y > LH + 4 || p.x < -50 || p.x > LW + 50) {
          ps[i] = spawn(false);
          continue;
        }
        const fade = Math.min(1, p.life / 30) * Math.min(1, (p.max - p.life) / 40);
        switch (kind) {
          case 'embers': {
            const flick = 0.6 + 0.4 * Math.sin(t / 3 + p.seed * 7);
            ctx.globalAlpha = fade * flick;
            ctx.fillStyle = k < 0.5 ? accent : '#c8402a';
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            break;
          }
          case 'fireflies': {
            const pulse = 0.5 + 0.5 * Math.sin(t / 10 + p.seed * 5);
            ctx.globalAlpha = fade * pulse * 0.25;
            ctx.fillStyle = accent;
            ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
            ctx.globalAlpha = fade * pulse;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            break;
          }
          case 'mist': {
            ctx.globalAlpha = 0.07 * fade;
            ctx.fillStyle = '#c8d6c8';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 30 + (p.seed % 3) * 8, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'ash': {
            ctx.globalAlpha = fade * 0.7;
            ctx.fillStyle = p.seed > 8 ? accent : '#8a8088';
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            break;
          }
          case 'snow': {
            ctx.globalAlpha = fade * (0.5 + (p.seed / 20));
            ctx.fillStyle = '#ece8de';
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.seed > 7 ? 2 : 1, 1);
            break;
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    if (reduce) {
      draw(1000);
      cancelAnimationFrame(raf);
    } else raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind, accent, reduce]);

  return (
    <motion.canvas
      ref={ref}
      width={LW}
      height={LH}
      className="pixelated pointer-events-none absolute bottom-0 left-1/2 max-w-none"
      style={{ width: LW * scale, height: LH * scale, x, translateX: '-50%' }}
    />
  );
}
