import type { Duration, Instant, Milestone } from './types.js';

export function findReferenceMilestone(milestones: Milestone[]): Milestone | null {
  return milestones.find((m) => m.is_reference === true) ?? null;
}

export function computeReferenceSpan(now: Instant, milestones: Milestone[]): Duration | null {
  const ref = findReferenceMilestone(milestones);
  return ref ? now - ref.date : null;
}
