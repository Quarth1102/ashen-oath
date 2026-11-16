import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudUpload } from 'lucide-react';
import { useGame } from '../store/useGame';
import { useToday } from '../hooks';
import { BACKUP_NUDGE_DAYS, daysSinceBackup, saveBackup } from '../backup';
import { addDays, diffDays } from '../game/dates';

/** A gentle reminder on Today when the last backup is a week old (or there's never been one). */
export default function BackupNudge() {
  const last = useGame((s) => s.settings.lastBackup);
  const snooze = useGame((s) => s.settings.backupSnoozeUntil);
  const created = useGame((s) => s.hero?.createdDay);
  const updateSettings = useGame((s) => s.updateSettings);
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const since = daysSinceBackup(last);
  const due = since === null ? !!created && diffDays(created, today) >= 2 : since >= BACKUP_NUDGE_DAYS;
  const show = due && !(snooze && snooze > today);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
          data-testid="backup-nudge"
        >
          <div className="panel flex items-center gap-3 p-3" style={{ borderColor: 'rgba(95,209,193,.4)' }}>
            <CloudUpload size={22} className="shrink-0 text-spectral" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-spectral">{since === null ? 'Back up your chronicle' : `Last backup ${since} days ago`}</p>
              <p className="text-xs text-bone-faint">Save a copy to iCloud Drive so your hero is safe.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                className="btn-primary px-3 py-1.5 text-xs"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await saveBackup();
                  setBusy(false);
                }}
              >
                Back up
              </button>
              <button className="text-[11px] text-bone-faint hover:text-bone" onClick={() => updateSettings({ backupSnoozeUntil: addDays(today, 3) })}>
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
