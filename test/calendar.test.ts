import { describe, it, expect } from 'vitest';
import { calendarPeriodStart } from '../src/calendar.js';

describe('calendarPeriodStart', () => {
  it('hour: floors to top of hour (UTC)', () => {
    const t = Date.UTC(2026, 3, 18, 12, 34, 56, 789);
    expect(calendarPeriodStart(t, 'hour', 'UTC', 'monday')).toBe(
      Date.UTC(2026, 3, 18, 12, 0, 0, 0),
    );
  });

  it('day: floors to local midnight in timezone', () => {
    // 2026-04-18 02:30 UTC is 2026-04-17 22:30 America/New_York (EDT)
    const t = Date.UTC(2026, 3, 18, 2, 30);
    // Local midnight NY on 2026-04-17 = 04:00 UTC (EDT = UTC-4)
    expect(calendarPeriodStart(t, 'day', 'America/New_York', 'monday')).toBe(
      Date.UTC(2026, 3, 17, 4, 0, 0, 0),
    );
  });

  it('week (ISO/monday): 2026-04-18 is Saturday, week starts Monday 2026-04-13', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'week', 'UTC', 'monday')).toBe(Date.UTC(2026, 3, 13, 0, 0, 0, 0));
  });

  it('week (sunday start): 2026-04-18 Saturday → week starts 2026-04-12', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'week', 'UTC', 'sunday')).toBe(Date.UTC(2026, 3, 12, 0, 0, 0, 0));
  });

  it('month: 1st day of month at local midnight', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'month', 'UTC', 'monday')).toBe(Date.UTC(2026, 3, 1, 0, 0, 0, 0));
  });

  it('year: Jan 1 at local midnight', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'year', 'UTC', 'monday')).toBe(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
  });

  it('decade: floor to decade start (2020)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'decade', 'UTC', 'monday')).toBe(
      Date.UTC(2020, 0, 1, 0, 0, 0, 0),
    );
  });

  it('century: floor to century start (2000)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'century', 'UTC', 'monday')).toBe(
      Date.UTC(2000, 0, 1, 0, 0, 0, 0),
    );
  });

  it('millennium: floor to millennium start (2000)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'millennium', 'UTC', 'monday')).toBe(
      Date.UTC(2000, 0, 1, 0, 0, 0, 0),
    );
  });
});
