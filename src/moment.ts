import type { Container, EngineConfig, Instant, Milestone, Moment } from './types.js';
import { evaluateRule } from './rules.js';
import { selectRenderingMode } from './modes.js';
import { computeTickRate } from './ticks.js';
import { computeReferenceSpan } from './milestones.js';

const DEFAULT_FALLBACK_SPAN = 30 * 365.25 * 24 * 60 * 60 * 1000;

export function computeMoment<M>(
  container: Container<M>,
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M> | null {
  const start = evaluateRule(container.start, now, milestones, config);
  const end = evaluateRule(container.end, now, milestones, config);
  if (start === null || end === null) return null;

  const container_duration = end - start;
  const ref = computeReferenceSpan(now, milestones);
  const reference_span = ref ?? config?.fallback_reference_span ?? DEFAULT_FALLBACK_SPAN;

  const rendering_mode = selectRenderingMode(start, end, now, reference_span, config);

  const position =
    container_duration === 0 ? 1 : Math.max(0, Math.min(1, (now - start) / container_duration));

  let fraction: number;
  switch (rendering_mode) {
    case 'position':
      fraction = position;
      break;
    case 'scale':
      fraction = reference_span / container_duration;
      break;
    case 'duration':
      fraction = container_duration / reference_span;
      break;
  }

  return {
    container_id: container.id,
    start,
    end,
    container_duration,
    position,
    fraction,
    rendering_mode,
    tick_rate: computeTickRate(container_duration),
    reference_span: ref,
    ...(container.metadata !== undefined && { metadata: container.metadata }),
  };
}

export function computeMoments<M>(
  containers: Container<M>[],
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M>[] {
  const out: Moment<M>[] = [];
  for (const c of containers) {
    const m = computeMoment(c, now, milestones, config);
    if (m !== null) out.push(m);
  }
  return out;
}
