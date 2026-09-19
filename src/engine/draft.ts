import type { DraftSlot, Player, Squad } from '../types'
import { DRAFT_SLOTS } from '../types'
import playersData from '../data/players.json'
import { SeededRandom } from './random'

const ALL_PLAYERS = (playersData.players as unknown as Player[])

/** How many of the (much larger) pool at a position are actually offered in the draft. */
export const CANDIDATES_SHOWN = 5

/**
 * A random 5-player slice of the full pool at this position, deterministic for a given seed
 * (e.g. the day) so the same 5 show up on every render and every visit to this step, but a
 * different 5 appear on a different day/seed. The full pool is much larger — this keeps the
 * draft feeling fresh across days without listing all 30 candidates every time.
 */
export function candidatesFor(slot: DraftSlot, seed: string): Player[] {
  const pool = ALL_PLAYERS.filter((p) => p.position === slot)
  const rng = new SeededRandom(`draft-candidates:${seed}:${slot}`)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, CANDIDATES_SHOWN)
}

export function findPlayer(id: string): Player {
  const p = ALL_PLAYERS.find((p) => p.id === id)
  if (!p) throw new Error(`Unknown player id: ${id}`)
  return p
}

export function isValidSquad(squad: Partial<Squad>): squad is Squad {
  return !DRAFT_SLOTS.some((slot) => !squad[slot])
}

export function squadPlayers(squad: Squad): Player[] {
  return DRAFT_SLOTS.map((slot) => findPlayer(squad[slot]))
}

export function squadOverall(squad: Squad): number {
  const players = squadPlayers(squad)
  return Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length)
}
