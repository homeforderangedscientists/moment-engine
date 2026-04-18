import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { findReferenceMilestone, computeReferenceSpan } from '../src/milestones.js';
import type { Milestone } from '../src/types.js';

describe('findReferenceMilestone', () => {
  it('returns the milestone with is_reference=true', () => {
    const ms: Milestone[] = [
      { id: 'a', label: 'A', date: 1 },
      { id: 'b', label: 'B', date: 2, is_reference: true },
    ];
    expect(findReferenceMilestone(ms)).toEqual(ms[1]);
  });

  it('returns null when no reference present', () => {
    expect(findReferenceMilestone([{ id: 'a', label: 'A', date: 1 }])).toBeNull();
  });

  it('returns the first when multiple are flagged', () => {
    const ms: Milestone[] = [
      { id: 'a', label: 'A', date: 1, is_reference: true },
      { id: 'b', label: 'B', date: 2, is_reference: true },
    ];
    expect(findReferenceMilestone(ms)?.id).toBe('a');
  });
});
