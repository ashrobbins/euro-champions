/**
 * Deterministic PRNG (mulberry32) plus a string hash to turn arbitrary seed
 * material (date + squad + opponent + tactic, per plan §13.2) into a numeric
 * seed. Same seed in -> same sequence of rolls out, always.
 */

export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^ (h >>> 16)) >>> 0
}

export class SeededRandom {
  private state: number

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** True with probability p (0-1). */
  chance(p: number): boolean {
    return this.next() < p
  }

  /** Picks a weighted-random item from a list of [item, weight] pairs. */
  weighted<T>(items: Array<[T, number]>): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0)
    let roll = this.next() * total
    for (const [item, w] of items) {
      roll -= w
      if (roll <= 0) return item
    }
    return items[items.length - 1][0]
  }
}
