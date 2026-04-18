import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { computeMoment, computeMoments } from '../src/moment.js';
import type { Container } from '../src/types.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const YEAR = 365.25 * 24 * 60 * 60 * 1000;

describe('computeMoment — position mode', () => {
  it('computes bounds, position, fraction, tick for "this year"', () => {
    const now = Date.UTC(2026, 6, 1); // July 1 — roughly halfway through the year
    const c: Container = {
      id: 'this-year',
      start: { type: 'calendar_start', period: 'year' },
      end: { type: 'calendar_end', period: 'year' },
    };
    const m = computeMoment(c, now, [], { timezone: 'UTC' });
    expect(m).not.toBeNull();
    expect(m!.container_id).toBe('this-year');
    expect(m!.start).toBe(Date.UTC(2026, 0, 1));
    expect(m!.end).toBe(Date.UTC(2027, 0, 1));
    expect(m!.container_duration).toBe(m!.end - m!.start);
    expect(m!.position).toBeGreaterThan(0.45);
    expect(m!.position).toBeLessThan(0.55);
    expect(m!.fraction).toBe(m!.position);
    expect(m!.rendering_mode).toBe('position');
    expect(m!.tick_rate).toBe('medium');
    expect(m!.reference_span).toBeNull();
  });
});
