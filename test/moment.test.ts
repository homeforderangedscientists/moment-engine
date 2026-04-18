import { describe, it, expect } from 'vitest';
import { computeMoment, computeMoments } from '../src/moment.js';
import type { Container } from '../src/types.js';

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

describe('computeMoment — scale & duration modes', () => {
  it('end=now → duration mode, fraction = container / life', () => {
    const now = Date.UTC(2026, 3, 18);
    const birth = now - 35 * YEAR;
    const c: Container = {
      id: 'since-universe',
      start: { type: 'years_before_present', years: 13.8e9 },
      end: { type: 'now' },
    };
    const m = computeMoment(c, now, [
      { id: 'birth', label: 'Born', date: birth, is_reference: true },
    ]);
    expect(m).not.toBeNull();
    expect(m!.rendering_mode).toBe('duration');
    // Duration mode: fraction = container / reference_span (per PRD in types.ts).
    // For edge cases like big-bang-to-now where container >> life, the resulting
    // value is large; consumers are expected to format accordingly.
    expect(m!.fraction).toBeCloseTo(m!.container_duration / (35 * YEAR), 6);
  });

  it('deep past, end far from now → scale mode, fraction = life / container', () => {
    const now = Date.UTC(2026, 3, 18);
    const birth = now - 35 * YEAR;
    const c: Container = {
      id: 'since-big-bang-to-next-year',
      start: { type: 'years_before_present', years: 13.8e9 },
      end: { type: 'absolute', date: now + YEAR },
    };
    const m = computeMoment(c, now, [
      { id: 'birth', label: 'Born', date: birth, is_reference: true },
    ]);
    expect(m!.rendering_mode).toBe('scale');
    expect(m!.fraction).toBeCloseTo((35 * YEAR) / m!.container_duration, 12);
  });
});

describe('computeMoment — metadata & unresolvable', () => {
  it('passes through metadata unchanged', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container<{ label: string }> = {
      id: 'hour',
      start: { type: 'calendar_start', period: 'hour' },
      end: { type: 'calendar_end', period: 'hour' },
      metadata: { label: 'This hour' },
    };
    const m = computeMoment(c, now, [], { timezone: 'UTC' });
    expect(m!.metadata).toEqual({ label: 'This hour' });
  });

  it('returns null when start rule unresolvable', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container = {
      id: 'x',
      start: { type: 'milestone', milestone_id: 'missing' },
      end: { type: 'now' },
    };
    expect(computeMoment(c, now, [])).toBeNull();
  });

  it('returns null when end rule unresolvable', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container = {
      id: 'x',
      start: { type: 'now' },
      end: { type: 'milestone', milestone_id: 'missing' },
    };
    expect(computeMoment(c, now, [])).toBeNull();
  });
});

describe('computeMoments', () => {
  it('preserves order, filters nulls', () => {
    const now = Date.UTC(2026, 3, 18);
    const cs: Container[] = [
      {
        id: 'a',
        start: { type: 'calendar_start', period: 'year' },
        end: { type: 'calendar_end', period: 'year' },
      },
      {
        id: 'b',
        start: { type: 'milestone', milestone_id: 'missing' },
        end: { type: 'now' },
      },
      {
        id: 'c',
        start: { type: 'calendar_start', period: 'day' },
        end: { type: 'calendar_end', period: 'day' },
      },
    ];
    const ms = computeMoments(cs, now, [], { timezone: 'UTC' });
    expect(ms.map((m) => m.container_id)).toEqual(['a', 'c']);
  });
});
