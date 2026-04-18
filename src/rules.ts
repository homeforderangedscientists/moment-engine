import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

export function evaluateRule(
  rule: Rule,
  now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Instant | null {
  switch (rule.type) {
    case 'absolute':
      return rule.date;
    case 'now':
      return now;
    default:
      throw new Error(`evaluateRule: ${rule.type} not implemented`);
  }
}
