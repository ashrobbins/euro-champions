import type { AmbientEvent, DecisionRecord, EventOutcome, MatchResult, Player, Tactic, Team } from '../types'
import { EVENT_POOL, actorFor, type DrawnEvent, type PoolEvent } from './events'
import { AWAY_PENALTY, winProbability } from './ratings'

/**
 * Decisions pit a single player's peak specialist stat (routinely 90+ for a
 * legend-heavy squad) against a team-wide category rating (which tops out
 * lower, ~85-96 even for elite sides) — a structurally wider gap than the
 * team-overall-vs-team-overall comparisons ratings.K was calibrated for.
 * A larger K here flattens that gap back down so a decision's outcome stays
 * genuinely contested even when your specialist comfortably outrates the
 * opponent's category number, instead of every decision skewing near-certain.
 */
const DECISION_K = 32
import type { SeededRandom } from './random'

/**
 * §8: tactic modifiers, applied as rating-point adjustments (not flat probability
 * points) before the win-probability sigmoid. Rating-space keeps their effect
 * self-limiting: a few extra rating points barely move the needle when you're
 * already heavily outmatched by a top side, rather than bolting on the same
 * fixed percentage regardless of opponent quality.
 */
const TACTIC_MODIFIER: Record<Tactic, { userAttack: number; userDefense: number }> = {
  aggressive: { userAttack: 5, userDefense: -3 },
  balanced: { userAttack: 0, userDefense: 0 },
  defensive: { userAttack: -3, userDefense: 5 },
}

type EventKind = 'user_goal_chance' | 'opp_goal_chance' | 'momentum'

// 9 of the 10 events carry direct goal stakes; only late_tactic is pure game
// management (Attack/Balanced/Protect isn't a single shot or tackle to win).
const EVENT_KIND: Record<string, EventKind> = {
  penalty_save: 'opp_goal_chance',
  free_kick: 'user_goal_chance',
  one_on_one: 'user_goal_chance',
  corner: 'user_goal_chance',
  last_ditch_tackle: 'opp_goal_chance',
  long_range: 'user_goal_chance',
  def_set_piece: 'opp_goal_chance',
  counter_attack: 'user_goal_chance',
  break_press: 'user_goal_chance',
  late_tactic: 'momentum',
}

/** Risk/reward spread across a 3-option action choice, in rating points: first option safest, last riskiest. */
const CHOICE_ORDER_MODIFIER: [number, number, number] = [3, 0, -3]

/** Decisions per match vary a little match to match rather than always landing on exactly 6. */
export const MIN_DECISIONS = 4
export const MAX_DECISIONS = 7

/** True if a successful outcome on this event means the user's team scored (for goalscorer lists). */
export function isUserGoalEvent(eventId: string): boolean {
  return EVENT_KIND[eventId] === 'user_goal_chance'
}

/** True if a failed outcome on this event means the opponent scored (for goalscorer lists / score feeds). */
export function isOppGoalEvent(eventId: string): boolean {
  return EVENT_KIND[eventId] === 'opp_goal_chance'
}

/**
 * Maps "N of `total` decisions resolved" onto a 1-89 match minute for clock display.
 * Slots are spread across count+1 divisions so the first decision never lands at
 * minute 0 (kickoff, before anything has happened) and the last always lands
 * before full time.
 */
export function minuteForDecisions(decisionCount: number, decisionsTotal: number): number {
  return Math.min(89, Math.max(1, Math.round((decisionCount / (decisionsTotal + 1)) * 90)))
}

/** Running score from events revealed up to (and including) `uptoMinute` — used for any "score so far" display mid-match. */
export function revealedScore(
  decisions: DecisionRecord[],
  ambientEvents: AmbientEvent[],
  uptoMinute: number,
): { userGoals: number; oppGoals: number } {
  let userGoals = 0
  let oppGoals = 0
  for (const d of decisions) {
    if (d.outcome === 'success' && isUserGoalEvent(d.event.id)) userGoals++
    if (d.outcome === 'failure' && isOppGoalEvent(d.event.id)) oppGoals++
  }
  for (const e of ambientEvents) {
    if (!e.isGoal || e.minute > uptoMinute) continue
    if (e.scorerName) userGoals++
    else oppGoals++
  }
  return { userGoals, oppGoals }
}

/**
 * Weighted sample of 6 distinct events from the 10-event Appendix C pool, each
 * with a commentary line rolled for this occurrence. late_tactic is a special
 * case (per product decision): it only ever lands in the last two slots (so it
 * can't appear before ~75'), and is excluded from the draw entirely when the
 * user is already up by more than 3 goals (ambientMargin) or on an unlucky
 * "not every game" roll.
 */
export function pickEvents(rng: SeededRandom, ambientMargin: number, count = 6): DrawnEvent[] {
  const lateTacticEligible = ambientMargin <= 3 && rng.chance(0.55)
  const lateTacticEvent = EVENT_POOL.find((e) => e.id === 'late_tactic')!
  const remaining = EVENT_POOL.filter((e) => e.id !== 'late_tactic')
  const picked: DrawnEvent[] = []
  // Decision slots land at minute i/count*90 (0, 15, 30, 45, 60, 75 for count=6) — the last
  // slot (75') is as late as any discrete decision can land before full time, so that's the
  // only slot late_tactic is eligible for.
  const tailSlots = 1

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const inTailWindow = i >= count - tailSlots
    const alreadyUsedLateTactic = picked.some((p) => p.id === 'late_tactic')
    const pool: PoolEvent[] =
      inTailWindow && lateTacticEligible && !alreadyUsedLateTactic ? [...remaining, lateTacticEvent] : remaining

    const choice = rng.weighted(pool.map((e) => [e, e.weight] as [PoolEvent, number]))
    picked.push(choice)
    if (choice.id !== 'late_tactic') remaining.splice(remaining.indexOf(choice), 1)
  }
  return picked
}

/** Top-3 squad players by relevance to this event's two ratings, for player-choice events (who takes it). */
export function candidatesFor(squad: Player[], event: PoolEvent): Player[] {
  const scored = squad
    .map((p) => ({ p, score: p.ratings[event.statA] * 0.7 + p.ratings[event.statB] * 0.3 }))
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map((s) => s.p)
}

export class MatchEngine {
  readonly rng: SeededRandom
  readonly squad: Player[]
  readonly opponent: Team
  readonly tactic: Tactic
  readonly isHome: boolean
  readonly eventQueue: DrawnEvent[]

  userGoals = 0
  oppGoals = 0
  decisions: DecisionRecord[] = []
  ambientEvents: AmbientEvent[] = []
  private eventIndex = 0

  constructor(rng: SeededRandom, squad: Player[], opponent: Team, tactic: Tactic, isHome: boolean) {
    this.rng = rng
    this.squad = squad
    this.opponent = opponent
    this.tactic = tactic
    this.isHome = isHome
    // Ambient goals roll first so late_tactic's "not if winning big" gate has a scoreline to check.
    this.rollAmbientPhases()
    this.rollLateWindowEvent()
    const decisionCount = this.rng.int(MIN_DECISIONS, MAX_DECISIONS)
    this.eventQueue = pickEvents(this.rng, this.userGoals - this.oppGoals, decisionCount)
  }

  /**
   * Goals outside the 6 decision events, scaled by the rating gap — but only
   * for the opponent. The user already has a full say over their own scoring
   * through decisions; letting them also rack up goals passively, with no
   * choice involved, was the single biggest source of the game feeling too
   * easy to win. The opponent still gets to punish you passively — a weaker
   * squad concedes some it never had a say in — so the threat stays real.
   * Independent of user choices. Each roll gets a minute and commentary line
   * so it shows up in the match ticker like a real moment, not a silent stat.
   */
  private rollAmbientPhases() {
    const userRating = this.effectiveUserRating()
    const oppAttack = this.opponent.ratings.attack

    const TRIALS = 5
    // Tuned so a decent squad wins roughly 1-in-3 against the league's very strongest sides
    // (where the opponent's high attack rating makes each ambient trial hit hardest) while
    // still comfortably favoured overall against the full 36-team spread of opponents.
    const TRIAL_WEIGHT = 0.04

    for (let i = 0; i < TRIALS; i++) {
      const minute = this.rng.int(2, 89)
      if (this.rng.chance(winProbability(oppAttack, userRating) * TRIAL_WEIGHT)) {
        this.oppGoals++
        const line = AMBIENT_OPP_GOAL_LINES[this.rng.int(0, AMBIENT_OPP_GOAL_LINES.length - 1)]
        this.ambientEvents.push({ minute, text: line.replace('{opp}', this.opponent.name), isGoal: true })
      }
    }
    this.ambientEvents.sort((a, b) => a.minute - b.minute)
  }

  /**
   * Guarantees at least one match event lands in the closing stages (80'-89'),
   * so no match ever goes quiet in the last 10 minutes. Like the rest of the
   * ambient phase, this late chance only ever belongs to the opponent — even
   * a match you're leading late can still be spoiled, which is the whole
   * point of an ambient (non-decision) threat. The roll can still fail (a
   * near-miss), it's a chance, not a guaranteed goal.
   */
  private rollLateWindowEvent() {
    const minute = this.rng.int(80, 89)
    const userRating = this.effectiveUserRating()
    const oppAttack = this.opponent.ratings.attack

    if (this.rng.chance(winProbability(oppAttack, userRating))) {
      this.oppGoals++
      const line = AMBIENT_OPP_GOAL_LINES[this.rng.int(0, AMBIENT_OPP_GOAL_LINES.length - 1)]
      this.ambientEvents.push({ minute, text: line.replace('{opp}', this.opponent.name), isGoal: true })
    } else {
      const line = AMBIENT_OPP_MISS_LINES[this.rng.int(0, AMBIENT_OPP_MISS_LINES.length - 1)].replace('{opp}', this.opponent.name)
      this.ambientEvents.push({ minute, text: line, isGoal: false })
    }
    this.ambientEvents.sort((a, b) => a.minute - b.minute)
  }

  /** Squad-wide overall, adjusted by the away-fixture modifier (Appendix D.1). Same figure stands in for both attack and defence in the ambient (non-decision) phases. */
  private effectiveUserRating(): number {
    const base = Math.round(this.squad.reduce((sum, p) => sum + p.overall, 0) / this.squad.length)
    return base + (this.isHome ? 0 : -AWAY_PENALTY)
  }

  currentEvent(): DrawnEvent | null {
    return this.eventQueue[this.eventIndex] ?? null
  }

  /** For choiceMode 'player' events: the top-3 ranked squad members to choose among. */
  candidates(): Player[] {
    const event = this.currentEvent()
    if (!event || event.choiceMode !== 'player') return []
    return candidatesFor(this.squad, event)
  }

  /** For choiceMode 'action' events: the single player already on the ball (fixed, not chosen). */
  actor(): Player | null {
    const event = this.currentEvent()
    if (!event || event.choiceMode !== 'action') return null
    return actorFor(this.squad, event)
  }

  isComplete(): boolean {
    return this.eventIndex >= this.eventQueue.length
  }

  /**
   * Resolve the current event given the choice index (0-2).
   * Player-mode: choiceIndex picks which of the 3 ranked candidates acts.
   * Action-mode: the actor is fixed; choiceIndex picks the technique/tactic,
   * which nudges the probability per CHOICE_ORDER_MODIFIER.
   */
  resolveChoice(choiceIndex: 0 | 1 | 2): DecisionRecord {
    const event = this.currentEvent()
    if (!event) throw new Error('No event to resolve')
    const kind = EVENT_KIND[event.id]
    const mod = TACTIC_MODIFIER[this.tactic]

    const isPlayerMode = event.choiceMode === 'player'
    const actingPlayer = isPlayerMode ? (this.candidates()[choiceIndex] ?? this.candidates()[0]) : this.actor()!
    const choiceLabel = isPlayerMode ? actingPlayer.name : event.choices[choiceIndex]

    const userRating = actingPlayer.ratings[event.statA]
    const oppRating = this.opponent.ratings[event.teamStat] + (this.isHome ? 0 : AWAY_PENALTY)
    const orderModifier = isPlayerMode ? 0 : CHOICE_ORDER_MODIFIER[choiceIndex]
    const tacticBonus = kind === 'user_goal_chance' ? mod.userAttack : kind === 'opp_goal_chance' ? mod.userDefense : 0

    // Tactic and choice-order nudges are applied in rating-space, before the sigmoid, so their
    // effect on the resulting probability shrinks the further out of your depth you already are —
    // a few extra rating points barely move the needle against a side that heavily outrates you.
    let probability = winProbability(userRating + tacticBonus + orderModifier, oppRating, DECISION_K)
    probability = Math.min(0.95, Math.max(0.05, probability))

    const success: boolean = this.rng.chance(probability)
    const outcome: EventOutcome = success ? 'success' : 'failure'

    if (kind === 'user_goal_chance' && success) this.userGoals++
    if (kind === 'opp_goal_chance' && !success) this.oppGoals++

    const summary = summarize(event, actingPlayer, choiceIndex, kind, success, isPlayerMode)
    const headline = headlineFor(kind, success)
    const minute = minuteForDecisions(this.eventIndex, this.eventQueue.length)
    const record: DecisionRecord = { event, choice: choiceLabel, outcome, summary, headline, actorName: actingPlayer.name, minute }
    this.decisions.push(record)
    this.eventIndex++
    return record
  }

  result(): MatchResult {
    return { userGoals: this.userGoals, oppGoals: this.oppGoals, decisions: this.decisions, ambientEvents: this.ambientEvents }
  }
}

/** Raw extra-time output, in "user vs opponent" terms — the caller translates into a tie's fixed home/away frame. */
export interface RawExtraTime {
  userGoals: number
  oppGoals: number
  ambientEvents: AmbientEvent[]
}

const EXTRA_TIME_LINES_USER = [
  '{p} finds one last surge of energy and buries it!',
  'Tired legs, sharp finish — {p} scores in extra time!',
  '{p} pounces in the additional 30 to break the deadlock!',
]

const EXTRA_TIME_LINES_OPP = [
  '{opp} catch a gassed defence napping in extra time!',
  'Extra-time heartbreak — {opp} find the net.',
  '{opp} punish tired legs deep into the additional 30.',
]

/**
 * 30 minutes of extra time (91'-120'), ambient-only — no decisions, since by
 * this point in a knockout tie it's meant to read as end-to-end, exhausted
 * chaos rather than another set of composed set-piece choices. Unlike normal
 * time's ambient phase (deliberately opponent-only, see rollAmbientPhases),
 * extra time gives BOTH sides a fair shot — it's a dramatic decider, not the
 * main difficulty lever.
 */
export function simulateExtraTime(rng: SeededRandom, squad: Player[], opponent: Team, isHome: boolean): RawExtraTime {
  const base = Math.round(squad.reduce((sum, p) => sum + p.overall, 0) / squad.length)
  const userRating = base + (isHome ? 0 : -AWAY_PENALTY)
  const oppAttack = opponent.ratings.attack
  const oppDefence = opponent.ratings.defence
  const TRIALS = 3
  const TRIAL_WEIGHT = 0.16
  const scorers = squad.filter((p) => p.position !== 'GK')

  let userGoals = 0
  let oppGoals = 0
  const ambientEvents: AmbientEvent[] = []

  for (let i = 0; i < TRIALS; i++) {
    const minute = rng.int(91, 119)
    if (rng.chance(winProbability(userRating, oppDefence) * TRIAL_WEIGHT)) {
      userGoals++
      const scorer = scorers.length > 0 ? rng.weighted(scorers.map((p) => [p, Math.max(1, p.ratings.finishing)] as [Player, number])) : squad[0]
      const line = EXTRA_TIME_LINES_USER[rng.int(0, EXTRA_TIME_LINES_USER.length - 1)]
      ambientEvents.push({ minute, text: line.replace('{p}', scorer.name), scorerName: scorer.name, isGoal: true })
    }
    if (rng.chance(winProbability(oppAttack, userRating) * TRIAL_WEIGHT)) {
      oppGoals++
      const line = EXTRA_TIME_LINES_OPP[rng.int(0, EXTRA_TIME_LINES_OPP.length - 1)]
      ambientEvents.push({ minute, text: line.replace('{opp}', opponent.name), isGoal: true })
    }
  }
  ambientEvents.sort((a, b) => a.minute - b.minute)
  return { userGoals, oppGoals, ambientEvents }
}

export interface RawPenaltyKick {
  side: 'user' | 'opp'
  takerName: string
  scored: boolean
}

export interface RawPenaltyShootout {
  userScore: number
  oppScore: number
  kicks: RawPenaltyKick[]
}

/** Clamped win probability for a single penalty kick — even the best taker/keeper matchup stays a real contest. */
function kickChance(takerRating: number, keeperRating: number): number {
  return Math.min(0.92, Math.max(0.55, winProbability(takerRating, keeperRating, 25)))
}

/**
 * Best-of-5 penalty shootout, then sudden death. Takers are the squad's top
 * 5 outfield players by set-piece composure, cycling if it goes past 5
 * rounds. Always plays the full 5 rounds even if already mathematically
 * decided (simplification — reads clean, avoids an early-stop edge case).
 */
export function simulatePenaltyShootout(rng: SeededRandom, squad: Player[], opponent: Team): RawPenaltyShootout {
  const takers = [...squad]
    .filter((p) => p.position !== 'GK')
    .sort((a, b) => b.ratings.setPieces * 0.6 + b.ratings.composure * 0.4 - (a.ratings.setPieces * 0.6 + a.ratings.composure * 0.4))
  const gk = squad.find((p) => p.position === 'GK') ?? squad[0]

  const kicks: RawPenaltyKick[] = []
  let userScore = 0
  let oppScore = 0

  let round = 0
  while (round < 5 || userScore === oppScore) {
    if (round >= 5 + 10) break // safety cap on sudden death
    const taker = takers[round % takers.length]
    const userScored = rng.chance(kickChance(taker.ratings.setPieces * 0.5 + taker.ratings.composure * 0.5, opponent.ratings.goalkeeping))
    if (userScored) userScore++
    kicks.push({ side: 'user', takerName: taker.name, scored: userScored })

    const oppScored = rng.chance(kickChance(opponent.ratings.setPieces, gk.ratings.goalkeeping))
    if (oppScored) oppScore++
    kicks.push({ side: 'opp', takerName: opponent.name, scored: oppScored })

    round++
  }

  return { userScore, oppScore, kicks }
}

const AMBIENT_OPP_GOAL_LINES = [
  '{opp} catch us napping at the back — clinical finish.',
  'A well-worked move ends with {opp} finding the net.',
  '{opp} punish a moment of hesitation in our box.',
  'A set-piece routine catches us out — {opp} score.',
]

const AMBIENT_OPP_MISS_LINES = [
  '{opp} push forward late — the effort flies over the bar.',
  'A nervy moment as {opp} break — but the last touch lets them down.',
  '{opp} win a half-chance — well held under pressure.',
  'A scramble in the box — {opp} can’t force it home.',
]

const HEADLINE: Record<EventKind, { success: string; failure: string }> = {
  user_goal_chance: { success: 'GOAL!', failure: 'SO CLOSE' },
  opp_goal_chance: { success: 'SAVED!', failure: 'GOAL!' },
  momentum: { success: 'NICE PLAY', failure: 'DENIED' },
}

function headlineFor(kind: EventKind, success: boolean): string {
  return success ? HEADLINE[kind].success : HEADLINE[kind].failure
}

// Player-mode events (free_kick, long_range): generic "{player} scores/denied" phrasing reads fine on its own.
function summarizePlayerMode(event: PoolEvent, player: Player, kind: EventKind, success: boolean): string {
  if (kind === 'user_goal_chance') return success ? `${event.label} — ${player.name} scores.` : `${event.label} — ${player.name} denied.`
  if (kind === 'opp_goal_chance') return success ? `${event.label} — ${player.name} makes the stop.` : `${event.label} — opponent scores.`
  return success ? `${event.label} — worked out well.` : `${event.label} — didn't quite come off.`
}

// Action-mode events: bespoke line per event x choice x outcome, since the actor is fixed
// and the drama is in *what* they tried, not *who* they are.
const ACTION_RESULT_TEXT: Record<string, { success: [string, string, string]; failure: [string, string, string] }> = {
  penalty_save: {
    success: [
      '{a} guesses left and gets there — saved!',
      '{a} stays big in the middle — blocked!',
      '{a} dives right and keeps it out!',
    ],
    failure: [
      '{a} dives left — wrong way, it’s in.',
      '{a} holds the centre — but it’s placed either side. Goal.',
      '{a} goes right — but it’s struck the other way. Goal.',
    ],
  },
  one_on_one: {
    success: [
      '{a} composes himself and slots it into the corner!',
      "{a} smashes it through the keeper's grasp!",
      '{a} dinks it delicately over the keeper — in!',
    ],
    failure: [
      '{a} tries to place it — straight at the keeper.',
      '{a} smashes it — over the bar.',
      "{a} attempts the dink — the keeper claws it away.",
    ],
  },
  corner: {
    success: [
      'Whipped to the near post — {a} gets a flick on and it’s in!',
      'Floated to the far post — {a} arrives to finish!',
      'Played short — {a} works it back in for a clean strike!',
    ],
    failure: [
      "Near post ball — {a} can't quite connect.",
      "Far post delivery — {a} just can't reach it.",
      'Played short — the move breaks down before a cross comes in.',
    ],
  },
  break_press: {
    success: [
      '{a} threads it through the middle, the move builds — and ends with a goal!',
      '{a} switches it out to the wing, the move builds — and ends with a goal!',
      '{a} clears it long, it falls perfectly — and the move ends with a goal!',
    ],
    failure: [
      '{a} tries to thread it through the middle — cut out before anything develops.',
      '{a} looks for the wing — intercepted, chance gone.',
      '{a} clears it long — straight back to the opposition, nothing comes of it.',
    ],
  },
  late_tactic: {
    success: [
      'The team cranks up the pressure — Attack! Attack! Attack! pays off.',
      'The team keeps things balanced — a measured approach that works.',
      'The team shuts up shop — parking the bus holds firm.',
    ],
    failure: [
      'The team throws men forward — it backfires, exposed at the back.',
      'The team tries to stay balanced — but loses the initiative.',
      'The team parks the bus — but invites unwanted pressure.',
    ],
  },
  last_ditch_tackle: {
    success: [
      '{a} throws in a perfectly timed slide tackle — cleared!',
      "{a} stands off, holds his ground — the attacker's forced wide!",
      '{a} gets across to block the shot — brilliant defending!',
    ],
    failure: [
      "{a} dives into the slide tackle — beaten, and it's a goal.",
      '{a} stands off — but the attacker finds a yard and scores.',
      '{a} tries to block — the shot squeezes through. Goal.',
    ],
  },
  def_set_piece: {
    success: [
      'Zonal marking holds firm — the defence clears the danger!',
      'Man marking pays off — the runner is shackled completely!',
      'The short setup snuffs it out before it becomes anything — well organised!',
    ],
    failure: [
      'Zonal marking breaks down — a man goes missing. Goal.',
      'Man marking fails — the runner gets away. Goal.',
      'The short setup is caught out — punished. Goal.',
    ],
  },
  counter_attack: {
    success: [
      '{a} bursts forward on the fast break — and finishes it off!',
      '{a} holds it up, waits for support — and the move ends in a goal!',
      '{a} switches play across the pitch — and the move ends in a goal!',
    ],
    failure: [
      '{a} goes for the fast break — but it breaks down before anything comes of it.',
      '{a} tries to hold it up — dispossessed, chance gone.',
      '{a} switches play — but it’s cut out before real danger.',
    ],
  },
}

function summarize(event: PoolEvent, player: Player, choiceIndex: number, kind: EventKind, success: boolean, isPlayerMode: boolean): string {
  if (isPlayerMode) return summarizePlayerMode(event, player, kind, success)
  const lines = ACTION_RESULT_TEXT[event.id]
  const template = (success ? lines?.success : lines?.failure)?.[choiceIndex]
  if (!template) return summarizePlayerMode(event, player, kind, success)
  return template.replace('{a}', player.name)
}
