import { describe, expect, it } from 'vitest'
import { SeededRandom, hashSeed } from '../engine/random'

describe('seeded random (§6.1, §13.2)', () => {
  it('same seed produces the same sequence', () => {
    const a = new SeededRandom('day-1|squad-abc|opp-Milan|tactic-balanced')
    const b = new SeededRandom('day-1|squad-abc|opp-Milan|tactic-balanced')
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('different seeds produce different sequences', () => {
    const a = new SeededRandom('seed-a')
    const b = new SeededRandom('seed-b')
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('hashSeed is deterministic for the same string', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'))
  })

  it('next() stays within [0, 1)', () => {
    const rng = new SeededRandom(42)
    for (let i = 0; i < 200; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
