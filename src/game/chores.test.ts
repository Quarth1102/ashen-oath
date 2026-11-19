import { describe, expect, it } from 'vitest';
import { CHORE_WEIGHTS, choreCaption, pickChore } from './chores';
import { mulberry32 } from '../art/color';

describe('camp chores', () => {
  it('never repeats the current chore', () => {
    const rng = mulberry32(7);
    let prev = pickChore('camp', null, true, rng);
    for (let i = 0; i < 200; i++) {
      const next = pickChore('camp', prev, true, rng);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('skips petting when there is no pet', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 300; i++) expect(pickChore('camp', null, false, rng)).not.toBe('pet');
  });

  it('keeping watch mostly means standing', () => {
    const rng = mulberry32(11);
    const n = 2000;
    let stand = 0;
    for (let i = 0; i < n; i++) if (pickChore('watch', null, true, rng) === 'stand') stand++;
    const w = CHORE_WEIGHTS.watch!;
    const share = w.stand! / Object.values(w).reduce((a, b) => a + b!, 0);
    expect(stand / n).toBeGreaterThan(share - 0.05);
    expect(stand / n).toBeLessThan(share + 0.05);
  });

  it('captions name the hero', () => {
    expect(choreCaption('tend', 'Aldric')).toContain('Aldric');
    expect(choreCaption('pet', 'Aldric', 'the raven')).toContain('the raven');
  });
});
