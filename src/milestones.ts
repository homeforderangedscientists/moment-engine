import type { Duration, Instant, Milestone } from './types.js';

export function findReferenceMilestone(_milestones: Milestone[]): Milestone | null {
  throw new Error('findReferenceMilestone: not implemented');
}

export function computeReferenceSpan(_now: Instant, _milestones: Milestone[]): Duration | null {
  throw new Error('computeReferenceSpan: not implemented');
}
