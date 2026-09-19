import type { Fixture, LeagueRow, Team } from '../types'
import { SeededRandom } from './random'
import { winProbability } from './ratings'

interface TeamStats {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
}

function emptyStats(): TeamStats {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 }
}

function applyResult(stats: TeamStats, goalsFor: number, goalsAgainst: number) {
  stats.played++
  stats.gf += goalsFor
  stats.ga += goalsAgainst
  if (goalsFor > goalsAgainst) stats.won++
  else if (goalsFor === goalsAgainst) stats.drawn++
  else stats.lost++
}

export function scoreline(rng: SeededRandom, winner: boolean, draw: boolean): [number, number] {
  if (draw) {
    const g = rng.int(0, 2)
    return [g, g]
  }
  const winnerGoals = rng.int(1, 3)
  const loserGoals = rng.int(0, Math.max(0, winnerGoals - 1))
  return winner ? [winnerGoals, loserGoals] : [loserGoals, winnerGoals]
}

/**
 * Simulates a round-robin among the AI teams (Appendix D.2) so their
 * standings are internally consistent — they beat and lose to each other,
 * not independent win totals. Deterministic from `seed`.
 */
export function simulateAiStandings(seed: string, teams: Team[], rounds = 8): Map<string, TeamStats> {
  const rng = new SeededRandom(`league:${seed}`)
  const stats = new Map<string, TeamStats>()
  for (const t of teams) stats.set(t.id, emptyStats())

  for (let round = 0; round < rounds; round++) {
    const shuffled = [...teams]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.int(0, i)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const a = shuffled[i]
      const b = shuffled[i + 1]
      const drawChance = 0.24
      const isDraw = rng.chance(drawChance)
      const aWins = !isDraw && rng.chance(winProbability(a.overall, b.overall))
      const [aGoals, bGoals] = scoreline(rng, aWins, isDraw)
      applyResult(stats.get(a.id)!, aGoals, bGoals)
      applyResult(stats.get(b.id)!, bGoals, aGoals)
    }
  }
  return stats
}

export function buildLeagueTable(
  seed: string,
  teams: Team[],
  userTeamName: string,
  userAccentColor: string,
  userFixtures: Fixture[],
): LeagueRow[] {
  const userStats = emptyStats()
  for (const f of userFixtures) {
    if (!f.result) continue
    applyResult(userStats, f.result.userGoals, f.result.oppGoals)
  }

  // Keep the AI teams' games-played roughly in step with the user's own, so
  // the table reads as a fair snapshot rather than the user looking buried
  // under 35 teams who have each played a full 8-game schedule already.
  const rounds = Math.max(1, userStats.played)
  const aiStats = simulateAiStandings(seed, teams, rounds)

  const rows: LeagueRow[] = teams.map((t) => {
    const s = aiStats.get(t.id)!
    return {
      teamId: t.id,
      teamName: t.name,
      accentColor: t.accentColor,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.gf,
      goalsAgainst: s.ga,
      points: s.won * 3 + s.drawn,
    }
  })

  rows.push({
    teamId: 'user',
    teamName: userTeamName,
    accentColor: userAccentColor,
    played: userStats.played,
    won: userStats.won,
    drawn: userStats.drawn,
    lost: userStats.lost,
    goalsFor: userStats.gf,
    goalsAgainst: userStats.ga,
    points: userStats.won * 3 + userStats.drawn,
  })

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    return b.goalsFor - a.goalsFor
  })
}
