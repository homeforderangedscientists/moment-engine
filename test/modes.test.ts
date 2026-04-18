import { describe, it, expect } from 'vitest';
import { selectRenderingMode } from '../src/modes.js';

describe('selectRenderingMode', () => {
  const NOW = Date.UTC(2026, 3, 18);
  const YEAR = 365.25 * 24 * 60 * 60 * 1000;

  it('returns duration when end === now', () => {
    expect(selectRenderingMode(NOW - 10 * YEAR, NOW, NOW, 35 * YEAR)).toBe('duration');
  });

  it('treats near-now within 1s as duration', () => {
    expect(selectRenderingMode(NOW - 10 * YEAR, NOW - 500, NOW, 35 * YEAR)).toBe('duration');
  });
});
