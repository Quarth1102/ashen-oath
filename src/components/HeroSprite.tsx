import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { heroSheet, type SpriteLook } from '../art/sprite';
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
}

export default function HeroSprite({ look, size = 128, aura, idle = true, celebrate, shadow = true, className = '' }: Props) {
  const sheet = useMemo(() => heroSheet(look), [look]);
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
          style={{ width: size * 0.42, height: size * 0.07, bottom: size * 0.02 }}
        />
      )}
      <motion.div
        key={celebrate}
        initial={celebrate !== undefined ? { y: 0 } : false}
        animate={celebrate !== undefined ? { y: [0, -size * 0.22, 0, -size * 0.08, 0] } : undefined}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`pixelated absolute inset-0 ${idle ? 'sprite-idle' : ''}`}
        style={{ backgroundImage: `url(${sheet})`, backgroundSize: '200% 100%', backgroundRepeat: 'no-repeat' }}
      />
    </div>
  );
}
