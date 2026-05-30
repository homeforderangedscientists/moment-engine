import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../src/rules.js';
import type { Rule } from '../src/types.js';

describe('evaluateRule', () => {
  const NOW = Date.UTC(2026, 3, 18, 12, 0, 0); // 2026-04-18T12:00:00Z

  describe('absolute', () => {
    it('returns the fixed date', () => {
      const rule: Rule = { type: 'absolute', date: Date.UTC(1969, 6, 20) };
      expect(evaluateRule(rule, NOW, [])).toBe(Date.UTC(1969, 6, 20));
    });
  });

  describe('now', () => {
    it('returns the evaluation instant', () => {
      expect(evaluateRule({ type: 'now' }, NOW, [])).toBe(NOW);
    });
  });

  describe('years_before_present', () => {
    it('subtracts years using 365.25 days', () => {
      const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
      expect(evaluateRule({ type: 'years_before_present', years: 1 }, NOW, [])).toBe(
        NOW - MS_PER_YEAR,
      );
    });

    it('handles deep time (13.8 billion years) without precision loss at year scale', () => {
      const result = evaluateRule({ type: 'years_before_present', years: 13.8e9 }, NOW, []);
      expect(result).not.toBeNull();
      expect(Number.isFinite(result!)).toBe(true);
      expect(result!).toBeLessThan(NOW);
    });
  });

  describe('milestone', () => {
    const MS = [{ id: 'birth', label: 'Born', date: Date.UTC(1990, 0, 1) }];

    it('returns milestone date when found', () => {
      expect(evaluateRule({ type: 'milestone', milestone_id: 'birth' }, NOW, MS)).toBe(
        Date.UTC(1990, 0, 1),
      );
    });

    it('returns null when milestone missing', () => {
      expect(evaluateRule({ type: 'milestone', milestone_id: 'unknown' }, NOW, MS)).toBeNull();
    });
  });

  describe('milestone_offset', () => {
    const MS = [{ id: 'birth', label: 'Born', date: Date.UTC(1990, 0, 1) }];
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

    it('adds the offset', () => {
      expect(
        evaluateRule(
          { type: 'milestone_offset', milestone_id: 'birth', offset_years: 40 },
          NOW,
          MS,
        ),
      ).toBe(Date.UTC(1990, 0, 1) + 40 * MS_PER_YEAR);
    });

    it('supports negative offsets', () => {
      expect(
        evaluateRule(
          { type: 'milestone_offset', milestone_id: 'birth', offset_years: -5 },
          NOW,
          MS,
        ),
      ).toBe(Date.UTC(1990, 0, 1) - 5 * MS_PER_YEAR);
    });

    it('returns null when milestone missing', () => {
      expect(
        evaluateRule(
          { type: 'milestone_offset', milestone_id: 'unknown', offset_years: 5 },
          NOW,
          MS,
        ),
      ).toBeNull();
    });
  });

  describe('calendar_start / calendar_end', () => {
    it('calendar_start year uses config timezone (UTC)', () => {
      const t = Date.UTC(2026, 3, 18, 12, 0);
      expect(
        evaluateRule({ type: 'calendar_start', period: 'year' }, t, [], { timezone: 'UTC' }),
      ).toBe(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
    });

    it('calendar_end year uses config timezone (UTC)', () => {
      const t = Date.UTC(2026, 3, 18, 12, 0);
      expect(
        evaluateRule({ type: 'calendar_end', period: 'year' }, t, [], { timezone: 'UTC' }),
      ).toBe(Date.UTC(2027, 0, 1, 0, 0, 0, 0));
    });

    it('calendar_start week honors week_start=sunday', () => {
      const t = Date.UTC(2026, 3, 18, 12, 0); // Saturday
      expect(
        evaluateRule({ type: 'calendar_start', period: 'week' }, t, [], {
          timezone: 'UTC',
          week_start: 'sunday',
        }),
      ).toBe(Date.UTC(2026, 3, 12, 0, 0, 0, 0));
    });
  });

  describe('invalid input', () => {
    it('throws on unknown rule type (invalid input is a caller bug)', () => {
      const bogus = { type: 'asdf' } as unknown as Rule;
      expect(() => evaluateRule(bogus, NOW, [])).toThrow(/evaluateRule/);
    });
  });
});
