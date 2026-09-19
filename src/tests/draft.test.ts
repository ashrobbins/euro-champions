import { describe, expect, it } from 'vitest'
import { CANDIDATES_SHOWN, canSelect, candidatesFor, isValidSquad, legendCount } from '../engine/draft'
import type { DraftSlot, Squad } from '../types'

describe('draft legend cap (§13.1)', () => {
  it('offers exactly CANDIDATES_SHOWN random candidates per position, all matching that position', () => {
    const slots: DraftSlot[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX']
    for (const slot of slots) {
      const candidates = candidatesFor(slot, 'test-seed')
      expect(candidates).toHaveLength(CANDIDATES_SHOWN)
      for (const p of candidates) expect(p.position).toBe(slot)
      const ids = candidates.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length) // no repeats within the 5
    }
  })

  it('is deterministic for a given seed, and varies across seeds', () => {
    const a = candidatesFor('MID', 'seed-a').map((p) => p.id)
    const b = candidatesFor('MID', 'seed-a').map((p) => p.id)
    expect(a).toEqual(b)
    const c = candidatesFor('MID', 'seed-b').map((p) => p.id)
    expect(c).not.toEqual(a)
  })

  it('allows up to 3 legends', () => {
    const squad: Partial<Squad> = { GK: 'kahn', DEF: 'maldini', MID: 'zidane' }
    expect(legendCount(squad)).toBe(3)
    expect(canSelect(squad, 'ATT', 'ronaldo')).toBe(false) // would make 4
  })

  it('allows swapping a legend for a legend in the same slot', () => {
    const squad: Partial<Squad> = { GK: 'kahn', DEF: 'maldini', MID: 'zidane' }
    // Replacing the MID legend with the FLEX legend in the MID slot itself is fine.
    expect(canSelect(squad, 'MID', 'zidane')).toBe(true)
  })

  it('rejects a 4th legend but allows a non-legend', () => {
    const squad: Partial<Squad> = { GK: 'kahn', DEF: 'maldini', MID: 'zidane' }
    expect(canSelect(squad, 'ATT', 'saviola')).toBe(true)
    expect(canSelect(squad, 'FLEX', 'iniesta')).toBe(false)
  })

  it('isValidSquad requires all 5 slots and <= 3 legends', () => {
    const partial: Partial<Squad> = { GK: 'kahn', DEF: 'maldini', MID: 'zidane', ATT: 'saviola' }
    expect(isValidSquad(partial)).toBe(false)
    const full: Squad = { ...partial, FLEX: 'parkjs' } as Squad
    expect(isValidSquad(full)).toBe(true)
  })
})
