import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Gift, HeartCrack, Skull, Sparkles, Trophy } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { GameEvent } from '../game/types';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { REGION_BY_ID } from '../data/regions';
import { GEAR_BY_ID, RARITY_COLOR, SLOT_NAME } from '../data/gear';
import { CLASS_BY_ID } from '../data/classes';
import HeroSprite from './HeroSprite';
import Landscape from './Landscape';
import { Icon } from './Icon';
import { rgba } from '../art/color';

const MODAL_TYPES = ['fall', 'dayreport', 'levelup', 'region', 'goal', 'loot'] as const;
type ModalEvent = Extract<GameEvent, { type: (typeof MODAL_TYPES)[number] }>;
const TOAST_TYPES = ['achievement', 'statup', 'chest', 'damage'] as const;

export default function EventLayer() {
  const events = useGame((s) => s.events);
  const dismiss = useGame((s) => s.dismissEvent);

  // reward events are rendered inline by the cards; drop them right away
  useEffect(() => {
    events.filter((e) => e.type === 'reward').forEach((e) => dismiss(e.id));
    // a fall makes the damage toasts that caused it redundant
    if (events.some((e) => e.type === 'fall')) events.filter((e) => e.type === 'damage').forEach((e) => dismiss(e.id));
  }, [events, dismiss]);

  const modal = useMemo(() => {
    for (const t of MODAL_TYPES) {
      const e = events.find((x) => x.type === t);
      if (e) return e as ModalEvent;
    }
    return null;
  }, [events]);

  const toasts = events.filter((e) => (TOAST_TYPES as readonly string[]).includes(e.type)).slice(0, 3);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(.75rem+var(--safe-top))] z-[70] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((e) => (
            <Toast key={e.id} event={e} onDone={() => dismiss(e.id)} />
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">{modal && <Modal key={modal.id} event={modal} onClose={() => dismiss(modal.id)} />}</AnimatePresence>
    </>
  );
}

function Toast({ event, onDone }: { event: GameEvent; onDone: () => void }) {
  const defs = useGame((s) => s.statDefs);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 3200);
    return () => clearTimeout(t);
  }, []);
  let icon: React.ReactNode = null;
  let title = '';
  let body = '';
  let color = '#e0a33a';
  if (event.type === 'achievement') {
    const a = ACHIEVEMENT_BY_ID[event.achievementId];
    icon = <Trophy size={18} />;
    title = `Achievement: ${a?.name}`;
    body = `${a?.desc} +${a?.gold} gold${a?.title ? `, title “${a.title}”` : ''}`;
  } else if (event.type === 'statup') {
    const d = defs.find((x) => x.id === event.statId);
    color = d?.color ?? color;
    icon = <Icon name={d?.icon ?? 'star'} size={18} />;
    title = `${d?.name ?? 'Stat'} rose to ${event.level}`;
    body = 'Your training bears fruit.';
  } else if (event.type === 'chest') {
    icon = <Gift size={18} />;
    title = 'A loot chest dropped!';
    body = 'Open it in the Market.';
  } else if (event.type === 'damage') {
    color = '#ff5a64';
    icon = <HeartCrack size={18} />;
    title = `−${event.hp} HP`;
    body = event.source;
  }
  return (
    <motion.button
      layout
      type="button"
      onClick={onDone}
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="panel pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 text-left"
      style={{ borderColor: rgba(color, 0.5) }}
      data-testid={`toast-${event.type}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: rgba(color, 0.15), color }}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-bold" style={{ color }}>{title}</span>
        <span className="block truncate text-xs text-bone-faint">{body}</span>
      </span>
    </motion.button>
  );
}

function Rays({ color }: { color: string }) {
  return (
    <div
      className="rays pointer-events-none absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
      style={{ background: `repeating-conic-gradient(from 0deg, ${rgba(color, 0.35)} 0deg 6deg, transparent 6deg 18deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 45%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 45%)' }}
    />
  );
}

function Modal({ event, onClose }: { event: ModalEvent; onClose: () => void }) {
  const hero = useGame((s) => s.hero);
  const equip = useGame((s) => s.equip);
  const updateSettings = useGame((s) => s.updateSettings);
  if (!hero) return null;
  const look = { appearance: hero.appearance, equipped: hero.equipped };
  const aura = CLASS_BY_ID[hero.classId]?.aura;

  let content: React.ReactNode = null;
  let tone = '#e0a33a';

  switch (event.type) {
    case 'levelup':
      content = (
        <>
          <Rays color={tone} />
          <HeroSprite look={look} size={160} aura={aura} celebrate={event.id} />
          <motion.p initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }} className="h-display mt-2 text-4xl font-black text-ember-light drop-shadow-[0_0_18px_rgba(224,163,58,.6)]">
            Level {event.level}
          </motion.p>
          <p className="mt-2 text-sm text-bone-dim">Your vitality swells. Max HP is now <b className="text-bone">{event.maxHp}</b> and fully restored.</p>
          <button className="btn-primary mt-6 w-full" onClick={onClose} autoFocus>Onward</button>
        </>
      );
      break;
    case 'region': {
      const r = REGION_BY_ID[event.regionId];
      tone = r.accent;
      content = (
        <>
          <p className="label">New land discovered</p>
          <h2 className="h-display mt-1 text-3xl font-black" style={{ color: r.accent }}>{r.name}</h2>
          <div className="mt-4 w-full overflow-hidden rounded-xl ring-1 ring-white/10">
            <Landscape region={r} className="h-44 w-full" interactive={false}>
              {(g, sc) => <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: g - 4 * sc }}><HeroSprite look={look} size={Math.round(32 * sc)} aura={aura} /></div>}
            </Landscape>
          </div>
          <p className="mt-4 text-sm italic text-bone-dim">{r.lore}</p>
          <button className="btn-primary mt-6 w-full" onClick={() => { updateSettings({ regionId: null }); onClose(); }} autoFocus>Travel there</button>
        </>
      );
      break;
    }
    case 'fall':
      tone = '#d13a48';
      content = (
        <>
          <motion.div initial={{ scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
            <Skull size={64} className="text-blood-light drop-shadow-[0_0_24px_rgba(209,58,72,.7)]" />
          </motion.div>
          <h2 className="h-display mt-4 text-3xl font-black text-blood-light">You have fallen</h2>
          <p className="mt-3 text-sm text-bone-dim">The darkness took its toll. You lost <b className="text-bone">{event.goldLost} gold</b> and <b className="text-bone">{event.xpLost} XP</b> from this level. Your level and stats are untouched.</p>
          <p className="mt-2 text-sm italic text-bone-faint">From ash, you rise again.</p>
          <button className="btn-danger mt-6 w-full" onClick={onClose} autoFocus>Rise again</button>
        </>
      );
      break;
    case 'dayreport':
      tone = '#d13a48';
      content = (
        <>
          <HeartCrack size={48} className="text-blood-light" />
          <h2 className="h-display mt-3 text-2xl font-bold">While you were away…</h2>
          <p className="mt-2 text-sm text-bone-dim">
            {event.days > 1 ? `${event.days} days passed. ` : ''}Neglected deeds cost you <b className="text-blood-light">{event.damage} HP</b>.
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
            {event.missed.map((m) => <li key={m} className="rounded-full bg-blood-dark/50 px-2.5 py-1 text-xs text-bone-dim">{m}</li>)}
          </ul>
          <button className="btn-ghost mt-6 w-full" onClick={onClose} autoFocus>I will do better</button>
        </>
      );
      break;
    case 'goal':
      content = (
        <>
          <Rays color={tone} />
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><Sparkles size={48} className="text-ember-light" /></motion.div>
          <h2 className="h-display mt-3 text-3xl font-black text-ember-light">Quest complete</h2>
          {event.title && <p className="mt-2 text-sm text-bone-dim">You have earned the title <b className="text-ember-light">“{event.title}”</b>. Wear it on the Hero page.</p>}
          <HeroSprite look={look} size={128} aura={aura} celebrate={event.id} className="mt-4" />
          <button className="btn-primary mt-6 w-full" onClick={onClose} autoFocus>Glory</button>
        </>
      );
      break;
    case 'loot': {
      const item = event.itemId ? GEAR_BY_ID[event.itemId] : undefined;
      tone = RARITY_COLOR[event.rarity];
      content = (
        <>
          <Rays color={tone} />
          <motion.div initial={{ rotate: 0 }} animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1, 1, 1, 1.3, 0] }} transition={{ duration: 0.9 }} className="absolute">
            <Gift size={72} style={{ color: tone }} />
          </motion.div>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.85, type: 'spring', stiffness: 220, damping: 14 }} className="flex flex-col items-center">
            <p className="label" style={{ color: tone }}>{event.rarity}</p>
            {item ? (
              <>
                <HeroSprite look={{ ...look, equipped: { ...look.equipped, [item.slot]: item.id } }} size={128} aura={tone} />
                <h2 className="h-display text-2xl font-black" style={{ color: tone }}>{item.name}</h2>
                <p className="text-xs text-bone-faint">{SLOT_NAME[item.slot]}{item.bonus ? ` · +${item.bonus.pct}% ${item.bonus.stat} XP` : ''}</p>
                <p className="mt-2 text-sm italic text-bone-dim">{item.desc}</p>
              </>
            ) : (
              <>
                <Coins size={64} className="my-6 text-ember-light" />
                <h2 className="h-display text-2xl font-black text-ember-light">{event.gold} gold</h2>
              </>
            )}
          </motion.div>
          <div className="mt-6 flex w-full gap-2">
            {item && <button className="btn-primary flex-1" onClick={() => { equip(item.id); onClose(); }}>Equip</button>}
            <button className="btn-ghost flex-1" onClick={onClose} autoFocus>{item ? 'Keep' : 'Take it'}</button>
          </div>
        </>
      );
      break;
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid={`modal-${event.type}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={event.type === 'fall' || event.type === 'dayreport' ? { background: 'radial-gradient(circle, rgba(60,5,12,.85), rgba(0,0,0,.95))' } : undefined} />
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="panel relative flex w-full max-w-sm flex-col items-center overflow-hidden px-6 py-8 text-center"
        style={{ borderColor: rgba(tone, 0.5) }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
