import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function evaluateRule(
  rule: Rule,
  now: Instant,
  milestones: Milestone[],
  _config?: EngineConfig,
): Instant | null {
  switch (rule.type) {
    case 'absolute':
      return rule.date;
    case 'now':
      return now;
    case 'years_before_present':
      return now - rule.years * MS_PER_YEAR;
    case 'milestone': {
      const m = milestones.find((x) => x.id === rule.milestone_id);
      return m ? m.date : null;
    }
    default:
      throw new Error(`evaluateRule: ${rule.type} not implemented`);
  }
}
