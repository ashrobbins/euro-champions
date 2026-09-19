import type { DraftSlot, Fixture, Squad, Tactic } from '../types'

const KEY = 'euro-champions:v1'

export interface SavedState {
  dayId: string
  squad: Partial<Squad>
  tactic: Tactic
  fixtures: Fixture[]
  streak: number
  lastResult: string | null
  teamColor: string
}

export function todayId(): string {
  return new Date().toISOString().slice(0, 10)
}

export function load(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedState
  } catch {
    return null
  }
}

export function save(state: SavedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable (private mode, quota) — degrade silently, per MVP scope.
  }
}

export function defaultState(dayId: string): SavedState {
  return {
    dayId,
    squad: {} as Partial<Squad>,
    tactic: 'balanced',
    fixtures: [],
    streak: 0,
    lastResult: null,
    teamColor: '#e8b93f',
  }
}

export const DRAFT_SLOT_KEYS: DraftSlot[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX']

/** Player name -> career goals, tallied across every match ever played. Survives "New Game" and day rollover — it's not part of SavedState. */
export type CareerGoals = Record<string, number>
const CAREER_KEY = 'euro-champions:career-goals:v1'

export function loadCareerGoals(): CareerGoals {
  try {
    const raw = localStorage.getItem(CAREER_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CareerGoals
  } catch {
    return {}
  }
}

/** Adds this match's goal counts (name -> goals scored this match) onto the running career tally. */
export function addCareerGoals(matchGoals: Record<string, number>) {
  try {
    const current = loadCareerGoals()
    for (const [name, count] of Object.entries(matchGoals)) {
      current[name] = (current[name] ?? 0) + count
    }
    localStorage.setItem(CAREER_KEY, JSON.stringify(current))
  } catch {
    // localStorage unavailable — degrade silently, per MVP scope.
  }
}
