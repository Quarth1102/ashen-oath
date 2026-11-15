import { useEffect, useState } from 'react';
import { useGame } from '../store/useGame';
import { onUnlock, setAmbient, isUnlocked } from '../audio/sound';
import type { Activity } from '../game/activity';

/** Plays the ambient bed for the hero's current activity while mounted and the app is visible. */
export default function AmbientSound({ activity }: { activity: Activity | 'away' }) {
  const on = useGame((s) => s.settings.ambient !== false);
  const volume = useGame((s) => s.settings.volume ?? 0.5);
  const [ready, setReady] = useState(isUnlocked());
  const [visible, setVisible] = useState(typeof document === 'undefined' || document.visibilityState === 'visible');

  useEffect(() => onUnlock(() => setReady(true)), []);
  useEffect(() => {
    const f = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  useEffect(() => {
    if (!ready) return;
    setAmbient(on && visible && volume > 0 ? activity : null, volume * 0.9);
  }, [ready, on, visible, activity, volume]);
  useEffect(() => () => setAmbient(null), []);
  return null;
}
