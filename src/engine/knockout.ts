import type { Bracket, KnockoutLeg, KnockoutRoundId, KnockoutTie, LeagueRow, MatchResult, Team } from '../types'
import type { RawExtraTime, RawPenaltyShootout } from './simulation'
import { scoreline } from './league'
import { AWAY_PENALTY, winProbability } from './ratings'
import { SeededRandom } from './random'

export const ROUND_ORDER: KnockoutRoundId[] = ['r16', 'qf', 'sf', 'final']
const ROUND_SIZE: Record<KnockoutRoundId, number> = { r16: 8, qf: 4, sf: 2, final: 1 }

export const ROUND_LABEL: Record<KnockoutRoundId, string> = {
  r16: 'Round of 16',
  qf: 'Quarter-Final',
  sf: 'Semi-Final',
  final: 'Final',
}

function sortStandings(standings: LeagueRow[]): LeagueRow[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    return b.goalsFor - a.goalsFor
  })
}

function shuffle<T>(rng: SeededRandom, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** True if the given standings place the user inside the top 24 — the group stage's knockout cutoff. */
export function qualifiesForKnockout(standings: LeagueRow[]): boolean {
  const sorted = sortStandings(standings)
  return sorted.slice(0, 24).some((r) => r.teamId === 'user')
}

/**
 * Builds the full knockout bracket from a completed league table. The top 8
 * teams are seeded straight into the Round of 16, each randomly drawn against
 * one of the 16 teams placed 9th-24th (8 of that pool of 16 are drawn in;
 * the other 8, like everyone ranked 25th and below, don't make the cut).
 * Later rounds start with empty slots, filled in as earlier ties resolve.
 */
export function buildBracket(seed: string, standings: LeagueRow[]): Bracket {
  const sorted = sortStandings(standings)
  const top8 = sorted.slice(0, 8)
  const pool = sorted.slice(8, 24)

  const rng = new SeededRandom(`knockout:${seed}`)
  const opponents = shuffle(rng, pool).slice(0, 8)

  const r16: KnockoutTie[] = top8.map((seedRow, i) => ({
    id: `r16-${i}`,
    round: 'r16',
    slotIndex: i,
    homeTeamId: seedRow.teamId,
    awayTeamId: opponents[i].teamId,
    twoLegged: true,
    legs: [],
    decidedBy: null,
    winnerTeamId: null,
  }))

  const laterRounds: KnockoutTie[] = (['qf', 'sf', 'final'] as KnockoutRoundId[]).flatMap((round) =>
    Array.from({ length: ROUND_SIZE[round] }, (_, i): KnockoutTie => ({
      id: `${round}-${i}`,
      round,
      slotIndex: i,
      homeTeamId: null,
      awayTeamId: null,
      twoLegged: round !== 'final',
      legs: [],
      decidedBy: null,
      winnerTeamId: null,
    })),
  )

  return { seed, ties: [...r16, ...laterRounds] }
}

export function findTie(bracket: Bracket, round: KnockoutRoundId, slotIndex: number): KnockoutTie | undefined {
  return bracket.ties.find((t) => t.round === round && t.slotIndex === slotIndex)
}

export function isUserTie(tie: KnockoutTie, userTeamId: string): boolean {
  return tie.homeTeamId === userTeamId || tie.awayTeamId === userTeamId
}

/** The user's next tie awaiting play — the earliest round where they're a known participant and haven't been eliminated or already finished it. */
export function findActiveUserTie(bracket: Bracket, userTeamId: string): KnockoutTie | undefined {
  for (const round of ROUND_ORDER) {
    const tie = bracket.ties.find((t) => t.round === round && isUserTie(t, userTeamId))
    if (tie && !tie.winnerTeamId) return tie
  }
  return undefined
}

/** True if the user was knocked out of (or never reached) the bracket — no active or future tie left for them. */
export function isUserEliminated(bracket: Bracket, userTeamId: string): boolean {
  const played = bracket.ties.filter((t) => isUserTie(t, userTeamId) && t.winnerTeamId)
  return played.some((t) => t.winnerTeamId !== userTeamId) && !findActiveUserTie(bracket, userTeamId)
}

export function userWonFinal(bracket: Bracket, userTeamId: string): boolean {
  const final = bracket.ties.find((t) => t.round === 'final')
  return final?.winnerTeamId === userTeamId
}

export function tieAggregate(tie: KnockoutTie): { home: number; away: number } {
  return tie.legs.reduce((acc, leg) => ({ home: acc.home + leg.homeGoals, away: acc.away + leg.awayGoals }), { home: 0, away: 0 })
}

export function tieLegsComplete(tie: KnockoutTie): boolean {
  return tie.legs.length >= (tie.twoLegged ? 2 : 1)
}

/** Whether tie.homeTeamId is the tie's fixed "home" designee — stable identity, not which side hosted a given leg. */
function userIsHomeDesignee(tie: KnockoutTie, userTeamId: string): boolean {
  return tie.homeTeamId === userTeamId
}

/** Which side of the tie's fixed home/away frame hosts (has the venue for) the given leg number. Leg 1: the home designee hosts. Leg 2: it flips. The single-leg final is played at a neutral venue (no home advantage either way). */
export function userHostsLeg(tie: KnockoutTie, userTeamId: string, legNumber: 1 | 2): boolean {
  if (!tie.twoLegged) return true // final: neutral venue, no away penalty for the user
  const userIsHome = userIsHomeDesignee(tie, userTeamId)
  return legNumber === 1 ? userIsHome : !userIsHome
}

/** Records a leg the user actually played, translating the engine's user/opponent result into the tie's fixed home/away frame. */
export function recordUserLeg(tie: KnockoutTie, matchResult: MatchResult, userTeamId: string): KnockoutTie {
  const legNumber = (tie.legs.length + 1) as 1 | 2
  const userIsHome = userIsHomeDesignee(tie, userTeamId)
  const userHosted = userHostsLeg(tie, userTeamId, legNumber)
  const leg: KnockoutLeg = {
    homeGoals: userIsHome ? matchResult.userGoals : matchResult.oppGoals,
    awayGoals: userIsHome ? matchResult.oppGoals : matchResult.userGoals,
    matchResult,
    hostedByAway: userIsHome ? !userHosted : userHosted,
  }
  return { ...tie, legs: [...tie.legs, leg] }
}

export function recordUserExtraTime(tie: KnockoutTie, result: RawExtraTime, userTeamId: string): KnockoutTie {
  const userIsHome = userIsHomeDesignee(tie, userTeamId)
  return {
    ...tie,
    extraTime: {
      homeGoals: userIsHome ? result.userGoals : result.oppGoals,
      awayGoals: userIsHome ? result.oppGoals : result.userGoals,
      ambientEvents: result.ambientEvents,
    },
  }
}

export function recordUserPenalties(tie: KnockoutTie, result: RawPenaltyShootout, userTeamId: string): KnockoutTie {
  const userIsHome = userIsHomeDesignee(tie, userTeamId)
  return {
    ...tie,
    penalties: {
      homeScore: userIsHome ? result.userScore : result.oppScore,
      awayScore: userIsHome ? result.oppScore : result.userScore,
      kicks: result.kicks.map((k) => ({
        side: (k.side === 'user') === userIsHome ? 'home' : 'away',
        takerName: k.takerName,
        scored: k.scored,
      })),
    },
  }
}

/** After legs (and, if needed, extra time / penalties) are in, sets winnerTeamId + decidedBy. Returns the tie unchanged if still undecided (aggregate tied, ET/penalties not played yet). */
export function finalizeTieIfDecided(tie: KnockoutTie): KnockoutTie {
  if (tie.winnerTeamId || !tieLegsComplete(tie)) return tie
  const agg = tieAggregate(tie)
  if (agg.home !== agg.away) {
    return { ...tie, decidedBy: 'regulation', winnerTeamId: agg.home > agg.away ? tie.homeTeamId : tie.awayTeamId }
  }
  if (tie.extraTime) {
    const etHome = agg.home + tie.extraTime.homeGoals
    const etAway = agg.away + tie.extraTime.awayGoals
    if (etHome !== etAway) {
      return { ...tie, decidedBy: 'extraTime', winnerTeamId: etHome > etAway ? tie.homeTeamId : tie.awayTeamId }
    }
  }
  if (tie.penalties) {
    return {
      ...tie,
      decidedBy: 'penalties',
      winnerTeamId: tie.penalties.homeScore > tie.penalties.awayScore ? tie.homeTeamId : tie.awayTeamId,
    }
  }
  return tie
}

/** Instantly resolves a tie between two AI teams — the user never plays these, so there's no need to model them leg-by-leg in detail. */
function resolveAiTie(rng: SeededRandom, teamsById: Record<string, Team>, tie: KnockoutTie): KnockoutTie {
  const home = teamsById[tie.homeTeamId!]
  const away = teamsById[tie.awayTeamId!]
  const legCount = tie.twoLegged ? 2 : 1
  const legs: KnockoutLeg[] = []

  for (let i = 0; i < legCount; i++) {
    const hostedByAway = tie.twoLegged && i === 1
    const host = hostedByAway ? away : home
    const guest = hostedByAway ? home : away
    const isDraw = rng.chance(0.24)
    const hostWins = !isDraw && rng.chance(winProbability(host.overall, guest.overall + AWAY_PENALTY))
    const [hostGoals, guestGoals] = scoreline(rng, hostWins, isDraw)
    legs.push({
      homeGoals: hostedByAway ? guestGoals : hostGoals,
      awayGoals: hostedByAway ? hostGoals : guestGoals,
      hostedByAway,
    })
  }

  let tieWithLegs: KnockoutTie = { ...tie, legs }
  let finalized = finalizeTieIfDecided(tieWithLegs)
  if (finalized.winnerTeamId) return finalized

  // Aggregate tied: extra time, then penalties as the last resort — both abstracted to a single roll apiece.
  const homeWinsEt = rng.chance(winProbability(home.overall, away.overall) * 0.3)
  const awayWinsEt = !homeWinsEt && rng.chance(winProbability(away.overall, home.overall) * 0.3)
  if (homeWinsEt || awayWinsEt) {
    tieWithLegs = { ...tieWithLegs, extraTime: { homeGoals: homeWinsEt ? 1 : 0, awayGoals: awayWinsEt ? 1 : 0, ambientEvents: [] } }
  } else {
    const homeWinsPens = rng.chance(winProbability(home.overall, away.overall))
    tieWithLegs = {
      ...tieWithLegs,
      extraTime: { homeGoals: 0, awayGoals: 0, ambientEvents: [] },
      penalties: { homeScore: homeWinsPens ? 5 : 4, awayScore: homeWinsPens ? 4 : 5, kicks: [] },
    }
  }
  finalized = finalizeTieIfDecided(tieWithLegs)
  return finalized
}

/**
 * One forward pass through the bracket: resolves any AI-vs-AI tie whose two
 * teams are both known, then propagates every decided winner into its
 * next-round slot. Idempotent — safe to call again after the user finishes a
 * leg, extra time, or a shootout, to cascade that result onward. A single
 * top-to-bottom pass is enough because propagation only ever writes into a
 * later round, which this same pass still has ahead of it.
 */
export function progressBracket(bracket: Bracket, teamsById: Record<string, Team>, userTeamId: string, seed: string): Bracket {
  let ties = [...bracket.ties]
  const rng = new SeededRandom(`knockout-sim:${seed}`)

  for (const round of ROUND_ORDER) {
    const roundTies = ties.filter((t) => t.round === round)
    for (const tie of roundTies) {
      let current = ties.find((t) => t.id === tie.id)!

      if (
        !current.winnerTeamId &&
        current.homeTeamId &&
        current.awayTeamId &&
        current.homeTeamId !== userTeamId &&
        current.awayTeamId !== userTeamId
      ) {
        current = resolveAiTie(rng, teamsById, current)
        ties = ties.map((t) => (t.id === current.id ? current : t))
      }

      if (current.winnerTeamId) {
        const roundIdx = ROUND_ORDER.indexOf(current.round)
        if (roundIdx < ROUND_ORDER.length - 1) {
          const nextRound = ROUND_ORDER[roundIdx + 1]
          const nextSlot = Math.floor(current.slotIndex / 2)
          const isHomeSlot = current.slotIndex % 2 === 0
          ties = ties.map((t) => {
            if (t.round !== nextRound || t.slotIndex !== nextSlot) return t
            if (isHomeSlot) return t.homeTeamId === current.winnerTeamId ? t : { ...t, homeTeamId: current.winnerTeamId }
            return t.awayTeamId === current.winnerTeamId ? t : { ...t, awayTeamId: current.winnerTeamId }
          })
        }
      }
    }
  }

  return { ...bracket, ties }
}
