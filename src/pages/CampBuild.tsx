import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Coins, Gift, Lock } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useHeroClass, useHeroLook, useRegion } from '../hooks';
import Landscape from '../components/Landscape';
import HeroScene, { Prop } from '../components/HeroScene';
import { PageHeader, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import {
  BANNER_COLORS, DEFAULT_CAMP, FIRE_COLORS, PETS, SIGILS, TENT_COLORS, UPGRADES, campPerks, tierOf, type PetId,
} from '../data/camp';
import { pet as petStrip } from '../art/props';
import { rgba } from '../art/color';

type Tab = 'upgrades' | 'pets' | 'customize';

function PriceButton({ id, price, disabled, onBuy, label }: { id: string; price: number; disabled: boolean; onBuy: () => void; label?: string }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <button className="btn-primary px-3 py-2 text-xs" onClick={() => { onBuy(); setConfirm(false); }} onBlur={() => setConfirm(false)} autoFocus data-testid={`confirm-${id}`}>
      Confirm {price}g
    </button>
  ) : (
    <button className="btn-ghost px-3 py-2 text-xs" disabled={disabled} onClick={() => setConfirm(true)} data-testid={`buy-${id}`}>
      <Coins size={12} className="text-ember-light" /> {label ?? price}
    </button>
  );
}

export default function CampBuild() {
  const hero = useGame((s) => s.hero)!;
  const camp = useGame((s) => s.camp) ?? DEFAULT_CAMP;
  const { buyUpgrade, buyPet, customizeCamp, openChest } = useGame.getState();
  const chests = useGame((s) => s.pendingChests);
  const look = useHeroLook()!;
  const region = useRegion();
  const cls = useHeroClass();
  const [tab, setTab] = useState<Tab>('upgrades');
  const perks = campPerks(camp);
  const perkText = [
    perks.maxHp && `+${perks.maxHp} max HP`,
    perks.regen && `+${perks.regen} HP per habit`,
    perks.gold && `+${Math.round(perks.gold * 100)}% gold`,
    perks.xp && `+${Math.round(perks.xp * 100)}% XP`,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Your Camp"
        subtitle="Build it up, one coin at a time."
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
              <span className="block font-display font-bold text-ember-light">{chests} loot chest{chests > 1 ? 's' : ''} found</span>
              <span className="text-xs text-bone-faint">Tap to open. Each holds gold for your camp.</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="panel overflow-hidden">
        <Landscape region={region} className="h-56 w-full md:h-64">
          {(g, s) => <HeroScene look={look} activity="camp" region={region} ground={g} scale={s} aura={cls.aura} camp={camp} />}
        </Landscape>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
          <span className="label">Camp bonuses</span>
          {perkText.length ? perkText.map((t) => <span key={t as string} className="text-spectral">{t}</span>) : <span className="text-bone-faint">None yet. Upgrades below grant them.</span>}
        </div>
      </div>

      <div className="my-4">
        <Segmented
          layoutId="camp-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upgrades', label: 'Upgrades' },
            { value: 'pets', label: 'Pets' },
            { value: 'customize', label: 'Customize' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
          {tab === 'upgrades' &&
            UPGRADES.map((line) => {
              const cur = tierOf(camp, line.id);
              const now = line.tiers[cur];
              const next = line.tiers[cur + 1];
              const locked = next && hero.level < (next.minLevel ?? 1);
              return (
                <motion.div layout key={line.id} className="panel p-4" data-testid={`upgrade-${line.id}`}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ember-dark/25 text-ember-light"><Icon name={line.icon} size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-bold">{line.name}</p>
                        <div className="flex gap-1">
                          {line.tiers.slice(1).map((_, i) => (
                            <span key={i} className={`h-2 w-5 rounded-full ${i < cur ? 'bg-ember shadow-glow' : 'bg-ash-600'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-bone-faint">{cur > 0 ? `${now.name}${now.perk ? ` · ${now.perk}` : ''}` : line.id === 'tent' || line.id === 'hearth' ? now.name : 'Not built'}</p>
                    </div>
                  </div>
                  {next ? (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-ash-900/60 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{cur > 0 || line.id === 'tent' || line.id === 'hearth' ? 'Upgrade to' : 'Build'} {next.name}</p>
                        <p className="text-xs text-bone-faint">{next.desc}</p>
                        {next.perk && <p className="text-xs text-spectral">{next.perk}</p>}
                      </div>
                      {locked ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-bone-faint"><Lock size={12} /> Level {next.minLevel}</span>
                      ) : (
                        <PriceButton id={line.id} price={next.price} disabled={hero.gold < next.price} onBuy={() => buyUpgrade(line.id)} />
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-ember-light"><Check size={14} /> Fully built</p>
                  )}
                </motion.div>
              );
            })}

          {tab === 'pets' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PETS.map((p) => {
                const owned = camp.pets.includes(p.id);
                const active = camp.pet === p.id;
                const locked = hero.level < (p.minLevel ?? 1);
                const strip = petStrip(p.id);
                return (
                  <div key={p.id} className="panel flex items-center gap-3 p-3 sm:flex-col sm:text-center" style={active ? { borderColor: rgba('#e0a33a', 0.7) } : undefined} data-testid={`pet-${p.id}`}>
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-ash-900/70">
                      <Prop strip={strip} u={4} style={{ position: 'relative' }} speed={0.9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold">{p.name}</p>
                      <p className="text-xs text-bone-faint">{p.desc}</p>
                    </div>
                    {owned ? (
                      <button className={`${active ? 'btn-ghost' : 'btn-primary'} shrink-0 px-3 py-2 text-xs`} onClick={() => customizeCamp({ pet: active ? null : p.id })}>
                        {active ? 'With you' : 'Bring along'}
                      </button>
                    ) : locked ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-bone-faint"><Lock size={12} /> Level {p.minLevel}</span>
                    ) : (
                      <PriceButton id={p.id} price={p.price} disabled={hero.gold < p.price} onBuy={() => buyPet(p.id as PetId)} />
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-bone-faint sm:col-span-3">Your companion sits by the fire, keeps you company while fishing, and follows you when you wander.</p>
            </div>
          )}

          {tab === 'customize' && (
            <div className="panel space-y-5 p-4">
              <div className="space-y-2">
                <p className="label">Tent colour</p>
                <div className="flex flex-wrap gap-2">
                  {TENT_COLORS.map((c) => (
                    <button key={c} onClick={() => customizeCamp({ tentColor: c })} aria-label={`Tent colour ${c}`} aria-pressed={camp.tentColor === c}
                      className={`h-9 w-9 rounded-lg border-2 transition ${camp.tentColor === c ? 'scale-110 border-ember' : 'border-ash-600'}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="label">Fire</p>
                <div className="flex flex-wrap gap-2">
                  {FIRE_COLORS.map((f) => (
                    <button key={f.id} onClick={() => customizeCamp({ fire: f.id })} aria-pressed={camp.fire === f.id}
                      className={`chip ${camp.fire === f.id ? 'border-ember text-bone' : 'border-ash-600 text-bone-dim'}`}
                      style={{ background: `linear-gradient(90deg, ${f.colors[0]}55, ${f.colors[1]}55)` }}>
                      <span className="h-3 w-3 rounded-full" style={{ background: f.colors[1], boxShadow: `0 0 8px ${f.colors[1]}` }} />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="label">Banner</p>
                {tierOf(camp, 'banner') === 0 ? (
                  <p className="text-xs text-bone-faint">Build a Banner Pole in Upgrades to fly your colours.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {BANNER_COLORS.map((c) => (
                        <button key={c} onClick={() => customizeCamp({ bannerColor: c })} aria-label={`Banner colour ${c}`} aria-pressed={camp.bannerColor === c}
                          className={`h-9 w-9 rounded-lg border-2 transition ${camp.bannerColor === c ? 'scale-110 border-ember' : 'border-ash-600'}`} style={{ background: c }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SIGILS.map((g) => (
                        <button key={g} onClick={() => customizeCamp({ sigil: g })} aria-pressed={camp.sigil === g}
                          className={`chip capitalize ${camp.sigil === g ? 'border-ember bg-ember text-void' : 'border-ash-600 bg-ash-900 text-bone-dim'}`}>
                          <Icon name={g === 'moon' ? 'moon' : g} size={13} /> {g}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
