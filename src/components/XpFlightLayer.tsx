import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { XP_FLY, XP_LAND, type XpFlight } from '../fx';

interface Flight extends XpFlight {
  id: number;
  tx: number;
  ty: number;
}

let fid = 0;

/** Glowing orbs that arc from a completed deed to the XP bar. */
export default function XpFlightLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    const onFly = (e: Event) => {
      const d = (e as CustomEvent<XpFlight>).detail;
      const target = document.querySelector('[data-xp-target]')?.getBoundingClientRect();
      // aim for the XP bar; if it's scrolled away, fly up off the top
      const tx = target ? target.left + target.width * 0.5 : window.innerWidth / 2;
      const ty = target && target.bottom > 0 && target.top < window.innerHeight ? target.top + target.height / 2 : -20;
      const f: Flight = { ...d, id: fid++, tx, ty };
      setFlights((x) => [...x, f]);
      setTimeout(() => window.dispatchEvent(new CustomEvent(XP_LAND)), 750);
      setTimeout(() => setFlights((x) => x.filter((y) => y.id !== f.id)), 1400);
    };
    window.addEventListener(XP_FLY, onFly);
    return () => window.removeEventListener(XP_FLY, onFly);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[75]" aria-hidden>
      {flights.map((f) =>
        Array.from({ length: f.orbs }, (_, i) => {
          const dx = f.tx - f.x;
          const dy = f.ty - f.y;
          // each orb bows out sideways a little differently
          const bow = (i - (f.orbs - 1) / 2) * 18 + (Math.sin(f.id * 7 + i) * 20);
          const color = i === 0 ? f.color : i % 3 === 1 ? '#fff0a0' : '#f5c96a';
          const size = i === 0 ? 10 : 6 + (i % 3);
          return (
            <motion.span
              key={`${f.id}-${i}`}
              className="absolute rounded-full"
              style={{ left: f.x - size / 2, top: f.y - size / 2, width: size, height: size, background: color, boxShadow: `0 0 10px ${color}, 0 0 4px #fff` }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: [0, dx * 0.35 + bow, dx],
                y: [0, dy * 0.25 - 40 - Math.abs(bow) * 0.4, dy],
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1.2, 0.6],
              }}
              transition={{ duration: 0.75, delay: i * 0.045, ease: [0.5, 0, 0.75, 0.6], times: [0, 0.45, 1] }}
            />
          );
        }),
      )}
    </div>
  );
}
