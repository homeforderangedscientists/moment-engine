import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

export function evaluateRule(
  _rule: Rule,
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Instant | null {
  throw new Error('evaluateRule: not implemented');
}
