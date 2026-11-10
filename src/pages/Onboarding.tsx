import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dices } from 'lucide-react';
import { useGame } from '../store/useGame';
import { CLASSES, CLASS_BY_ID, randomBackstory, randomName } from '../data/classes';
import { DEFAULT_STATS } from '../data/stats';
import { REGIONS } from '../data/regions';
import { GEAR_BY_ID } from '../data/gear';
import type { Appearance, StatDef } from '../game/types';
import HeroSprite from '../components/HeroSprite';
import Landscape from '../components/Landscape';
import AppearanceEditor from '../components/AppearanceEditor';
import StatsEditor from '../components/StatsEditor';
import { Icon } from '../components/Icon';
import { rgba } from '../art/color';

const STEPS = ['Class', 'Visage', 'Legend', 'Pillars'];

export default function Onboarding() {
  const createHero = useGame((s) => s.createHero);
  const [step, setStep] = useState(-1);
  const [dir, setDir] = useState(1);
  const [classId, setClassId] = useState('knight');
  const [appearance, setAppearance] = useState<Appearance>(CLASS_BY_ID.knight.defaultLook);
  const [name, setName] = useState('');
  const [backstory, setBackstory] = useState('');
  const [defs, setDefs] = useState<StatDef[]>(() => DEFAULT_STATS.map((d) => ({ ...d })));
  const [starter, setStarter] = useState(true);
  const [jump, setJump] = useState(0);

  const cls = CLASS_BY_ID[classId];
  const look = useMemo(
    () => ({ appearance, equipped: Object.fromEntries(cls.starter.map((id) => [GEAR_BY_ID[id].slot, id])) }),
    [appearance, cls],
  );

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const pickClass = (id: string) => {
    setClassId(id);
    setAppearance(CLASS_BY_ID[id].defaultLook);
    setJump((j) => j + 1);
  };
  const finish = () =>
    createHero({ name, backstory, classId, appearance, statDefs: defs.filter((d) => d.name.trim()), starterQuests: starter });

  if (step === -1) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <Landscape region={REGIONS[0]} className="absolute inset-0">
          {(g, s) => (
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: g - 4 * s }}>
              <HeroSprite look={look} size={Math.round(32 * s * 0.9)} aura={cls.aura} />
            </div>
          )}
        </Landscape>
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-[18vh] text-center">
          <motion.p initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.3em' }} transition={{ duration: 1.6 }} className="label text-ember-light">
            A habit chronicle
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1 }} className="h-display mt-3 text-5xl font-black text-bone drop-shadow-[0_4px_20px_rgba(0,0,0,.9)]">
            Ashen Oath
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="mt-4 text-sm text-bone-dim drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            The world has gone grey. Every kept promise is a spark against the dark. Forge a hero, swear your oath, and grow stronger with every deed.
          </motion.p>
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="btn-primary mt-8 px-8 py-3 text-base" onClick={() => go(0)}>
            Forge your hero
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col md:py-8">
      <div className="relative">
        <Landscape region={REGIONS[0]} className="h-56 w-full md:h-64 md:rounded-2xl">
          {(g, s) => (
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: g - 4 * s }}>
              <HeroSprite look={look} size={Math.round(32 * s * 1.1)} aura={cls.aura} celebrate={jump} />
            </div>
          )}
        </Landscape>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <motion.span key={s} animate={{ width: i === step ? 28 : 8, background: i <= step ? '#e0a33a' : '#4a4052' }} className="h-2 rounded-full" />
            ))}
          </div>
          <span className="label text-bone-dim">{STEPS[step]}</span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-4 pb-28 pt-5">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {step === 0 && (
              <>
                <h2 className="h-display text-2xl font-bold">Choose your path</h2>
                <p className="mb-4 mt-1 text-sm text-bone-faint">Your class grants starting gear and a head start in one stat.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CLASSES.map((c) => {
                    const on = c.id === classId;
                    const bonus = DEFAULT_STATS.find((d) => d.id === c.bonusStat);
                    return (
                      <motion.button
                        type="button"
                        key={c.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => pickClass(c.id)}
                        className={`panel p-3 text-left transition ${on ? '' : 'opacity-75 hover:opacity-100'}`}
                        style={on ? { borderColor: c.aura, boxShadow: `0 0 0 1px ${c.aura}, 0 0 24px ${rgba(c.aura, 0.25)}` } : undefined}
                        aria-pressed={on}
                      >
                        <p className="font-display font-bold" style={{ color: on ? c.aura : undefined }}>{c.name}</p>
                        <p className="mt-1 text-xs text-bone-faint">{c.desc}</p>
                        {bonus && (
                          <p className="mt-2 inline-flex items-center gap-1 text-[11px]" style={{ color: bonus.color }}>
                            <Icon name={bonus.icon} size={11} /> +1 {bonus.name}
                          </p>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="h-display mb-4 text-2xl font-bold">Your visage</h2>
                <AppearanceEditor value={appearance} onChange={setAppearance} />
              </>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="h-display text-2xl font-bold">Your legend</h2>
                <div className="space-y-2">
                  <label className="label" htmlFor="hero-name">Name</label>
                  <div className="flex gap-2">
                    <input id="hero-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What are you called?" maxLength={24} />
                    <button type="button" className="btn-ghost px-3" onClick={() => setName(randomName())} aria-label="Random name"><Dices size={16} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label" htmlFor="hero-story">Backstory</label>
                    <button type="button" className="text-xs text-ember-light hover:underline" onClick={() => setBackstory(randomBackstory(name))}>Inspire me</button>
                  </div>
                  <textarea id="hero-story" className="input min-h-[110px]" value={backstory} onChange={(e) => setBackstory(e.target.value)} placeholder="Where do you come from? What drives you?" />
                </div>
                <p className="text-sm text-bone-faint">You will be known as <span className="text-ember-light">{name || '…'} {cls.epithet}</span>.</p>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="h-display text-2xl font-bold">Your pillars</h2>
                  <p className="mt-1 text-sm text-bone-faint">These are the stats your deeds will train. Rename, recolour, add or remove them. You can change them later in Settings.</p>
                </div>
                <StatsEditor
                  defs={defs}
                  onAdd={(d) => setDefs((x) => [...x, { ...d, id: `stat-${Date.now().toString(36)}` }])}
                  onUpdate={(id, p) => setDefs((x) => x.map((d) => (d.id === id ? { ...d, ...p } : d)))}
                  onRemove={(id) => setDefs((x) => x.filter((d) => d.id !== id))}
                />
                <label className="flex items-center gap-3 rounded-lg bg-ash-900/60 p-3 text-sm">
                  <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="h-4 w-4 accent-[#e0a33a]" />
                  Start me with a few example quests
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ash-600/40 bg-ash-900/90 p-4 pb-[calc(1rem+var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button className="btn-ghost" onClick={() => go(step - 1)}><ChevronLeft size={16} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary flex-1" onClick={() => go(step + 1)} disabled={step === 2 && !name.trim()}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={finish} disabled={!defs.some((d) => d.name.trim())}>Swear the Oath</button>
          )}
        </div>
      </div>
    </div>
  );
}
