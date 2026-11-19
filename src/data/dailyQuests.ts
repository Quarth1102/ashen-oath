/** Hand-written daily challenges, by pillar. Picked at random each day, weighted toward weaker pillars. */
export const CHALLENGES: Record<string, { title: string; detail: string }[]> = {
  body: [
    { title: 'Walk 20 minutes outside', detail: 'Any pace. Leave the phone in your pocket.' },
    { title: 'Do 50 push-ups through the day', detail: 'Split them however you like.' },
    { title: 'Drink 8 glasses of water', detail: 'Keep a glass within reach.' },
    { title: 'Stretch for 10 minutes', detail: 'Hips, back, shoulders.' },
    { title: 'In bed before 11', detail: 'Lights out, screen down.' },
    { title: 'Cook one proper meal', detail: 'Something with a vegetable in it.' },
    { title: 'Take the stairs every time', detail: 'No lifts, no escalators today.' },
    { title: '100 squats before nightfall', detail: 'Sets of 20 are fine.' },
  ],
  mind: [
    { title: 'Read 15 pages of something new', detail: 'A book you haven’t started yet counts double in spirit.' },
    { title: 'Learn 10 words of a new language', detail: 'Write them down, say them aloud.' },
    { title: '25 minutes of deep focus', detail: 'One task, no phone, no tabs.' },
    { title: 'Write down an idea worth building', detail: 'Half a page is enough.' },
    { title: 'Watch a lesson on something unfamiliar', detail: 'A lecture, a tutorial, a documentary.' },
    { title: 'Solve a puzzle', detail: 'Crossword, chess problem, sudoku, code kata.' },
    { title: 'Teach someone one thing you know', detail: 'Explaining is the best way to learn.' },
    { title: 'Practise a skill for 20 minutes', detail: 'Instrument, drawing, writing, coding.' },
  ],
  spirit: [
    { title: 'Meditate for 10 minutes', detail: 'Just breathe and notice.' },
    { title: 'Write three things you’re grateful for', detail: 'Small ones count.' },
    { title: 'Reach out to someone you care about', detail: 'A call, a message, a visit.' },
    { title: '15 minutes outside without your phone', detail: 'Look at the sky for a bit.' },
    { title: 'Do one quiet kindness', detail: 'Nobody needs to know it was you.' },
    { title: 'Journal for 10 minutes', detail: 'What’s weighing on you, what’s lifting you.' },
    { title: 'Spend an hour fully present with someone', detail: 'No screens between you.' },
    { title: 'Forgive something small', detail: 'Yourself counts.' },
  ],
  discipline: [
    { title: 'No social media until noon', detail: 'The world will wait.' },
    { title: 'Make your bed and clear your space', detail: 'Start the day with order.' },
    { title: 'Finish the task you’ve been avoiding', detail: 'You know the one.' },
    { title: 'No sugar today', detail: 'Read the labels.' },
    { title: 'Plan tomorrow before bed', detail: 'Three things that matter most.' },
    { title: 'Wake with the first alarm', detail: 'No snooze.' },
    { title: 'An hour with your phone in another room', detail: 'Notice how often you reach for it.' },
    { title: 'Spend nothing you didn’t plan to', detail: 'No impulse buys today.' },
  ],
};

export const QUEST_XP = { challenge: 30, boost: 35, countPer: 15, bonus: 25 };
export const DAILY_REROLLS = 1;

/**
 * "Walk 10,000 steps" → "Walk 15,000 steps". Raises the first number by 50%, rounded to a
 * natural-looking value. Returns null if the title has no number.
 */
export function boostTitle(title: string): string | null {
  const m = title.match(/\d[\d,]*(\.\d+)?/);
  if (!m) return null;
  const raw = m[0];
  const n = parseFloat(raw.replace(/,/g, ''));
  if (!isFinite(n) || n <= 0) return null;
  const up = n * 1.5;
  const step = up >= 1000 ? 500 : up >= 100 ? 10 : up >= 10 ? 5 : 1;
  let v = Math.round(up / step) * step;
  if (v <= n) v = n + step;
  const text = raw.includes(',') || v >= 10000 ? v.toLocaleString('en-US') : String(v);
  return title.slice(0, m.index) + text + title.slice((m.index ?? 0) + raw.length);
}
