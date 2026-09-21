import { describe, expect, it } from 'vitest'
import { isUserEliminated, userWonFinal, furthestRoundReached } from '../engine/knockout'
import type { Bracket, KnockoutTie } from '../types'

function tie(overrides: Partial<KnockoutTie>): KnockoutTie {
  return {
    id: 'x',
    round: 'r16',
    slotIndex: 0,
    homeTeamId: null,
    awayTeamId: null,
    twoLegged: true,
    legs: [],
    decidedBy: null,
    winnerTeamId: null,
    ...overrides,
  }
}

describe('season history knockout triggers', () => {
  it('detects a champion run', () => {
    const bracket: Bracket = {
      seed: 's',
      ties: [
        tie({ id: 'r16-0', round: 'r16', homeTeamId: 'user', awayTeamId: 't02', winnerTeamId: 'user' }),
        tie({ id: 'qf-0', round: 'qf', homeTeamId: 'user', awayTeamId: 't03', winnerTeamId: 'user' }),
        tie({ id: 'sf-0', round: 'sf', homeTeamId: 'user', awayTeamId: 't04', winnerTeamId: 'user' }),
        tie({ id: 'final-0', round: 'final', homeTeamId: 'user', awayTeamId: 't05', winnerTeamId: 'user' }),
      ],
    }
    expect(userWonFinal(bracket, 'user')).toBe(true)
    expect(isUserEliminated(bracket, 'user')).toBe(false)
    expect(furthestRoundReached(bracket, 'user')).toBe('final')
  })

  it('detects elimination at the quarter-final', () => {
    const bracket: Bracket = {
      seed: 's',
      ties: [
        tie({ id: 'r16-0', round: 'r16', homeTeamId: 'user', awayTeamId: 't02', winnerTeamId: 'user' }),
        tie({ id: 'qf-0', round: 'qf', homeTeamId: 'user', awayTeamId: 't03', winnerTeamId: 't03' }),
      ],
    }
    expect(userWonFinal(bracket, 'user')).toBe(false)
    expect(isUserEliminated(bracket, 'user')).toBe(true)
    expect(furthestRoundReached(bracket, 'user')).toBe('qf')
  })

  it('is not eliminated mid-tie (no winner yet)', () => {
    const bracket: Bracket = {
      seed: 's',
      ties: [tie({ id: 'r16-0', round: 'r16', homeTeamId: 'user', awayTeamId: 't02', winnerTeamId: null })],
    }
    expect(isUserEliminated(bracket, 'user')).toBe(false)
    expect(userWonFinal(bracket, 'user')).toBe(false)
  })

  it('is not eliminated after winning a round but before the next tie is drawn', () => {
    const bracket: Bracket = {
      seed: 's',
      ties: [
        tie({ id: 'r16-0', round: 'r16', homeTeamId: 'user', awayTeamId: 't02', winnerTeamId: 'user' }),
        tie({ id: 'qf-0', round: 'qf', homeTeamId: null, awayTeamId: null, winnerTeamId: null }),
      ],
    }
    expect(isUserEliminated(bracket, 'user')).toBe(false)
  })
})
