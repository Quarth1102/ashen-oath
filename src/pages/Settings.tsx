import { useRef, useState } from 'react';
import { CloudUpload, Palmtree, Upload, Volume2 } from 'lucide-react';
import { BACKUP_NUDGE_DAYS, daysSinceBackup, saveBackup } from '../backup';
import { useToday } from '../hooks';
import { parseDay } from '../game/dates';
import { playChime } from '../audio/sound';
import { useGame } from '../store/useGame';
import StatsEditor from '../components/StatsEditor';
import { PageHeader, Segmented } from '../components/ui';
import { PENALTY_LABEL } from '../game/penalty';
import type { PenaltyStrength } from '../game/types';

export default function Settings() {
  const defs = useGame((s) => s.statDefs);
  const settings = useGame((s) => s.settings);
  const { addStat, updateStat, removeStat, updateSettings, importData, resetAll, startVacation, endVacation } = useGame.getState();
  const [until, setUntil] = useState('');
  const today = useToday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetText, setResetText] = useState('');

  const doBackup = async () => {
    const r = await saveBackup();
    setMsg(
      r === 'shared' ? 'Backup saved. Keep it somewhere safe, like iCloud Drive.'
        : r === 'downloaded' ? 'Backup downloaded.'
          : r === 'cancelled' ? null
            : 'Could not create the backup file.',
    );
  };
  const since = daysSinceBackup(settings.lastBackup);

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

      <section className="panel space-y-4 p-4" data-testid="vacation-section">
        <div className="flex items-center gap-2">
          <Palmtree size={18} className="text-spectral" />
          <h2 className="h-display text-lg font-bold">Vacation mode</h2>
        </div>
        {settings.vacation ? (
          <div className="space-y-3">
            <p className="text-sm text-spectral">
              You are away on a journey{settings.vacation.until ? ` until ${parseDay(settings.vacation.until).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}. No penalties, no check-ins, and your streaks are frozen.
            </p>
            <button className="btn-ghost w-full" onClick={endVacation}>Return to camp</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-bone-faint">Going away? While on vacation, missed habits cost nothing, the check-in is skipped, and streaks are frozen. You can still log deeds for XP.</p>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1">
                <span className="label">Back on (optional)</span>
                <input type="date" className="input" min={today} value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Vacation end date" />
              </label>
              <button className="btn-primary" onClick={() => { startVacation(until || undefined); setUntil(''); }} data-testid="start-vacation">Set out</button>
            </div>
            <p className="text-[11px] text-bone-faint">With a return date, vacation ends on its own after that day. Without one, it lasts until you return.</p>
          </div>
        )}
      </section>

      <section className="panel space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-ember-light" />
          <h2 className="h-display text-lg font-bold">Sound &amp; feel</h2>
        </div>
        {[
          { key: 'sound' as const, title: 'Sound effects', desc: 'A sword chime for each deed (rising with combos), plus level-up and perfect-day fanfares.' },
          { key: 'ambient' as const, title: 'Ambient sounds', desc: 'Crackling fire at camp, lapping water while fishing, wind on the road, crickets at night.' },
          { key: 'haptics' as const, title: 'Vibration', desc: 'A short buzz on completions. Works on Android; iPhones don’t allow web apps to vibrate.' },
        ].map((o) => (
          <label key={o.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#e0a33a]"
              checked={settings[o.key] !== false}
              onChange={(e) => {
                updateSettings({ [o.key]: e.target.checked });
                if (o.key === 'sound' && e.target.checked) playChime();
              }}
            />
            <span>
              <span className="block text-sm font-semibold">{o.title}</span>
              <span className="block text-xs text-bone-faint">{o.desc}</span>
            </span>
          </label>
        ))}
        <label className="block space-y-1">
          <span className="label">Ambient volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((settings.volume ?? 0.5) * 100)}
            onChange={(e) => updateSettings({ volume: +e.target.value / 100 })}
            className="w-full accent-[#e0a33a]"
            aria-label="Ambient volume"
          />
        </label>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex items-center gap-2">
          <CloudUpload size={18} className="text-spectral" />
          <h2 className="h-display text-lg font-bold">Backup</h2>
        </div>
        <p className="text-xs text-bone-faint">
          Your hero lives only on this device. Save a backup file now and then. On iPhone, choose <b>Save to Files → iCloud Drive</b> so it’s safe even if you lose your phone. To move to another device, open the app there and restore the file.
        </p>
        <p className="text-xs" data-testid="last-backup">
          {since === null ? (
            <span className="text-blood-light">No backup yet.</span>
          ) : (
            <span className={since >= BACKUP_NUDGE_DAYS ? 'text-ember-light' : 'text-spectral'}>
              Last backup: {since === 0 ? 'today' : since === 1 ? 'yesterday' : `${since} days ago`}.
            </span>
          )}
        </p>
        <button className="btn-primary w-full" onClick={doBackup} data-testid="save-backup"><CloudUpload size={16} /> Save backup to iCloud / Files</button>
        <button className="btn-ghost w-full" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore from a backup file</button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} data-testid="import-input" />
        <p className="text-[11px] text-bone-faint">Restoring replaces everything on this device with what's in the file.</p>
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
