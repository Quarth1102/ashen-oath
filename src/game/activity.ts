/** What the hero is doing in the camp scene, based on the time of day. */
import { formatDay } from './dates';

export type Activity = 'sleep' | 'camp' | 'fish' | 'wander' | 'watch';
export const ACTIVITIES: Activity[] = ['sleep', 'camp', 'fish', 'wander', 'watch'];

/** Weighted choices for each part of the day (local hours, [from, to)). */
export const SCHEDULE: { from: number; to: number; choices: [Activity, number][] }[] = [
  { from: 0, to: 5, choices: [['sleep', 1]] },
  { from: 5, to: 7, choices: [['camp', 3], ['watch', 1]] },
  { from: 7, to: 11, choices: [['wander', 3], ['fish', 2], ['watch', 1]] },
  { from: 11, to: 13, choices: [['camp', 2], ['fish', 2], ['wander', 1]] },
  { from: 13, to: 18, choices: [['wander', 3], ['fish', 2], ['watch', 1]] },
  { from: 18, to: 21, choices: [['camp', 3], ['fish', 1], ['watch', 1]] },
  { from: 21, to: 23, choices: [['camp', 3], ['watch', 1]] },
  { from: 23, to: 24, choices: [['sleep', 1]] },
];

/** The activity only changes every SLOT_MINUTES, so it doesn't flicker between visits. */
export const SLOT_MINUTES = 90;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function activityAt(now: Date, seed = ''): Activity {
  const hour = now.getHours();
  const block = SCHEDULE.find((b) => hour >= b.from && hour < b.to) ?? SCHEDULE[0];
  const slot = Math.floor((hour * 60 + now.getMinutes()) / SLOT_MINUTES);
  const total = block.choices.reduce((a, [, w]) => a + w, 0);
  let r = hash(`${seed}|${formatDay(now)}|${slot}`) * total;
  for (const [act, w] of block.choices) {
    if (r < w) return act;
    r -= w;
  }
  return block.choices[0][0];
}

export function activityCaption(a: Activity, name: string): string {
  switch (a) {
    case 'sleep': return `${name} sleeps beside the dying embers.`;
    case 'camp': return `${name} rests by the campfire.`;
    case 'fish': return `${name} is fishing at the water’s edge.`;
    case 'wander': return `${name} wanders the land.`;
    case 'watch': return `${name} keeps watch.`;
  }
}
