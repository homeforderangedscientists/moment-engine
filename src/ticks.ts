import type { Duration, TickRate } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * DAY_MS;
const CENTURY_MS = 100 * YEAR_MS;

export function computeTickRate(containerDuration: Duration): TickRate {
  if (containerDuration < DAY_MS) return 'high';
  if (containerDuration < YEAR_MS) return 'medium';
  if (containerDuration < CENTURY_MS) return 'low';
  return 'static';
}

export function tickRateToInterval(tickRate: TickRate): number {
  switch (tickRate) {
    case 'high':
      return 5_000;
    case 'medium':
      return 60_000;
    case 'low':
      return 3_600_000;
    case 'static':
      return Infinity;
  }
}
