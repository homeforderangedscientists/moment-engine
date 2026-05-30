import { describe, it, expect } from 'vitest';
import { computeTickRate, tickRateToInterval } from '../src/ticks.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
const CENTURY = 100 * YEAR;

describe('computeTickRate', () => {
  it('< 1 day → high', () => {
    expect(computeTickRate(HOUR)).toBe('high');
    expect(computeTickRate(DAY - 1)).toBe('high');
  });
  it('< 1 year → medium', () => {
    expect(computeTickRate(DAY)).toBe('medium');
    expect(computeTickRate(YEAR - 1)).toBe('medium');
  });
  it('< 1 century → low', () => {
    expect(computeTickRate(YEAR)).toBe('low');
    expect(computeTickRate(CENTURY - 1)).toBe('low');
  });
  it('≥ 1 century → static', () => {
    expect(computeTickRate(CENTURY)).toBe('static');
    expect(computeTickRate(13.8e9 * YEAR)).toBe('static');
  });
});

describe('tickRateToInterval', () => {
  it('maps to documented defaults', () => {
    expect(tickRateToInterval('high')).toBe(5_000);
    expect(tickRateToInterval('medium')).toBe(60_000);
    expect(tickRateToInterval('low')).toBe(3_600_000);
    expect(tickRateToInterval('static')).toBe(Infinity);
  });
});
