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
});
