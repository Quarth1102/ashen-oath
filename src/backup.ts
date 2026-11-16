/** Save the whole chronicle as a file: share sheet on phones (→ Save to Files / iCloud Drive), download elsewhere. */
import { useGame } from './store/useGame';

export const BACKUP_NUDGE_DAYS = 7;

export type BackupResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export function backupFileName(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `ashen-oath-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export async function saveBackup(): Promise<BackupResult> {
  const { exportData, updateSettings } = useGame.getState();
  const json = exportData();
  const name = backupFileName();
  const done = (r: BackupResult) => {
    if (r === 'shared' || r === 'downloaded') updateSettings({ lastBackup: new Date().toISOString() });
    return r;
  };
  try {
    const file = new File([json], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    // phones and tablets: the share sheet offers "Save to Files", which can go to iCloud Drive
    if (nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ files: [file], title: 'Ashen Oath backup' });
        return done('shared');
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
        // fall through to a download if sharing failed for another reason
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return done('downloaded');
  } catch {
    return 'failed';
  }
}

/** Days since the last backup, or null if there has never been one. */
export function daysSinceBackup(lastBackup: string | undefined, now = new Date()): number | null {
  if (!lastBackup) return null;
  return Math.floor((now.getTime() - new Date(lastBackup).getTime()) / 86400_000);
}
