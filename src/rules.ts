import { calendarPeriodEnd, calendarPeriodStart } from './calendar.js';
import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function resolveTimezone(config?: EngineConfig): string {
  return config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function resolveWeekStart(config?: EngineConfig): 'sunday' | 'monday' {
  return config?.week_start ?? 'monday';
}

export function evaluateRule(
  rule: Rule,
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
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
    case 'milestone_offset': {
      const m = milestones.find((x) => x.id === rule.milestone_id);
      return m ? m.date + rule.offset_years * MS_PER_YEAR : null;
    }
    case 'calendar_start':
      return calendarPeriodStart(
        now,
        rule.period,
        resolveTimezone(config),
        resolveWeekStart(config),
      );
    case 'calendar_end':
      return calendarPeriodEnd(now, rule.period, resolveTimezone(config), resolveWeekStart(config));
    default: {
      const _exhaustive: never = rule;
      throw new Error(`evaluateRule: unknown rule type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
