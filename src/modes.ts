import type { Duration, EngineConfig, Instant, RenderingMode } from './types.js';

const NOW_EPSILON_MS = 1000;

export function selectRenderingMode(
  start: Instant,
  end: Instant,
  now: Instant,
  referenceSpan: Duration,
  config?: EngineConfig,
): RenderingMode {
  if (Math.abs(end - now) < NOW_EPSILON_MS) return 'duration';
  const threshold = config?.scale_mode_threshold ?? 100;
  const ratio = (end - start) / referenceSpan;
  if (ratio > threshold) return 'scale';
  return 'position';
}
