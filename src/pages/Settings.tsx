import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useGame } from '../store/useGame';
import StatsEditor from '../components/StatsEditor';
import { PageHeader, Segmented } from '../components/ui';
import { PENALTY_LABEL } from '../game/penalty';
import type { PenaltyStrength } from '../game/types';

export default function Settings() {
  const defs = useGame((s) => s.statDefs);
  const settings = useGame((s) => s.settings);
  const { addStat, updateStat, removeStat, updateSettings, exportData, importData, resetAll } = useGame.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetText, setResetText] = useState('');

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashen-oath-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Your chronicle has been exported.');
  };

  const doImport = async (f: File) => {
    const ok = importData(await f.text());
    setMsg(ok ? 'Chronicle restored.' : 'That file is not a valid Ashen Oath save.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <section className="panel space-y-3 p-4">
        <div>
          <h2 className="h-display text-lg font-bold">Stats</h2>
          <p className="text-xs text-bone-faint">The pillars your deeds train. Removing a stat erases its progress and untags it from your quests.</p>
        </div>
        <StatsEditor defs={defs} onAdd={addStat} onUpdate={updateStat} onRemove={removeStat} />
      </section>

      <section className="panel space-y-4 p-4">
        <h2 className="h-display text-lg font-bold">The rules of the oath</h2>
        <div className="space-y-2">
          <p className="label">Penalty for neglect</p>
          <Segmented
            layoutId="penalty"
            value={settings.penalty}
            onChange={(v) => updateSettings({ penalty: v as PenaltyStrength })}
            options={([0, 1, 2, 3] as PenaltyStrength[]).map((p) => ({ value: p, label: PENALTY_LABEL[p] }))}
          />
          <p className="text-xs text-bone-faint">Missed daily habits and vices you give in to cost HP. At 0 HP you fall: you lose 10% of your gold and the XP toward your next level, but never a level or a stat.</p>
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-ash-900/60 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#e0a33a]"
            checked={settings.reviewMissed !== false}
            onChange={(e) => updateSettings({ reviewMissed: e.target.checked })}
            data-testid="review-toggle"
          />
          <span>
            <span className="block text-sm font-semibold">Ask before applying penalties</span>
            <span className="block text-xs text-bone-faint">When a new day starts with habits left unmarked, ask which ones you actually did. Ticked habits get their XP and keep their streak. Only the rest cost HP. Turn this off to apply penalties automatically.</span>
          </span>
        </label>
        <div className="space-y-2">
          <label className="label" htmlFor="reset-hour">New day begins at</label>
          <select id="reset-hour" className="input" value={settings.resetHour} onChange={(e) => updateSettings({ resetHour: +e.target.value })}>
            {Array.from({ length: 12 }, (_, h) => (
              <option key={h} value={h}>{h === 0 ? 'Midnight' : `${h}:00 AM`}</option>
            ))}
          </select>
          <p className="text-xs text-bone-faint">For night owls: deeds done before this hour count for the previous day.</p>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="h-display text-lg font-bold">Your data</h2>
        <p className="text-xs text-bone-faint">Everything is stored on this device only. Export a backup now and then, or move it to another device.</p>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={doExport}><Download size={16} /> Export</button>
          <button className="btn-ghost flex-1" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} data-testid="import-input" />
        </div>
        {msg && <p className="text-sm text-spectral">{msg}</p>}
      </section>

      <section className="panel space-y-3 border-blood/40 p-4">
        <h2 className="h-display text-lg font-bold text-blood-light">Break the oath</h2>
        <p className="text-xs text-bone-faint">Erase your hero and every record. This cannot be undone. Type <b>BREAK</b> to confirm.</p>
        <div className="flex gap-2">
          <input className="input" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="BREAK" aria-label="Type BREAK to confirm" />
          <button className="btn-danger" disabled={resetText !== 'BREAK'} onClick={() => { resetAll(); setResetText(''); }}>Erase</button>
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] text-bone-faint">Ashen Oath · v0.1</p>
    </div>
  );
}
