import { motion } from 'framer-motion';
import type { StatDef, Progress } from '../game/types';
import { Icon } from './Icon';

export default function Radar({ defs, stats, size = 240 }: { defs: StatDef[]; stats: Record<string, Progress>; size?: number }) {
  const n = defs.length;
  if (n < 3) return null;
  const c = size / 2;
  const R = c - 30;
  const max = Math.max(3, Math.max(...defs.map((d) => stats[d.id]?.level ?? 1)) * 1.2);
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r] as const;
  };
  const poly = defs.map((d, i) => pt(i, (R * (stats[d.id]?.level ?? 1)) / max).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[260px]" role="img" aria-label="Stat radar">
      <defs>
        <radialGradient id="radar-fill">
          <stop offset="0%" stopColor="#f5c96a" stopOpacity=".55" />
          <stop offset="100%" stopColor="#a3202d" stopOpacity=".25" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={defs.map((_, i) => pt(i, R * k).join(',')).join(' ')} fill="none" stroke="#352d3c" strokeWidth={1} />
      ))}
      {defs.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#352d3c" />;
      })}
      <motion.polygon
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        style={{ transformOrigin: `${c}px ${c}px` }}
        points={poly}
        fill="url(#radar-fill)"
        stroke="#e0a33a"
        strokeWidth={1.5}
      />
      {defs.map((d, i) => {
        const [x, y] = pt(i, R + 16);
        return (
          <g key={d.id} transform={`translate(${x - 8}, ${y - 8})`} style={{ color: d.color }}>
            <Icon name={d.icon} size={16} />
          </g>
        );
      })}
    </svg>
  );
}
