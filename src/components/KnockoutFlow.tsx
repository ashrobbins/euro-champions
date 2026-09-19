import { useRef, useState } from 'react'
import type { Bracket, DecisionRecord, KnockoutTie, Player, Tactic, Team } from '../types'
import {
  findActiveUserTie,
  finalizeTieIfDecided,
  progressBracket,
  recordUserExtraTime,
  recordUserLeg,
  recordUserPenalties,
  ROUND_LABEL,
  tieLegsComplete,
  userHostsLeg,
  userWonFinal,
} from '../engine/knockout'
import {
  MatchEngine,
  minuteForDecisions,
  revealedScore,
  simulateExtraTime,
  simulatePenaltyShootout,
  type RawExtraTime,
  type RawPenaltyShootout,
} from '../engine/simulation'
import { SeededRandom } from '../engine/random'
import { BracketScreen } from './BracketScreen'
import { MatchScreen } from './MatchScreen'
import { DecisionModal } from './DecisionModal'
import { OutcomeOverlay } from './OutcomeOverlay'
import { ResultsScreen } from './ResultsScreen'
import { ExtraTimeScreen } from './ExtraTimeScreen'
import { PenaltyShootoutScreen } from './PenaltyShootoutScreen'
import { KnockoutTieResultScreen } from './KnockoutTieResultScreen'
import { TrophyScreen } from './TrophyScreen'

const USER_TEAM_ID = 'user'

type KFScreen = 'bracket' | 'match' | 'legResult' | 'extraTime' | 'penalties' | 'tieResult' | 'trophy'

interface Props {
  bracket: Bracket
  onBracketChange: (bracket: Bracket) => void
  teamsById: Record<string, Team>
  squad: Player[]
  tactic: Tactic
  teamColor: string
  userTeamName: string
  seed: string
  onExit: () => void
  /** Debug/demo entry point (e.g. ?simExtraTime) — skips straight to extra time for the given tie, which must already have two tied legs recorded on `bracket`. */
  debugEntry?: { tieId: string; screen: 'extraTime' }
}

function opponentIdFor(tie: KnockoutTie): string {
  return tie.homeTeamId === USER_TEAM_ID ? tie.awayTeamId! : tie.homeTeamId!
}

/** Goals already banked from legs played so far, translated into "you" vs "them" regardless of which side of the tie you're on. */
function userAggregateSoFar(tie: KnockoutTie): { mine: number; theirs: number } {
  const userIsHome = tie.homeTeamId === USER_TEAM_ID
  return tie.legs.reduce(
    (acc, leg) => ({
      mine: acc.mine + (userIsHome ? leg.homeGoals : leg.awayGoals),
      theirs: acc.theirs + (userIsHome ? leg.awayGoals : leg.homeGoals),
    }),
    { mine: 0, theirs: 0 },
  )
}

export function KnockoutFlow({ bracket, onBracketChange, teamsById, squad, tactic, teamColor, userTeamName, seed, onExit, debugEntry }: Props) {
  const [kfScreen, setKfScreen] = useState<KFScreen>(() => debugEntry?.screen ?? 'bracket')
  const [activeTieId, setActiveTieId] = useState<string | null>(() => debugEntry?.tieId ?? null)
  const [legNumber, setLegNumber] = useState<1 | 2>(1)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [pendingOutcome, setPendingOutcome] = useState<DecisionRecord | null>(null)
  const [etResult, setEtResult] = useState<RawExtraTime | null>(() => {
    if (!debugEntry || debugEntry.screen !== 'extraTime') return null
    const tie = bracket.ties.find((t) => t.id === debugEntry.tieId)
    if (!tie) return null
    const etIsHome = tie.twoLegged ? userHostsLeg(tie, USER_TEAM_ID, 2) : true
    return simulateExtraTime(new SeededRandom(`${seed}|debug-et`), squad, teamsById[opponentIdFor(tie)], etIsHome)
  })
  const [penResult, setPenResult] = useState<RawPenaltyShootout | null>(null)
  const [, forceUpdate] = useState(0)
  const engineRef = useRef<MatchEngine | null>(null)

  const activeTie = bracket.ties.find((t) => t.id === activeTieId) ?? null

  function startLeg(tie: KnockoutTie, legN: 1 | 2) {
    const opponent = teamsById[opponentIdFor(tie)]
    const isHome = userHostsLeg(tie, USER_TEAM_ID, legN)
    const rng = new SeededRandom(`${seed}|knockout|${tie.id}|leg${legN}`)
    engineRef.current = new MatchEngine(rng, squad, opponent, tactic, isHome)
    setActiveTieId(tie.id)
    setLegNumber(legN)
    setPendingOutcome(null)
    setDecisionOpen(false)
    setKfScreen('match')
    forceUpdate((n) => n + 1)
  }

  function handlePlayNext() {
    const tie = findActiveUserTie(bracket, USER_TEAM_ID)
    if (!tie) return
    startLeg(tie, (tie.legs.length + 1) as 1 | 2)
  }

  function handleChoose(choiceIndex: 0 | 1 | 2) {
    const engine = engineRef.current
    if (!engine) return
    const record = engine.resolveChoice(choiceIndex)
    setPendingOutcome(record)
    setDecisionOpen(false)
    forceUpdate((n) => n + 1)
  }

  function updateBracketTie(next: KnockoutTie) {
    const nextBracket: Bracket = { ...bracket, ties: bracket.ties.map((t) => (t.id === next.id ? next : t)) }
    onBracketChange(nextBracket)
    return nextBracket
  }

  function handleMatchContinue() {
    const engine = engineRef.current
    const tie = activeTie
    if (!engine || !tie) return

    if (!engine.isComplete()) {
      setDecisionOpen(true)
      return
    }

    const result = engine.result()
    const updatedTie = recordUserLeg(tie, result, USER_TEAM_ID)
    updateBracketTie(updatedTie)

    if (!tieLegsComplete(updatedTie)) {
      setKfScreen('legResult')
      return
    }

    resolveAfterLegs(updatedTie)
  }

  /** Called once every required leg is in — finalizes on aggregate, or kicks off extra time. */
  function resolveAfterLegs(tie: KnockoutTie) {
    const finalized = finalizeTieIfDecided(tie)
    if (finalized.winnerTeamId) {
      const advanced = progressBracket(updateBracketTie(finalized), teamsById, USER_TEAM_ID, seed)
      onBracketChange(advanced)
      setKfScreen('tieResult')
      return
    }

    updateBracketTie(tie)
    const etIsHome = tie.twoLegged ? userHostsLeg(tie, USER_TEAM_ID, 2) : true
    const rng = new SeededRandom(`${seed}|knockout|${tie.id}|et`)
    const et = simulateExtraTime(rng, squad, teamsById[opponentIdFor(tie)], etIsHome)
    setEtResult(et)
    setKfScreen('extraTime')
  }

  function handleExtraTimeDone() {
    const tie = activeTie
    if (!tie || !etResult) return
    const withEt = recordUserExtraTime(tie, etResult, USER_TEAM_ID)
    const finalized = finalizeTieIfDecided(withEt)

    if (finalized.winnerTeamId) {
      const advanced = progressBracket(updateBracketTie(finalized), teamsById, USER_TEAM_ID, seed)
      onBracketChange(advanced)
      setKfScreen('tieResult')
      return
    }

    updateBracketTie(withEt)
    const rng = new SeededRandom(`${seed}|knockout|${tie.id}|pens`)
    const pens = simulatePenaltyShootout(rng, squad, teamsById[opponentIdFor(tie)])
    setPenResult(pens)
    setKfScreen('penalties')
  }

  function handlePenaltiesDone() {
    const tie = activeTie
    if (!tie || !penResult) return
    const withPens = recordUserPenalties(tie, penResult, USER_TEAM_ID)
    const finalized = finalizeTieIfDecided(withPens)
    const advanced = progressBracket(updateBracketTie(finalized), teamsById, USER_TEAM_ID, seed)
    onBracketChange(advanced)
    setKfScreen('tieResult')
  }

  function handleTieResultContinue() {
    const tie = activeTie
    if (!tie) return
    if (tie.winnerTeamId === USER_TEAM_ID && tie.round === 'final') {
      setKfScreen('trophy')
      return
    }
    setKfScreen('bracket')
  }

  if (kfScreen === 'bracket' || !activeTie) {
    return (
      <BracketScreen
        bracket={bracket}
        teamsById={teamsById}
        userTeamId={USER_TEAM_ID}
        userTeamName={userTeamName}
        userColor={teamColor}
        onBack={onExit}
        onPlayNext={handlePlayNext}
      />
    )
  }

  const opponent = teamsById[opponentIdFor(activeTie)]
  const venue: 'HOME' | 'AWAY' = userHostsLeg(activeTie, USER_TEAM_ID, legNumber) ? 'HOME' : 'AWAY'
  const legLabel = activeTie.twoLegged
    ? `${ROUND_LABEL[activeTie.round]} · Leg ${legNumber}`
    : ROUND_LABEL[activeTie.round]

  if (kfScreen === 'match' && engineRef.current) {
    const engine = engineRef.current
    return (
      <>
        <MatchScreen
          opponent={engine.opponent}
          userTeamName={userTeamName}
          label={legLabel}
          venue={venue}
          aggregateBefore={legNumber === 2 ? userAggregateSoFar(activeTie) : undefined}
          decisions={engine.decisions}
          ambientEvents={engine.ambientEvents}
          decisionsTotal={engine.eventQueue.length}
          isComplete={engine.isComplete()}
          userColor={teamColor}
          paused={!!pendingOutcome || decisionOpen}
          onBack={onExit}
          onContinue={handleMatchContinue}
        />
        {decisionOpen && engine.currentEvent() && (
          <DecisionModal
            event={engine.currentEvent()!}
            candidates={engine.candidates()}
            actor={engine.actor()}
            index={engine.decisions.length}
            total={engine.eventQueue.length}
            minute={minuteForDecisions(engine.decisions.length, engine.eventQueue.length)}
            {...revealedScore(engine.decisions, engine.ambientEvents, minuteForDecisions(engine.decisions.length, engine.eventQueue.length))}
            onChoose={handleChoose}
          />
        )}
        {pendingOutcome && <OutcomeOverlay record={pendingOutcome} onDone={() => setPendingOutcome(null)} />}
      </>
    )
  }

  if (kfScreen === 'legResult' && engineRef.current) {
    const lastLeg = activeTie.legs[activeTie.legs.length - 1]
    const agg = userAggregateSoFar(activeTie)
    return (
      <ResultsScreen
        result={lastLeg.matchResult!}
        opponent={opponent}
        userTeamName={userTeamName}
        label={legLabel}
        venue={venue}
        userColor={teamColor}
        bannerNote={`Aggregate ${agg.mine}-${agg.theirs} — Leg 2 next`}
        continueLabel="PLAY LEG 2"
        onContinue={() => startLeg(activeTie, 2)}
      />
    )
  }

  // Extra time (and any penalties that follow) are played at whichever side hosted the deciding
  // leg — leg 2 for a two-legged tie, or the neutral-venue single-leg final.
  const etHomeVenue = activeTie.twoLegged ? userHostsLeg(activeTie, USER_TEAM_ID, 2) : true

  if (kfScreen === 'extraTime' && etResult) {
    const agg = userAggregateSoFar(activeTie)
    return (
      <ExtraTimeScreen
        opponent={opponent}
        userColor={teamColor}
        userTeamName={userTeamName}
        isHomeVenue={etHomeVenue}
        aggUserBefore={agg.mine}
        aggOppBefore={agg.theirs}
        ambientEvents={etResult.ambientEvents}
        onDone={handleExtraTimeDone}
      />
    )
  }

  if (kfScreen === 'penalties' && penResult) {
    return (
      <PenaltyShootoutScreen
        opponent={opponent}
        userColor={teamColor}
        userTeamName={userTeamName}
        isHomeVenue={etHomeVenue}
        kicks={penResult.kicks}
        onDone={handlePenaltiesDone}
      />
    )
  }

  if (kfScreen === 'tieResult') {
    return (
      <KnockoutTieResultScreen
        tie={activeTie}
        opponent={opponent}
        userTeamId={USER_TEAM_ID}
        userTeamName={userTeamName}
        userColor={teamColor}
        userAdvanced={activeTie.winnerTeamId === USER_TEAM_ID}
        isFinal={activeTie.round === 'final'}
        onContinue={handleTieResultContinue}
      />
    )
  }

  if (kfScreen === 'trophy') {
    return <TrophyScreen userTeamName={userTeamName} userColor={teamColor} onDone={onExit} />
  }

  return null
}

export function hasWonTrophy(bracket: Bracket): boolean {
  return userWonFinal(bracket, USER_TEAM_ID)
}
