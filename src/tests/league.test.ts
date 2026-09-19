import { describe, expect, it } from 'vitest'
import { buildLeagueTable, simulateAiStandings } from '../engine/league'
import teamsData from '../data/teams.json'
import type { Fixture, Team } from '../types'

const teams = teamsData.teams as unknown as Team[]

describe('league simulation (Appendix D.2)', () => {
  it('no AI team wins every game (round-robin, not independent totals)', () => {
    const stats = simulateAiStandings('league-seed-1', teams, 8)
    const anyUndefeatedAndAllWins = [...stats.values()].some((s) => s.played > 0 && s.won === s.played && s.played >= 6)
    expect(anyUndefeatedAndAllWins).toBe(false)
  })

  it('is deterministic for the same seed', () => {
    const a = simulateAiStandings('same-seed', teams, 8)
    const b = simulateAiStandings('same-seed', teams, 8)
    for (const t of teams) {
      expect(a.get(t.id)).toEqual(b.get(t.id))
    }
  })

  it('builds a sorted table with the user included', () => {
    const fixtures: Fixture[] = [
      { n: 1, opponentId: teams[0].id, venue: 'HOME', result: { userGoals: 2, oppGoals: 1, decisions: [], ambientEvents: [] } },
      { n: 2, opponentId: teams[1].id, venue: 'AWAY', result: { userGoals: 1, oppGoals: 1, decisions: [], ambientEvents: [] } },
    ]
    const rows = buildLeagueTable('table-seed', teams, 'Your Squad', '#e8b93f', fixtures)
    expect(rows).toHaveLength(teams.length + 1)
    const userRow = rows.find((r) => r.teamId === 'user')!
    expect(userRow.played).toBe(2)
    expect(userRow.points).toBe(4) // 1 win (3) + 1 draw (1)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].points).toBeGreaterThanOrEqual(rows[i].points)
    }
  })
})
