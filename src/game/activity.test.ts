import { describe, expect, it } from 'vitest';
import { SCHEDULE, SLOT_MINUTES, activityAt } from './activity';

const at = (h: number, m = 0, day = 11) => new Date(2026, 10, day, h, m);

describe('hero activity', () => {
  it('always sleeps in the small hours', () => {
    for (let h = 0; h < 5; h++) for (let d = 1; d <= 20; d++) expect(activityAt(at(h, 30, d), 'x')).toBe('sleep');
    expect(activityAt(at(23, 40), 'x')).toBe('sleep');
  });

  it('never wanders or fishes at night', () => {
    for (let d = 1; d <= 28; d++) for (const h of [21, 22, 23, 0, 2, 4]) expect(['wander', 'fish']).not.toContain(activityAt(at(h, 10, d), 'seed'));
  });

  it('only picks activities allowed for that hour', () => {
    for (let d = 1; d <= 28; d++)
      for (let h = 0; h < 24; h++) {
        const block = SCHEDULE.find((b) => h >= b.from && h < b.to)!;
        expect(block.choices.map(([a]) => a)).toContain(activityAt(at(h, 15, d), 'hero'));
      }
  });

  it('is stable within a slot and varies across days', () => {
    expect(activityAt(at(14, 0), 'a')).toBe(activityAt(at(14, SLOT_MINUTES / 3), 'a'));
    const seen = new Set(Array.from({ length: 30 }, (_, d) => activityAt(at(15, 0, d + 1), 'a')));
    expect(seen.size).toBeGreaterThan(1);
  });
});
