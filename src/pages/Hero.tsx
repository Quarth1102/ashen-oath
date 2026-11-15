import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Pencil } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useHeroClass, useHeroLook, useRegion } from '../hooks';
import HeroSprite from '../components/HeroSprite';
import Landscape from '../components/Landscape';
import Radar from '../components/Radar';
import AppearanceEditor from '../components/AppearanceEditor';
import { Icon } from '../components/Icon';
import { Bar, Sheet } from '../components/ui';
import { statXpToNext, heroXpToNext } from '../game/xp';
import ClassPanel from '../components/ClassPanel';
import { GEAR_BY_ID, RARITY_COLOR, SLOTS, SLOT_NAME } from '../data/gear';
import { wardrobe } from '../game/wardrobe';
import type { Appearance, Slot } from '../game/types';
import { rgba } from '../art/color';

export default function Hero() {
  const hero = useGame((s) => s.hero)!;
  const defs = useGame((s) => s.statDefs);
  const { updateHero, equip, unequip, equipRankSet } = useGame.getState();
  const look = useHeroLook()!;
  const region = useRegion();
  const cls = useHeroClass();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [editLook, setEditLook] = useState<Appearance | null>(null);
  const [editStory, setEditStory] = useState<{ name: string; backstory: string } | null>(null);

  // this rank's wardrobe: unlocked pieces, and the ones still waiting on a level
  const pieces = (s: Slot) => wardrobe(hero, defs).filter((i) => i.slot === s).sort((a, b) => a.unlock - b.unlock);
  const unlocked = (s: Slot) => pieces(s).filter((i) => hero.level >= i.unlock);
  const upcoming = (s: Slot) => pieces(s).filter((i) => hero.level < i.unlock);
  const nextUnlock = wardrobe(hero, defs).filter((i) => i.unlock > hero.level).sort((a, b) => a.unlock - b.unlock)[0]?.unlock;
  const wardrobeName = cls.kind === 'wanderer' ? 'Wanderer' : cls.kind === 'paragon' ? 'every rank' : cls.name;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
        <div className="panel overflow-hidden">
          <Landscape region={region} className="h-64 w-full">
            {(g, s) => (
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: g - 4 * s }}>
                <HeroSprite look={look} size={Math.round(32 * s * 1.25)} aura={cls.aura} />
              </div>
            )}
          </Landscape>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="h-display text-2xl font-black">{hero.name}</h1>
                <select
                  className="mt-1 rounded-md border border-ash-600/60 bg-ash-900 px-2 py-1 text-sm text-ember-light"
                  value={hero.title}
                  onChange={(e) => updateHero({ title: e.target.value })}
                  aria-label="Title"
                >
                  {hero.titles.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="text-right">
                <p className="font-pixel text-2xl text-ember-light">LV {hero.level}</p>
                <p className="text-xs text-bone-faint">{cls.name}</p>
              </div>
            </div>
            <Bar value={hero.xp} max={heroXpToNext(hero.level)} color="#e0a33a" glow />
            <p className="text-xs text-bone-faint">{hero.totalXp.toLocaleString()} XP earned in total · {hero.titles.length} titles</p>
            <p className="text-sm italic leading-relaxed text-bone-dim">{hero.backstory || 'Your story is yet unwritten.'}</p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 text-xs" onClick={() => setEditLook(hero.appearance)}>Change look</button>
              <button className="btn-ghost flex-1 text-xs" onClick={() => setEditStory({ name: hero.name, backstory: hero.backstory })}><Pencil size={13} /> Edit legend</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ClassPanel />
          <div className="panel p-4">
            <h2 className="h-display mb-3 text-lg font-bold">Attributes</h2>
            <Radar defs={defs} stats={hero.stats} />
            <ul className="mt-3 space-y-3">
              {defs.map((d, i) => {
                const p = hero.stats[d.id] ?? { level: 1, xp: 0 };
                return (
                  <motion.li key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3" data-testid={`stat-${d.id}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: rgba(d.color, 0.12), color: d.color }}>
                      <Icon name={d.icon} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">
                          {d.name}
                        </span>
                        <span className="font-pixel text-xs" style={{ color: d.color }}>LV {p.level}</span>
                      </div>
                      <Bar value={p.xp} max={statXpToNext(p.level)} color={d.color} height={6} className="mt-1" />
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="h-display text-lg font-bold">Equipment</h2>
                <p className="text-xs text-bone-faint">
                  Wardrobe: <span style={{ color: cls.aura }}>{wardrobeName}</span>
                  {nextUnlock ? ` · more at level ${nextUnlock}` : ''}
                </p>
              </div>
            </div>
            <button className="btn-primary mb-3 w-full" onClick={equipRankSet} data-testid="wear-rank">
              {cls.kind === 'wanderer' ? 'Wear wanderer’s gear' : `Wear my ${cls.kind === 'paragon' ? 'Paragon' : cls.name} equipment`}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {SLOTS.map((s) => {
                const item = hero.equipped[s] ? GEAR_BY_ID[hero.equipped[s]!] : undefined;
                return (
                  <button key={s} onClick={() => setSlot(s)} className="panel-inset p-3 text-left transition hover:border-ash-400" style={item ? { borderColor: rgba(RARITY_COLOR[item.rarity], 0.4) } : undefined}>
                    <p className="label">{SLOT_NAME[s]}</p>
                    <p className="mt-1 truncate text-sm font-semibold" style={{ color: item ? RARITY_COLOR[item.rarity] : '#7d7468' }}>{item?.name ?? 'Empty'}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!slot} onClose={() => setSlot(null)} title={slot ? `Choose ${SLOT_NAME[slot].toLowerCase()}` : ''}>
        {slot && (
          <div className="space-y-2">
            {unlocked(slot).length === 0 && <p className="text-sm text-bone-faint">Nothing unlocked for this slot yet.</p>}
            {unlocked(slot).map((it) => {
              const on = hero.equipped[slot] === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => { on ? unequip(slot) : equip(it.id); }}
                  className="panel-inset flex w-full items-center gap-3 p-2 text-left"
                  style={on ? { borderColor: RARITY_COLOR[it.rarity] } : undefined}
                >
                  <HeroSprite look={{ ...look, equipped: { ...look.equipped, [slot]: it.id } }} size={64} idle={false} shadow={false} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold" style={{ color: RARITY_COLOR[it.rarity] }}>{it.name}</p>
                    <p className="text-xs text-bone-faint">{it.desc}</p>
                  </div>
                  <span className={`text-xs font-bold ${on ? 'text-ember-light' : 'text-bone-faint'}`}>{on ? 'Worn' : 'Equip'}</span>
                </button>
              );
            })}
            {upcoming(slot).map((it) => (
              <div key={it.id} className="panel-inset flex w-full items-center gap-3 p-2 opacity-60">
                <div className="grayscale"><HeroSprite look={{ ...look, equipped: { ...look.equipped, [slot]: it.id } }} size={64} idle={false} shadow={false} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-xs text-bone-faint">{it.desc}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-bone-faint"><Lock size={12} /> Lv {it.unlock}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-bone-faint">Gear is cosmetic. Your rank decides your wardrobe, and new pieces unlock at levels 3, 8, 15 and 25.</p>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!editLook}
        onClose={() => setEditLook(null)}
        title="Change your look"
        footer={<button className="btn-primary w-full" onClick={() => { if (editLook) updateHero({ appearance: editLook }); setEditLook(null); }}>Save look</button>}
      >
        {editLook && (
          <div className="space-y-4">
            <div className="sticky top-0 z-10 -mx-1 flex justify-center rounded-xl bg-ash-900 py-2 shadow-lg">
              <HeroSprite look={{ ...look, appearance: editLook }} size={128} aura={cls.aura} />
            </div>
            <AppearanceEditor value={editLook} onChange={setEditLook} />
          </div>
        )}
      </Sheet>

      <Sheet open={!!editStory} onClose={() => setEditStory(null)} title="Edit your legend">
        {editStory && (
          <div className="space-y-4">
            <input className="input" value={editStory.name} maxLength={24} onChange={(e) => setEditStory({ ...editStory, name: e.target.value })} aria-label="Name" />
            <textarea className="input min-h-[120px]" value={editStory.backstory} onChange={(e) => setEditStory({ ...editStory, backstory: e.target.value })} aria-label="Backstory" />
            <button className="btn-primary w-full" disabled={!editStory.name.trim()} onClick={() => { updateHero({ name: editStory.name.trim(), backstory: editStory.backstory }); setEditStory(null); }}>Save</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
