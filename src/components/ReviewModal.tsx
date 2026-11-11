import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, HeartCrack, Hourglass } from 'lucide-react';
import { useGame } from '../store/useGame';
import { damageFor } from '../game/penalty';
import { BASE_XP } from '../game/xp';
import { addDays, parseDay } from '../game/dates';
import type { ReviewItem } from '../game/types';
import { SkullRating } from './ui';
import { DIFFICULTIES } from '../game/engine';

function dayLabel(day: string, today: string) {
  const d = parseDay(day);
  const date = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return day === addDays(today, -1) ? `Yesterday · ${date}` : date;
}

interface Row {
  habitId: string;
  title: string;
  difficulty: ReviewItem['difficulty'];
  kind: ReviewItem['kind'];
  keys: string[]; // daily: 1 key; weekly: one per missing session, in order
}

/**
 * Shown when a new day starts with habits left unmarked. Nothing is penalised until the player
 * confirms which ones they actually did.
 */
export default function ReviewModal() {
  const review = useGame((s) => s.pendingReview);
  const strength = useGame((s) => s.settings.penalty);
  const hp = useGame((s) => s.hero?.hp ?? 0);
  const habits = useGame((s) => s.habits);
  const resolve = useGame((s) => s.resolveReview);
  const today = review?.through ?? '';
  const [done, setDone] = useState<Set<string>>(new Set());

  // group by day; weekly sessions of one habit collapse into a single row
  const groups = useMemo(() => {
    const live = new Set(habits.map((h) => h.id));
    const byDay = new Map<string, Row[]>();
    for (const it of review?.items ?? []) {
      if (!live.has(it.habitId)) continue;
      const rows = byDay.get(it.day) ?? [];
      const existing = rows.find((r) => r.habitId === it.habitId);
      if (existing) existing.keys.push(it.key);
      else rows.push({ habitId: it.habitId, title: it.title, difficulty: it.difficulty, kind: it.kind, keys: [it.key] });
      byDay.set(it.day, rows);
    }
    return [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [review, habits]);

  const allKeys = groups.flatMap(([, rows]) => rows.flatMap((r) => r.keys));
  const itemByKey = useMemo(() => new Map((review?.items ?? []).map((i) => [i.key, i])), [review]);

  // damage is per day for dailies; weekly misses cost per missing session (capped at 3), as in the engine
  const penalty = useMemo(() => {
    let total = 0;
    for (const [, rows] of groups)
      for (const r of rows) {
        const left = r.keys.filter((k) => !done.has(k)).length;
        if (!left) continue;
        total += damageFor(r.difficulty, strength) * (r.kind === 'weekly' ? Math.min(3, left) : 1);
      }
    return total;
  }, [groups, done, strength]);
  const xp = [...done].reduce((a, k) => a + (itemByKey.get(k) ? BASE_XP[itemByKey.get(k)!.difficulty] : 0), 0);

  const toggle = (k: string) => setDone((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setWeekly = (keys: string[], count: number) =>
    setDone((s) => { const n = new Set(s); keys.forEach((k, i) => (i < count ? n.add(k) : n.delete(k))); return n; });

  const open = !!review && allKeys.length > 0;
  const confirm = () => {
    resolve([...done]);
    setDone(new Set());
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="review-modal">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Did you do these?"
            className="panel relative flex max-h-[calc(100dvh-1.5rem-var(--safe-top))] w-full flex-col overflow-hidden rounded-b-none sm:max-w-lg sm:rounded-xl"
            style={{ background: 'linear-gradient(180deg, #1f1a25, #141118)' }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="shrink-0 border-b border-ash-600/40 px-5 pb-4 pt-5">
              <div className="flex items-center gap-2 text-ember-light">
                <Hourglass size={18} />
                <p className="label text-ember-light">Before the dawn takes its toll</p>
              </div>
              <h2 className="h-display mt-1 text-2xl font-bold">Did you do these?</h2>
              <p className="mt-1 text-sm text-bone-faint">These were left unmarked. Tick the ones you actually did: you’ll get the XP and keep your streak. Anything left unticked costs HP.</p>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4" style={{ touchAction: 'pan-y' }}>
              {groups.map(([day, rows]) => (
                <section key={day} className="space-y-2">
                  <p className="label">{dayLabel(day, today)}</p>
                  {rows.map((r) => {
                    const dmg = damageFor(r.difficulty, strength);
                    if (r.kind === 'daily') {
                      const k = r.keys[0];
                      const on = done.has(k);
                      return (
                        <motion.button
                          key={k}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggle(k)}
                          aria-pressed={on}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-ember/60 bg-ember-dark/20' : 'border-ash-600/60 bg-ash-900/60'}`}
                          data-testid="review-item"
                        >
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 transition ${on ? 'border-ember bg-ember text-void' : 'border-ash-500'}`}>
                            {on && <Check size={18} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate font-semibold ${on ? 'text-ember-light' : ''}`}>{r.title}</span>
                            <SkullRating n={DIFFICULTIES.indexOf(r.difficulty) + 1} />
                          </span>
                          <span className={`shrink-0 text-xs font-semibold ${on ? 'text-ember-light' : 'text-blood-light'}`}>
                            {on ? `+${BASE_XP[r.difficulty]} XP` : dmg ? `−${dmg} HP` : 'streak lost'}
                          </span>
                        </motion.button>
                      );
                    }
                    const count = r.keys.filter((k) => done.has(k)).length;
                    const left = r.keys.length - count;
                    return (
                      <div key={r.habitId} className="rounded-xl border border-ash-600/60 bg-ash-900/60 p-3" data-testid="review-weekly">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{r.title}</span>
                          <span className={`text-xs font-semibold ${left ? 'text-blood-light' : 'text-ember-light'}`}>
                            {left ? (dmg ? `−${dmg * Math.min(3, left)} HP` : 'streak lost') : 'week kept'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-bone-faint">This week you were {r.keys.length} session{r.keys.length > 1 ? 's' : ''} short. How many more did you do?</p>
                        <div className="mt-2 flex gap-1.5">
                          {Array.from({ length: r.keys.length + 1 }, (_, n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setWeekly(r.keys, n)}
                              aria-pressed={count === n}
                              className={`h-9 min-w-[2.75rem] rounded-lg border px-2 text-sm font-bold transition ${count === n ? 'border-ember bg-ember text-void' : 'border-ash-600 bg-ash-900 text-bone-dim'}`}
                            >
                              {n === 0 ? 'None' : `+${n}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>

            <div className="shrink-0 space-y-3 border-t border-ash-600/40 bg-ash-900/95 px-5 pb-[calc(.9rem+var(--safe-bottom))] pt-3">
              <div className="flex items-center justify-between text-sm">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={penalty} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={`flex items-center gap-1.5 font-semibold ${penalty ? 'text-blood-light' : 'text-spectral'}`}>
                    <HeartCrack size={15} />
                    {penalty ? `−${penalty} HP${penalty >= hp ? ' (you will fall)' : ''}` : 'No penalty'}
                  </motion.span>
                </AnimatePresence>
                {xp > 0 && <span className="text-ember-light">+{xp} XP or more</span>}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3 text-xs" onClick={() => setDone(done.size === allKeys.length ? new Set() : new Set(allKeys))}>
                  {done.size === allKeys.length ? 'Clear all' : 'I did them all'}
                </button>
                <button type="button" className={`${penalty ? 'btn-danger' : 'btn-primary'} flex-1`} onClick={confirm} data-testid="review-confirm">
                  {penalty ? 'Accept the toll' : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
