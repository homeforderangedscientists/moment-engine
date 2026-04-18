import type { CalendarPeriod, Instant } from './types.js';

type WeekStart = 'sunday' | 'monday';

interface Parts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 1=Mon..7=Sun (ISO)
}

function getParts(t: Instant, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(new Date(t));
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: weekdayMap[p.weekday ?? 'Mon'] ?? 1,
  };
}

// Find the UTC instant whose local time in `timeZone` matches the given parts.
// Two-pass correction handles DST transitions.
function partsToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Instant {
  let naive = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  for (let i = 0; i < 2; i++) {
    const observed = getParts(naive, timeZone);
    const observedNaive = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = target - observedNaive;
    if (delta === 0) return naive;
    naive += delta;
  }
  return naive;
}

export function calendarPeriodStart(
  now: Instant,
  period: CalendarPeriod,
  timeZone: string,
  weekStart: WeekStart,
): Instant {
  const p = getParts(now, timeZone);
  switch (period) {
    case 'hour':
      return partsToInstant(p.year, p.month, p.day, p.hour, 0, 0, timeZone);
    case 'day':
      return partsToInstant(p.year, p.month, p.day, 0, 0, 0, timeZone);
    case 'week': {
      // weekday: 1=Mon..7=Sun
      const daysFromStart = weekStart === 'monday' ? p.weekday - 1 : p.weekday % 7;
      const dayStart = partsToInstant(p.year, p.month, p.day, 0, 0, 0, timeZone);
      const DAY_MS = 24 * 60 * 60 * 1000;
      return dayStart - daysFromStart * DAY_MS;
    }
    case 'month':
      return partsToInstant(p.year, p.month, 1, 0, 0, 0, timeZone);
    case 'year':
      return partsToInstant(p.year, 1, 1, 0, 0, 0, timeZone);
    case 'decade': {
      const decadeStart = Math.floor(p.year / 10) * 10;
      return partsToInstant(decadeStart, 1, 1, 0, 0, 0, timeZone);
    }
    case 'century': {
      const centuryStart = Math.floor(p.year / 100) * 100;
      return partsToInstant(centuryStart, 1, 1, 0, 0, 0, timeZone);
    }
    case 'millennium': {
      const millenniumStart = Math.floor(p.year / 1000) * 1000;
      return partsToInstant(millenniumStart, 1, 1, 0, 0, 0, timeZone);
    }
  }
}

export function calendarPeriodEnd(
  now: Instant,
  period: CalendarPeriod,
  timeZone: string,
  weekStart: WeekStart,
): Instant {
  // End = start of next period.
  const start = calendarPeriodStart(now, period, timeZone, weekStart);
  const p = getParts(start, timeZone);
  switch (period) {
    case 'hour':
      return partsToInstant(p.year, p.month, p.day, p.hour + 1, 0, 0, timeZone);
    case 'day':
      return partsToInstant(p.year, p.month, p.day + 1, 0, 0, 0, timeZone);
    case 'week': {
      const DAY_MS = 24 * 60 * 60 * 1000;
      return start + 7 * DAY_MS;
    }
    case 'month':
      return partsToInstant(p.year, p.month + 1, 1, 0, 0, 0, timeZone);
    case 'year':
      return partsToInstant(p.year + 1, 1, 1, 0, 0, 0, timeZone);
    case 'decade':
      return partsToInstant(p.year + 10, 1, 1, 0, 0, 0, timeZone);
    case 'century':
      return partsToInstant(p.year + 100, 1, 1, 0, 0, 0, timeZone);
    case 'millennium':
      return partsToInstant(p.year + 1000, 1, 1, 0, 0, 0, timeZone);
  }
}
