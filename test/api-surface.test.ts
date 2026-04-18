import { describe, it, expect } from 'vitest';
import * as api from '../src/index.js';

describe('public API surface', () => {
  it('exports exactly the documented names', () => {
    const exported = Object.keys(api).sort();
    expect(exported).toEqual(
      [
        'computeMoment',
        'computeMoments',
        'computeReferenceSpan',
        'computeTickRate',
        'evaluateRule',
        'findReferenceMilestone',
        'selectRenderingMode',
        'tickRateToInterval',
      ].sort(),
    );
  });
});
