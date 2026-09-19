import { describe, expect, it } from 'vitest'
import { CANDIDATES_SHOWN, candidatesFor, isValidSquad } from '../engine/draft'
import type { DraftSlot, Squad } from '../types'

describe('draft candidates', () => {
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

  it('isValidSquad requires all 5 slots filled — no other constraint', () => {
    const partial: Partial<Squad> = { GK: 'kahn', DEF: 'maldini', MID: 'zidane', ATT: 'saviola' }
    expect(isValidSquad(partial)).toBe(false)
    const full: Squad = { ...partial, FLEX: 'parkjs' } as Squad
    expect(isValidSquad(full)).toBe(true)
  })
})
