import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { POSE_FRAMES, heroSheet, type Pose, type SpriteLook } from '../art/sprite';
import { rgba } from '../art/color';

interface Props {
  look: SpriteLook;
  /** rendered size in CSS px (multiples of 32 look crispest) */
  size?: number;
  aura?: string;
  idle?: boolean;
  /** change this value to make the hero leap */
  celebrate?: number | string;
  shadow?: boolean;
  className?: string;
  pose?: Pose;
  /** mirror horizontally (face left) */
  flip?: boolean;
}

const POSE_SPEED: Record<Pose, number> = { idle: 1.3, walk: 0.6, sit: 2.2, fish: 2.6, sleep: 3.2 };

export default function HeroSprite({ look, size = 128, aura, idle = true, celebrate, shadow = true, className = '', pose = 'idle', flip = false }: Props) {
  const sheet = useMemo(() => heroSheet(look, pose), [look, pose]);
  const frames = POSE_FRAMES[pose];
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {aura && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full blur-xl"
          style={{ width: size * 0.8, height: size * 0.5, bottom: size * 0.02, background: rgba(aura, 0.28) }}
        />
      )}
      {shadow && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/60"
          style={{ width: size * (pose === 'sit' || pose === 'fish' ? 0.62 : 0.42), height: size * 0.07, bottom: size * 0.02 }}
        />
      )}
      {celebrate !== undefined && <Sparks key={`s-${celebrate}`} size={size} color={aura ?? '#f5c96a'} />}
      <motion.div
        key={celebrate}
        initial={celebrate !== undefined ? { y: 0 } : false}
        animate={celebrate !== undefined ? { y: [0, -size * 0.22, 0, -size * 0.08, 0] } : undefined}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <div
          className={`pixelated absolute inset-0 ${idle ? 'sprite-anim' : ''}`}
          style={{
            backgroundImage: `url(${sheet})`,
            backgroundSize: `${frames * 100}% 100%`,
            backgroundRepeat: 'no-repeat',
            transform: flip ? 'scaleX(-1)' : undefined,
            animation: idle ? `sprite-${frames} ${POSE_SPEED[pose]}s steps(${frames}) infinite` : undefined,
          }}
        />
      </motion.div>
    </div>
  );
}

/** A ring of pixel sparks bursting from the hero when they celebrate. */
function Sparks({ size, color }: { size: number; color: string }) {
  const n = 12;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 2) * 0.2;
        const r = size * (0.45 + (i % 3) * 0.08);
        const px = Math.max(2, Math.round(size / 28));
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: '50%', top: '45%', width: px, height: px, background: i % 3 === 0 ? '#fff0a0' : i % 3 === 1 ? '#f5c96a' : color, boxShadow: `0 0 ${px * 2}px ${color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r - size * 0.08, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.75, ease: 'easeOut', delay: (i % 4) * 0.02 }}
          />
        );
      })}
    </div>
  );
}
