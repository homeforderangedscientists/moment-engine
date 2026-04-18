import type { Duration, TickRate } from './types.js';

export function computeTickRate(_containerDuration: Duration): TickRate {
  throw new Error('computeTickRate: not implemented');
}

export function tickRateToInterval(_tickRate: TickRate): number {
  throw new Error('tickRateToInterval: not implemented');
}
