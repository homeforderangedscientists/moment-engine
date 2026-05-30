import type { Duration, Instant, Milestone } from './types.js';

export function findReferenceMilestone(milestones: Milestone[]): Milestone | null {
  return milestones.find((m) => m.is_reference === true) ?? null;
}

export function computeReferenceSpan(now: Instant, milestones: Milestone[]): Duration | null {
  const ref = findReferenceMilestone(milestones);
  if (!ref) return null;
  const span = now - ref.date;
  // A reference span is "life so far" — it must be positive to be usable as a
  // denominator. A reference milestone at or in the future of `now` yields a
  // non-positive span, which is not a meaningful reference; signal with null.
  return span > 0 ? span : null;
}
