import { AnimatePresence, motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useNow } from '../hooks';
import { COMBO_WINDOW_MS, comboBonus } from '../game/engine';

/** Slim "COMBO ×3" row inside the HUD, with a bar that drains until the combo window closes. */
export default function ComboMeter() {
  const combo = useGame((s) => s.combo);
  const now = useNow(1000).getTime();
  const left = combo ? COMBO_WINDOW_MS - (now - combo.lastTs) : 0;
  const show = !!combo && combo.count >= 2 && left > 0;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="combo"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          data-testid="combo-meter"
        >
          <div className="flex items-center gap-2 pt-1">
            <Flame size={13} className="flame shrink-0 text-ember-light" />
            <motion.span key={combo!.count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="font-pixel text-sm text-ember-light">
              COMBO ×{combo!.count}
            </motion.span>
            <span className="text-[10px] text-bone-dim">+{Math.round(comboBonus(combo!.count) * 100)}% XP</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/50">
              <div className="h-full rounded-full bg-gradient-to-r from-ember to-ember-light transition-[width] duration-1000 ease-linear" style={{ width: `${(left / COMBO_WINDOW_MS) * 100}%` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
