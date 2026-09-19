export type Position = 'GK' | 'DEF' | 'MID' | 'ATT' | 'FLEX'
export type FlexRole = 'MID' | 'ATT'
export type Tactic = 'aggressive' | 'balanced' | 'defensive'

export const STAT_FIELDS = [
  'finishing',
  'passing',
  'composure',
  'setPieces',
  'defending',
  'goalkeeping',
  'pace',
  'stamina',
] as const

export type StatField = (typeof STAT_FIELDS)[number]
export type Ratings = Record<StatField, number>

export interface Player {
  id: string
  name: string
  position: Position
  flexRole?: FlexRole
  overall: number
  traits: string[]
  ratings: Ratings
}

export interface PlayersData {
  statFields: readonly string[]
  positions: readonly string[]
  players: Player[]
}

export const TEAM_RATING_FIELDS = ['attack', 'defence', 'goalkeeping', 'setPieces', 'pace', 'stamina'] as const
export type TeamRatingField = (typeof TEAM_RATING_FIELDS)[number]
export type TeamRatings = Record<TeamRatingField, number>

export interface Team {
  id: string
  name: string
  accentColor: string
  overall: number
  ratings: TeamRatings
}

export interface TeamsData {
  ratingFields: readonly string[]
  probabilityModel: { formula: string; K: number; note: string }
  teams: Team[]
}

export type DraftSlot = 'GK' | 'DEF' | 'MID' | 'ATT' | 'FLEX'
export const DRAFT_SLOTS: DraftSlot[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX']

export type Squad = Record<DraftSlot, string> // slot -> player id

export type EventOutcome = 'success' | 'failure'

/**
 * 'player' events genuinely turn on who takes the action (free kick, long-range
 * effort) — the choice is between 3 ranked squad members. 'action' events have
 * an implied actor already on the ball (the GK facing a penalty, the defender
 * making a tackle) — the choice is a technique/tactic, not a person.
 */
export type ChoiceMode = 'player' | 'action'

export interface EventDefinition {
  id: string
  label: string
  /** Subtitle asking the player to pick — phrased for this event's actual scenario (e.g. defending vs. attacking). */
  prompt: string
  choiceMode: ChoiceMode
  choices: [string, string, string]
  statA: StatField
  statB: StatField
  weight: number
}

export interface DecisionRecord {
  event: EventDefinition
  choice: string
  outcome: EventOutcome
  summary: string
  /** Big overlay word (e.g. "GOAL!", "SAVED!") for the outcome reveal. */
  headline: string
  /** The player who carried out the action, regardless of choiceMode — used for goalscorer credit. */
  actorName: string
  /** Match minute this decision landed at (0-90), for the goalscorer list. */
  minute: number
}

/** A goal or moment outside the 6 decision events, independent of the user's choices, so the match ticker reads like a full commentary log. */
export interface AmbientEvent {
  minute: number
  text: string
  /** False for a near-miss/chance that didn't change the score (still shown in the feed, just not bolded or scored). */
  isGoal: boolean
  /** Set only when this ambient event is a goal for the user's side, so it can be credited on the goalscorer list. */
  scorerName?: string
}

export interface MatchResult {
  userGoals: number
  oppGoals: number
  decisions: DecisionRecord[]
  ambientEvents: AmbientEvent[]
}

export interface Fixture {
  n: number
  opponentId: string
  venue: 'HOME' | 'AWAY'
  result: MatchResult | null
}

export interface LeagueRow {
  teamId: string
  teamName: string
  accentColor: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

// --- Knockout stage ---

export type KnockoutRoundId = 'r16' | 'qf' | 'sf' | 'final'

export interface PenaltyKick {
  side: 'home' | 'away'
  takerName: string
  scored: boolean
}

export interface PenaltyShootoutResult {
  homeScore: number
  awayScore: number
  kicks: PenaltyKick[]
}

export interface ExtraTimeResult {
  homeGoals: number
  awayGoals: number
  ambientEvents: AmbientEvent[]
}

/** One played leg from the tie's home/away perspective (not the user's — a user playing the away leg of a tie still has `matchResult.userGoals` as their own goals; `homeGoals`/`awayGoals` translate that into the tie's fixed frame so aggregate scoring never depends on who hosted). */
export interface KnockoutLeg {
  homeGoals: number
  awayGoals: number
  /** Present only when the user played this leg interactively — the raw engine output, reused for the results/feed UI. */
  matchResult?: MatchResult
  /** True if the tie's "home" team (seed team) was the away side (travelling) for this particular leg. */
  hostedByAway: boolean
}

export interface KnockoutTie {
  id: string
  round: KnockoutRoundId
  /** Position within the round; used to resolve which next-round tie & side the winner advances into. */
  slotIndex: number
  /** The tie's fixed "home"/"away" designation (home = the higher seed in the R16 draw, or leg1 host otherwise) — stable across both legs. */
  homeTeamId: string | null
  awayTeamId: string | null
  twoLegged: boolean
  legs: KnockoutLeg[]
  extraTime?: ExtraTimeResult
  penalties?: PenaltyShootoutResult
  decidedBy: 'regulation' | 'extraTime' | 'penalties' | null
  winnerTeamId: string | null
}

export interface Bracket {
  seed: string
  ties: KnockoutTie[]
}
