import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Gift, Lock } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useHeroLook } from '../hooks';
import HeroSprite from '../components/HeroSprite';
import { PageHeader, Segmented } from '../components/ui';
import { GEAR, RARITY_COLOR, SLOT_NAME } from '../data/gear';
import type { Slot } from '../game/types';
import { rgba } from '../art/color';

type Filter = Slot | 'all';
const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

export default function Market() {
  const hero = useGame((s) => s.hero)!;
  const chests = useGame((s) => s.pendingChests);
  const defs = useGame((s) => s.statDefs);
  const { buy, equip, openChest } = useGame.getState();
  const look = useHeroLook()!;
  const [filter, setFilter] = useState<Filter>('all');
  const [confirm, setConfirm] = useState<string | null>(null);

  const items = GEAR.filter((i) => !i.starter && (filter === 'all' || i.slot === filter)).sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.price - b.price,
  );

  return (
    <div>
      <PageHeader
        title="The Ashen Market"
        subtitle="A hooded merchant. A cart of curious wares."
        right={<span className="flex items-center gap-1.5 rounded-full bg-ember-dark/30 px-3 py-1.5 font-pixel text-ember-light ring-1 ring-ember/30"><Coins size={15} /> {hero.gold}</span>}
      />

      <AnimatePresence>
        {chests > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            onClick={openChest}
            className="panel mb-4 flex w-full items-center gap-4 p-4 text-left"
            style={{ borderColor: rgba('#e0a33a', 0.6) }}
            data-testid="open-chest"
          >
            <motion.span animate={{ rotate: [0, -10, 10, -6, 0], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0.8 }}>
              <Gift size={34} className="text-ember-light drop-shadow-[0_0_10px_rgba(224,163,58,.7)]" />
            </motion.span>
            <span className="flex-1">
              <span className="block font-display font-bold text-ember-light">{chests} loot chest{chests > 1 ? 's' : ''} await</span>
              <span className="text-xs text-bone-faint">Tap to open. They may hold gear of any rarity.</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mb-4">
        <Segmented
          layoutId="market-filter"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, ...(['helm', 'armor', 'cloak', 'weapon'] as Slot[]).map((s) => ({ value: s, label: SLOT_NAME[s] }))]}
        />
      </div>

      <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {items.map((it) => {
            const owned = hero.inventory.includes(it.id);
            const worn = hero.equipped[it.slot] === it.id;
            const locked = hero.level < it.minLevel;
            const poor = hero.gold < it.price;
            const color = RARITY_COLOR[it.rarity];
            return (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="panel flex flex-col overflow-hidden"
                style={{ borderColor: rgba(color, 0.35) }}
                data-testid={`item-${it.id}`}
              >
                <div className="relative grid place-items-center py-2" style={{ background: `radial-gradient(circle at 50% 60%, ${rgba(color, 0.18)}, transparent 70%)` }}>
                  <HeroSprite look={{ ...look, equipped: { ...look.equipped, [it.slot]: it.id } }} size={96} idle={false} />
                  <span className="absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ color, background: rgba(color, 0.12) }}>{it.rarity}</span>
                  {locked && (
                    <span className="absolute inset-0 grid place-items-center bg-black/55 text-xs text-bone-dim">
                      <span className="flex items-center gap-1"><Lock size={13} /> Level {it.minLevel}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3 pt-1">
                  <p className="text-sm font-bold leading-tight" style={{ color }}>{it.name}</p>
                  <p className="text-[11px] text-bone-faint">{SLOT_NAME[it.slot]}{it.bonus ? ` · +${it.bonus.pct}% ${defs.find((d) => d.id === it.bonus!.stat)?.name ?? it.bonus.stat}` : ''}</p>
                  <p className="line-clamp-2 text-[11px] italic text-bone-faint/80">{it.desc}</p>
                  <div className="mt-auto pt-2">
                    {owned ? (
                      <button className={`w-full ${worn ? 'btn-ghost' : 'btn-primary'} py-2 text-xs`} disabled={worn} onClick={() => equip(it.id)}>
                        {worn ? 'Equipped' : 'Equip'}
                      </button>
                    ) : confirm === it.id ? (
                      <button className="btn-primary w-full py-2 text-xs" onClick={() => { buy(it.id); setConfirm(null); }} onBlur={() => setConfirm(null)} autoFocus>
                        Confirm {it.price}g
                      </button>
                    ) : (
                      <button className="btn-ghost w-full py-2 text-xs" disabled={locked || poor} onClick={() => setConfirm(it.id)}>
                        <Coins size={12} className="text-ember-light" /> {it.price}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
