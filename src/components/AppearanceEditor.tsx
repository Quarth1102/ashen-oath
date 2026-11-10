import type { Appearance } from '../game/types';
import { EYE_COLORS, GLOWING_EYES, HAIR_COLORS, HAIR_STYLES, SCARS, SKINS } from '../data/appearance';

function Swatches({ label, colors, value, onChange, glow }: { label: string; colors: string[]; value: string; onChange: (c: string) => void; glow?: Set<string> }) {
  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            className={`h-9 w-9 rounded-lg border-2 transition ${value === c ? 'scale-110 border-ember' : 'border-ash-600 hover:border-ash-400'}`}
            style={{ background: c, boxShadow: glow?.has(c) ? `0 0 10px ${c}` : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

function Options({ label, options, value, onChange }: { label: string; options: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`chip ${value === o.id ? 'border-ember bg-ember text-void' : 'border-ash-600 bg-ash-900 text-bone-dim hover:text-bone'}`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppearanceEditor({ value, onChange }: { value: Appearance; onChange: (a: Appearance) => void }) {
  const set = <K extends keyof Appearance>(k: K) => (v: Appearance[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <Swatches label="Skin" colors={SKINS} value={value.skin} onChange={set('skin')} />
      <Options label="Hair" options={HAIR_STYLES} value={value.hairStyle} onChange={set('hairStyle')} />
      <Swatches label="Hair colour" colors={HAIR_COLORS} value={value.hairColor} onChange={set('hairColor')} />
      <Swatches label="Eyes (the last four glow)" colors={EYE_COLORS} value={value.eyeColor} onChange={set('eyeColor')} glow={GLOWING_EYES} />
      <Options label="Scar" options={SCARS} value={value.scar} onChange={set('scar')} />
    </div>
  );
}
