import { describe, expect, it } from 'vitest'
import { squadPlayers } from '../engine/draft'
import { EVENT_POOL } from '../engine/events'
import { MAX_DECISIONS, MIN_DECISIONS, MatchEngine, pickEvents } from '../engine/simulation'
import { SeededRandom } from '../engine/random'
import teamsData from '../data/teams.json'
import type { Squad, Team } from '../types'

const teams = teamsData.teams as unknown as Team[]
const opponent = teams.find((t) => t.name === 'AC Milan')!

const squad: Squad = { GK: 'kahn', DEF: 'maldini', MID: 'zidane', ATT: 'saviola', FLEX: 'parkjs' }

function playSameMatch(seed: string, choices: (0 | 1 | 2)[]) {
  const rng = new SeededRandom(seed)
  const engine = new MatchEngine(rng, squadPlayers(squad), opponent, 'balanced', true)
  let i = 0
  while (!engine.isComplete()) {
    engine.resolveChoice(choices[i] ?? 0)
    i++
  }
  return engine.result()
}

describe('match simulation (§13.2, §13.3, acceptance criteria)', () => {
  it('draws the requested number of distinct events, each with 3 choices', () => {
    const rng = new SeededRandom('seed-events')
    const events = pickEvents(rng, 0, 6)
    expect(events).toHaveLength(6)
    for (const e of events) {
      expect(e.choices).toHaveLength(3)
    }
    const ids = new Set(events.map((e) => e.id))
    expect(ids.size).toBe(6) // no repeats within a match
  })

  it('varies decisions per match between 4 and 7, not always exactly 6', () => {
    const counts = new Set<number>()
    for (let s = 0; s < 100; s++) {
      const rng = new SeededRandom(`decision-count-seed-${s}`)
      const engine = new MatchEngine(rng, squadPlayers(squad), opponent, 'balanced', true)
      expect(engine.eventQueue.length).toBeGreaterThanOrEqual(MIN_DECISIONS)
      expect(engine.eventQueue.length).toBeLessThanOrEqual(MAX_DECISIONS)
      counts.add(engine.eventQueue.length)
    }
    // Over 100 seeds, expect to see more than just one fixed value.
    expect(counts.size).toBeGreaterThan(1)
  })

  it('is deterministic: same seed + squad + opponent + tactic + choices -> same result', () => {
    const choices: (0 | 1 | 2)[] = [0, 1, 2, 0, 1, 2]
    const resultA = playSameMatch('fixed-seed-123', choices)
    const resultB = playSameMatch('fixed-seed-123', choices)
    expect(resultA).toEqual(resultB)
  })

  it('different choices on the same seed can change the outcome', () => {
    // Not a strict guarantee for every seed, but over many seeds at least one should differ.
    let sawDifference = false
    for (let s = 0; s < 25; s++) {
      const seed = `variance-seed-${s}`
      const a = playSameMatch(seed, [0, 0, 0, 0, 0, 0])
      const b = playSameMatch(seed, [2, 2, 2, 2, 2, 2])
      if (a.userGoals !== b.userGoals || a.oppGoals !== b.oppGoals) {
        sawDifference = true
        break
      }
    }
    expect(sawDifference).toBe(true)
  })

  it('most events (9 of 10) can directly produce a goal, not just late_tactic-style momentum', () => {
    const scoringEventIds = new Set<string>()
    // late_tactic's new gating (only the last decision slot, ~55% of matches, never when
    // way ahead) also thins out how often the OTHER events land in a scoring slot within
    // the sample, so this needs enough seeds to reliably cover all 9.
    for (let s = 0; s < 400; s++) {
      const rng = new SeededRandom(`goal-coverage-seed-${s}`)
      const engine = new MatchEngine(rng, squadPlayers(squad), opponent, 'balanced', true)
      while (!engine.isComplete()) {
        const event = engine.currentEvent()!
        const before = engine.userGoals + engine.oppGoals
        engine.resolveChoice(0)
        const after = engine.userGoals + engine.oppGoals
        if (after !== before) scoringEventIds.add(event.id)
      }
    }
    // late_tactic is the one deliberately non-scoring "game management" event.
    expect(scoringEventIds.size).toBeGreaterThanOrEqual(9)
    expect(scoringEventIds.has('late_tactic')).toBe(false)
    for (const e of EVENT_POOL) {
      if (e.id === 'late_tactic') continue
      expect(scoringEventIds.has(e.id)).toBe(true)
    }
  })

  it('records a decision per event with a choice and outcome', () => {
    const result = playSameMatch('decision-record-seed', [0, 1, 2, 0, 1, 2, 0])
    expect(result.decisions.length).toBeGreaterThanOrEqual(MIN_DECISIONS)
    expect(result.decisions.length).toBeLessThanOrEqual(MAX_DECISIONS)
    for (const d of result.decisions) {
      expect(['success', 'failure']).toContain(d.outcome)
      expect(typeof d.choice).toBe('string')
      expect(typeof d.summary).toBe('string')
    }
  })
})
