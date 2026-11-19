import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Gift, HeartCrack, Skull, Sparkles, Trophy } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { GameEvent } from '../game/types';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { REGION_BY_ID } from '../data/regions';
import { GEAR_BY_ID, RARITY_COLOR, SLOT_NAME } from '../data/gear';
import { useHeroClass } from '../hooks';
import { buzz, playChime, playLevelUp, playPerfectDay } from '../audio/sound';
import WeeklyRecapView from './WeeklyRecap';
import { rankSet } from '../game/wardrobe';
import { resolveClass, CLASS_BONUS } from '../game/classes';
import HeroSprite from './HeroSprite';
import Landscape from './Landscape';
import { Icon } from './Icon';
import { rgba } from '../art/color';

const MODAL_TYPES = ['fall', 'dayreport', 'levelup', 'classchange', 'wardrobe', 'perfectday', 'region', 'goal', 'loot', 'weeklyrecap'] as const;
type ModalEvent = Extract<GameEvent, { type: (typeof MODAL_TYPES)[number] }>;
const TOAST_TYPES = ['achievement', 'statup', 'chest', 'damage', 'questline'] as const;

export default function EventLayer() {
  const events = useGame((s) => s.events);
  const dismiss = useGame((s) => s.dismissEvent);

  // sound effects and haptics, once per event
  const played = useRef(new Set<string>());
  useEffect(() => {
    const { settings, combo } = useGame.getState();
    const sfx = settings.sound !== false;
    const haptic = settings.haptics !== false;
    const fresh = events.filter((e) => !played.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => played.current.add(e.id));
    const has = (t: GameEvent['type']) => fresh.some((e) => e.type === t);
    const deed = fresh.some((e) => e.type === 'reward' && e.source !== 'Perfect Day');
    const step = combo && Date.now() - combo.lastTs < 2000 ? combo.count - 1 : 0;
    if (deed) {
      if (sfx) playChime(step);
      if (haptic) buzz(step >= 2 ? [12, 40, 12] : 14);
    }
    if (has('levelup')) {
      if (sfx) setTimeout(playLevelUp, deed ? 350 : 0);
      if (haptic) setTimeout(() => buzz([30, 60, 30, 60, 90]), 350);
    }
    if (has('questline')) {
      if (sfx) setTimeout(playPerfectDay, 350);
      if (haptic) setTimeout(() => buzz([20, 50, 20, 50, 100]), 350);
    }
    if (has('perfectday')) {
      if (sfx) setTimeout(playPerfectDay, 500);
      if (haptic) setTimeout(() => buzz([20, 50, 20, 50, 20, 50, 140]), 500);
    }
    if (has('damage') && haptic) buzz([60, 40, 60]);
  }, [events]);

  // reward and combo events are rendered inline by the cards and the combo meter; drop them right away
  useEffect(() => {
    events.filter((e) => e.type === 'reward' || e.type === 'combo').forEach((e) => dismiss(e.id));
    // a fall makes the damage toasts that caused it redundant
    if (events.some((e) => e.type === 'fall')) events.filter((e) => e.type === 'damage').forEach((e) => dismiss(e.id));
  }, [events, dismiss]);

  // the big moments queued right now, in display order: shown one after another in one overlay
  const chain = useMemo(() => {
    const out: ModalEvent[] = [];
    for (const t of MODAL_TYPES) for (const e of events) if (e.type === t) out.push(e as ModalEvent);
    return out;
  }, [events]);
  const total = useRef(0);
  if (!chain.length) total.current = 0;
  else total.current = Math.max(total.current, chain.length);
  const current = chain[0] ?? null;
  const step = total.current - chain.length;

  // small notices become one ticker line per action (everything one tap caused, merged)
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const ticked = useRef(new Set<string>());
  const defs = useGame((s) => s.statDefs);
  useEffect(() => {
    const fresh = events.filter((e) => (TOAST_TYPES as readonly string[]).includes(e.type) && !ticked.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => ticked.current.add(e.id));
    setTicker((q) => [...q, { id: fresh[0].id, parts: fresh.map((e) => tickerPart(e, defs)) }]);
    fresh.forEach((e) => dismiss(e.id));
  }, [events, dismiss, defs]);

  return (
    <>
      <Ticker items={ticker} onNext={() => setTicker((q) => q.slice(1))} hold={!!current} />
      <AnimatePresence>
        {current && (
          <motion.div key="overlay" className="fixed inset-0 z-[80] grid place-items-center overflow-hidden p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-[background] duration-500"
              style={current.type === 'fall' || current.type === 'dayreport' ? { background: 'radial-gradient(circle, rgba(60,5,12,.85), rgba(0,0,0,.95))' } : undefined}
            />
            <div className="relative flex w-full max-w-sm flex-col items-center">
              {total.current > 1 && (
                <div className="mb-3 flex gap-1.5" aria-label={`Step ${step + 1} of ${total.current}`} data-testid="chain-dots">
                  {Array.from({ length: total.current }, (_, i) => (
                    <motion.span key={i} animate={{ width: i === step ? 22 : 7, opacity: i <= step ? 1 : 0.35 }} className="h-1.5 rounded-full bg-ember-light" />
                  ))}
                </div>
              )}
              <AnimatePresence mode="wait">
                <Modal key={current.id} event={current} last={chain.length === 1} onClose={() => dismiss(current.id)} />
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface TickerPart {
  icon: React.ReactNode;
  color: string;
  text: string;
}
interface TickerItem {
  id: string;
  parts: TickerPart[];
}

function tickerPart(event: GameEvent, defs: { id: string; name: string; icon: string; color: string }[]): TickerPart {
  switch (event.type) {
    case 'achievement': {
      const a = ACHIEVEMENT_BY_ID[event.achievementId];
      return { icon: <Trophy size={14} />, color: '#f5c96a', text: `${a?.name ?? 'Achievement'} +${a?.gold ?? 0}g${a?.title ? `, “${a.title}”` : ''}` };
    }
    case 'statup': {
      const d = defs.find((x) => x.id === event.statId);
      return { icon: <Icon name={d?.icon ?? 'star'} size={14} />, color: d?.color ?? '#e0a33a', text: `${d?.name ?? 'Stat'} rose to ${event.level}` };
    }
    case 'chest':
      return { icon: <Gift size={14} />, color: '#e0a33a', text: 'Loot chest found' };
    case 'questline':
      return { icon: <Gift size={14} />, color: '#f5c96a', text: 'Quest line complete: chest earned' };
    case 'damage':
      return { icon: <HeartCrack size={14} />, color: '#ff5a64', text: `−${event.hp} HP` };
    default:
      return { icon: null, color: '#b5ab9b', text: '' };
  }
}

/** One compact line at a time, cycling through what just happened. Tap to skip. Pauses behind big moments. */
function Ticker({ items, onNext, hold }: { items: TickerItem[]; onNext: () => void; hold: boolean }) {
  const item = items[0];
  const next = useRef(onNext);
  next.current = onNext;
  useEffect(() => {
    if (!item || hold) return;
    const t = setTimeout(() => next.current(), items.length > 2 ? 1800 : 2800);
    return () => clearTimeout(t);
  }, [item, hold, items.length]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(.6rem+var(--safe-top))] z-[70] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {item && !hold && (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => next.current()}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-ember/40 bg-ash-900/95 px-3.5 py-1.5 shadow-glow backdrop-blur-md"
            data-testid="ticker"
          >
            {item.parts.map((p, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1 text-xs font-semibold" style={{ color: p.color }}>
                {i > 0 && <span className="text-bone-faint">·</span>}
                <span className="shrink-0">{p.icon}</span>
                <span className="truncate">{p.text}</span>
              </span>
            ))}
            {items.length > 1 && <span className="ml-1 shrink-0 font-pixel text-[10px] text-bone-faint">+{items.length - 1}</span>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
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

function Modal({ event, onClose, last }: { event: ModalEvent; onClose: () => void; last: boolean }) {
  const cont = last ? 'Onward' : 'Continue ›';
  const hero = useGame((s) => s.hero);
  const equip = useGame((s) => s.equip);
  const equipRankSet = useGame((s) => s.equipRankSet);
  const updateSettings = useGame((s) => s.updateSettings);
  const defs = useGame((s) => s.statDefs);
  const cls = useHeroClass();
  if (!hero) return null;
  const look = { appearance: hero.appearance, equipped: hero.equipped };
  const aura = cls.aura;

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
          <button className="btn-primary mt-6 w-full" onClick={onClose} autoFocus>{cont}</button>
        </>
      );
      break;
    case 'perfectday':
      content = (
        <>
          <Rays color={tone} />
          <motion.div
            initial={{ scale: 3, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
            className="relative grid h-28 w-28 place-items-center rounded-full border-4 border-ember-light bg-gradient-to-b from-ember to-ember-dark shadow-[0_0_40px_rgba(224,163,58,.7)]"
          >
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-ember-light/60" />
            <Sparkles size={44} className="text-void" />
          </motion.div>
          <h2 className="h-display mt-5 text-3xl font-black text-ember-light">Perfect Day</h2>
          <p className="mt-2 text-sm text-bone-dim">Every deed kept. The fire roars in your honour.</p>
          <p className="mt-1 text-sm font-semibold text-ember-light">+{event.xp} XP, spread across all your stats</p>
          <HeroSprite look={look} size={112} aura={aura} celebrate={event.id} className="mt-3" />
          <button className="btn-primary mt-5 w-full" onClick={onClose} autoFocus>{cont}</button>
        </>
      );
      break;
    case 'weeklyrecap':
      content = <WeeklyRecapView week={event.week} onClose={onClose} />;
      break;
    case 'classchange': {
      const from = resolveClass(event.from, defs);
      const to = resolveClass(event.to, defs);
      tone = to.aura;
      const statNames = to.stats.map((id) => defs.find((d) => d.id === id)?.name).filter(Boolean);
      const pct = to.kind === 'pure' ? CLASS_BONUS.pure : to.kind === 'hybrid' ? CLASS_BONUS.hybrid : CLASS_BONUS.paragon;
      const set = rankSet(hero, defs);
      const equipKit = () => { equipRankSet(); onClose(); };
      content = (
        <>
          <Rays color={tone} />
          <p className="label">{from.kind === 'wanderer' ? 'Your path is revealed' : `No longer a ${from.name}`}</p>
          <HeroSprite
            look={event.kit.length ? { ...look, equipped: set } : look}
            size={144}
            aura={to.aura}
            celebrate={event.id}
            className="mt-2"
          />
          <motion.h2 initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }} className="h-display text-3xl font-black" style={{ color: to.aura }}>
            {to.name}
          </motion.h2>
          <p className="text-xs" style={{ color: to.aura }}>{to.epithet}</p>
          <p className="mt-3 text-sm text-bone-dim">{to.desc}</p>
          <p className="mt-2 text-xs text-bone-faint">
            Earned through {statNames.length > 2 ? 'balance in all things' : statNames.join(' and ')}. +{pct}% XP to {to.kind === 'paragon' ? 'every stat' : statNames.join(' and ')}.
          </p>
          {event.kit.length > 0 && <p className="mt-2 text-xs text-spectral">Your rank’s wardrobe is open: {event.kit.map((id) => GEAR_BY_ID[id].name).join(', ')}.</p>}
          {from.kind !== 'wanderer' && <p className="mt-1 text-[11px] text-bone-faint">{from.name} gear has been put away.</p>}
          <div className="mt-6 flex w-full gap-2">
            {event.kit.length > 0 && <button className="btn-primary flex-1" onClick={equipKit}>Wear rank equipment</button>}
            <button className={`${event.kit.length ? 'btn-ghost' : 'btn-primary'} flex-1`} onClick={onClose} autoFocus>{cont}</button>
          </div>
        </>
      );
      break;
    }
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
      tone = RARITY_COLOR[event.rarity];
      content = (
        <>
          <Rays color={tone} />
          <motion.div initial={{ rotate: 0 }} animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1, 1, 1, 1.3, 0] }} transition={{ duration: 0.9 }} className="absolute">
            <Gift size={72} style={{ color: tone }} />
          </motion.div>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.85, type: 'spring', stiffness: 220, damping: 14 }} className="flex flex-col items-center">
            <p className="label" style={{ color: tone }}>{event.rarity} chest</p>
            <Coins size={64} className="my-6 text-ember-light" />
            <h2 className="h-display text-2xl font-black text-ember-light">{event.gold} gold</h2>
            <p className="mt-1 text-xs text-bone-faint">Spend it on your camp.</p>
          </motion.div>
          <button className="btn-primary mt-6 w-full" onClick={onClose} autoFocus>Take it</button>
        </>
      );
      break;
    }
    case 'wardrobe': {
      const items = event.items.map((id) => GEAR_BY_ID[id]).filter(Boolean);
      const preview = { ...look, equipped: { ...look.equipped, ...Object.fromEntries(items.map((i) => [i.slot, i.id])) } };
      tone = RARITY_COLOR[items[0]?.rarity ?? 'rare'];
      content = (
        <>
          <Rays color={tone} />
          <p className="label">New equipment unlocked</p>
          <HeroSprite look={preview} size={144} aura={tone} celebrate={event.id} className="mt-2" />
          <ul className="mt-2 w-full space-y-1">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg bg-ash-900/60 px-3 py-2 text-sm">
                <span className="font-semibold" style={{ color: RARITY_COLOR[i.rarity] }}>{i.name}</span>
                <span className="text-xs text-bone-faint">{SLOT_NAME[i.slot]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex w-full gap-2">
            <button className="btn-primary flex-1" onClick={() => { items.forEach((i) => equip(i.id)); onClose(); }} autoFocus>Wear it</button>
            <button className="btn-ghost flex-1" onClick={onClose}>Later</button>
          </div>
        </>
      );
      break;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="panel relative flex max-h-[calc(100dvh-4.5rem)] w-full flex-col items-center overflow-y-auto overflow-x-hidden px-6 py-8 text-center"
      style={{ borderColor: rgba(tone, 0.5) }}
      data-testid={`modal-${event.type}`}
    >
      {content}
    </motion.div>
  );
}
