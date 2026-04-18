import type { Container, EngineConfig, Instant, Milestone, Moment } from './types.js';

export function computeMoment<M>(
  _container: Container<M>,
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Moment<M> | null {
  throw new Error('computeMoment: not implemented');
}

export function computeMoments<M>(
  _containers: Container<M>[],
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Moment<M>[] {
  throw new Error('computeMoments: not implemented');
}
