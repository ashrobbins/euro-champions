import type { SeededRandom } from './random'

/**
 * P(success) = 1 / (1 + 10^(-(ratingA - ratingB) / K))
 * Per plan doc Appendix D. K calibrated so a 14-point overall gap wins
 * roughly 75-85% of the time on a single high-stakes roll, not near-certain.
 * (K=10 was the original placeholder but actually produces ~96% at a 14-point
 * gap — this is what made the opponent nearly unable to score in testing
 * against a legend-heavy squad. K=20 lands a 14-point gap at ~83%.)
 */
export const K = 20

/** Away teams take a small negative adjustment to their effective rating (Appendix D.1). */
export const AWAY_PENALTY = 4

export function winProbability(ratingA: number, ratingB: number, k: number = K): number {
  return 1 / (1 + Math.pow(10, -(ratingA - ratingB) / k))
}

export function resolve(rng: SeededRandom, ratingA: number, ratingB: number): boolean {
  return rng.chance(winProbability(ratingA, ratingB))
}
