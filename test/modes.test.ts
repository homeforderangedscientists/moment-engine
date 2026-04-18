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

  it('returns scale when ratio exceeds threshold', () => {
    const hugeContainer = 1e6 * YEAR;
    expect(selectRenderingMode(NOW - hugeContainer, NOW + YEAR, NOW, 35 * YEAR)).toBe('scale');
  });

  it('returns position when ratio within threshold', () => {
    expect(selectRenderingMode(NOW - YEAR, NOW + YEAR, NOW, 35 * YEAR)).toBe('position');
  });

  it('boundary: ratio exactly at threshold → position (strict greater-than)', () => {
    const span = 10 * YEAR;
    // container duration = 100 * span → ratio = 100
    const end = NOW + YEAR;
    const start = end - 100 * span;
    expect(selectRenderingMode(start, end, NOW, span, { scale_mode_threshold: 100 })).toBe(
      'position',
    );
  });

  it('boundary: ratio slightly above threshold → scale', () => {
    const span = 10 * YEAR;
    const end = NOW + YEAR;
    const start = end - (100 * span + 1);
    expect(selectRenderingMode(start, end, NOW, span, { scale_mode_threshold: 100 })).toBe('scale');
  });
});
