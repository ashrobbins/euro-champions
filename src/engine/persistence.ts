import type { Bracket, DraftSlot, Fixture, Squad, Tactic } from '../types'

const KEY = 'euro-champions:v1'

export interface SavedState {
  dayId: string
  squad: Partial<Squad>
  tactic: Tactic
  fixtures: Fixture[]
  streak: number
  lastResult: string | null
  teamColor: string
  /** Knockout bracket progress, if the group stage is done and the user has entered it. Persisted so it survives a reload — previously lost, which also meant it couldn't be captured in season history. */
  bracket: Bracket | null
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
    bracket: null,
  }
}

export const DRAFT_SLOT_KEYS: DraftSlot[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX']

/** The user's own squad name — set once on first play, editable later from Settings. Its own key (not part of SavedState) so it survives the daily reset. */
const TEAM_NAME_KEY = 'euro-champions:team-name:v1'

export function loadTeamName(): string | null {
  try {
    const raw = localStorage.getItem(TEAM_NAME_KEY)
    return raw && raw.trim() ? raw : null
  } catch {
    return null
  }
}

export function saveTeamName(name: string) {
  try {
    localStorage.setItem(TEAM_NAME_KEY, name.trim())
  } catch {
    // localStorage unavailable — degrade silently, per MVP scope.
  }
}

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

/** The furthest a season went in the knockout stage — null covers both "didn't qualify" and "qualified but never entered". */
export type KnockoutOutcome = 'r16' | 'qf' | 'sf' | 'final' | 'champion'

export interface SeasonRecord {
  dayId: string
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  /** 1-indexed league finish. */
  position: number
  totalTeams: number
  qualifiedForKnockout: boolean
  knockoutOutcome: KnockoutOutcome | null
}

/** One row per completed (or abandoned) season, newest first. Its own key — outlives the daily reset and "New Game". */
const HISTORY_KEY = 'euro-champions:season-history:v1'

export function loadSeasonHistory(): SeasonRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SeasonRecord[]
  } catch {
    return []
  }
}

/**
 * Logs a finished/abandoned season — one record per dayId. A later call for the same dayId
 * replaces the earlier one rather than adding a duplicate, since there's only ever one season
 * per day; this also means recording early (e.g. right when the trophy's won) is always safe to
 * later "upgrade" with a more complete record without leaving a stale duplicate behind.
 */
export function appendSeasonRecord(record: SeasonRecord) {
  try {
    const history = loadSeasonHistory().filter((r) => r.dayId !== record.dayId)
    history.unshift(record)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // localStorage unavailable — degrade silently, per MVP scope.
  }
}
