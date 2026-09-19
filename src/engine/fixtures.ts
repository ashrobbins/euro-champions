import type { Fixture, Team } from '../types'
import { SeededRandom } from './random'

/** 8 group fixtures, always 4 home and 4 away (plan §10.1), deterministic from seed. */
export function generateFixtures(seed: string, teams: Team[]): Fixture[] {
  const rng = new SeededRandom(`fixtures:${seed}`)

  const pool = [...teams]
  const opponents: Team[] = []
  for (let i = 0; i < 8 && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1)
    opponents.push(pool[idx])
    pool.splice(idx, 1)
  }

  const venues: Array<'HOME' | 'AWAY'> = [
    'HOME', 'AWAY', 'HOME', 'AWAY', 'HOME', 'AWAY', 'HOME', 'AWAY',
  ]
  // Shuffle the venue slots (Fisher-Yates) so home/away isn't always alternating in fixture order.
  for (let i = venues.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[venues[i], venues[j]] = [venues[j], venues[i]]
  }

  return opponents.map((opp, i) => ({
    n: i + 1,
    opponentId: opp.id,
    venue: venues[i],
    result: null,
  }))
}
