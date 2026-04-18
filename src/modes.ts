import type { Duration, EngineConfig, Instant, RenderingMode } from './types.js';

export function selectRenderingMode(
  _start: Instant,
  _end: Instant,
  _now: Instant,
  _referenceSpan: Duration,
  _config?: EngineConfig,
): RenderingMode {
  throw new Error('selectRenderingMode: not implemented');
}
