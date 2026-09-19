import { useEffect, useMemo, useRef, useState } from 'react'
import teamsData from './data/teams.json'
import mockLeagueStageData from './data/mockLeagueStage.json'
import type { Bracket, DecisionRecord, DraftSlot, Fixture, LeagueRow, Player, Squad, Tactic, Team } from './types'
import { DRAFT_SLOTS } from './types'
import { findPlayer, isValidSquad, squadPlayers } from './engine/draft'
import { generateFixtures } from './engine/fixtures'
import { MatchEngine, isUserGoalEvent, minuteForDecisions, revealedScore } from './engine/simulation'
import { SeededRandom } from './engine/random'
import { buildLeagueTable } from './engine/league'
import { buildBracket } from './engine/knockout'
import { load, save, defaultState, todayId, addCareerGoals } from './engine/persistence'
import { DEFAULT_TEAM_COLOR } from './theme'
import { ScreenShell } from './components/ui'
import { HomeScreen } from './components/HomeScreen'
import { DraftScreen } from './components/DraftScreen'
import { SquadScreen } from './components/SquadScreen'
import { FixturesScreen } from './components/FixturesScreen'
import { MatchScreen } from './components/MatchScreen'
import { DecisionModal } from './components/DecisionModal'
import { OutcomeOverlay } from './components/OutcomeOverlay'
import { ResultsScreen } from './components/ResultsScreen'
import { LeagueTableScreen } from './components/LeagueTableScreen'
import { PlayerScreen } from './components/PlayerScreen'
import { KnockoutFlow } from './components/KnockoutFlow'
import { TrophyScreen } from './components/TrophyScreen'

const teams = teamsData.teams as unknown as Team[]
const teamsById: Record<string, Team> = Object.fromEntries(teams.map((t) => [t.id, t]))
const mockStandings = mockLeagueStageData.standings as LeagueRow[]

/** Fixed demo squad used to jump straight into the knockout stage via ?simKnockout, bypassing the draft. */
const SIM_SQUAD: Squad = { GK: 'kahn', DEF: 'maldini', MID: 'zidane', ATT: 'saviola', FLEX: 'parkjs' }

type Screen = 'home' | 'draft' | 'squad' | 'fixtures' | 'match' | 'results' | 'league' | 'player' | 'knockout' | 'trophy'

function App() {
  const dayId = useMemo(() => todayId(), [])
  const initial = useMemo(() => {
    const loaded = load()
    return loaded && loaded.dayId === dayId ? loaded : defaultState(dayId)
  }, [dayId])

  const [screen, setScreen] = useState<Screen>('home')
  const [draftStep, setDraftStep] = useState(0)
  const [picks, setPicks] = useState<Partial<Squad>>(initial.squad)
  const [tactic, setTactic] = useState<Tactic>(initial.tactic)
  const [fixtures, setFixtures] = useState<Fixture[]>(initial.fixtures)
  const [streak, setStreak] = useState(initial.streak)
  const [lastResult, setLastResult] = useState<string | null>(initial.lastResult)
  const [activeFixtureN, setActiveFixtureN] = useState<number | null>(null)
  const [viewedSlot, setViewedSlot] = useState<DraftSlot | null>(null)
  const [teamColor, setTeamColor] = useState<string>(initial.teamColor ?? DEFAULT_TEAM_COLOR)
  const [pendingOutcome, setPendingOutcome] = useState<DecisionRecord | null>(null)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [bracket, setBracket] = useState<Bracket | null>(null)
  const [knockoutDebugEntry, setKnockoutDebugEntry] = useState<{ tieId: string; screen: 'extraTime' } | undefined>(undefined)
  const [, forceUpdate] = useState(0)
  const engineRef = useRef<MatchEngine | null>(null)

  // ?simKnockout jumps straight to a mocked, completed league stage so the knockout bracket can be
  // reached (and tested) without playing all 8 group games first. Fixed seed — same demo bracket every time.
  // ?simExtraTime goes one step further: the user's Round of 16 tie is pre-loaded with two tied legs
  // (1-1 each), so the flow drops straight into extra time — for demoing/testing that screen (and,
  // if extra time doesn't settle it either, the penalty shootout that follows) without having to
  // manually steer a whole two-legged tie to a draw first.
  // ?simTrophy jumps straight to the champion celebration screen — winning the whole knockout bracket
  // isn't guaranteed on any given playthrough (by design, after the difficulty rebalancing), so this
  // is the reliable way to reach and check that screen without needing four rounds of lucky rolls.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('simTrophy')) {
      setPicks(SIM_SQUAD)
      setScreen('trophy')
    } else if (params.has('simExtraTime')) {
      setPicks(SIM_SQUAD)
      setTactic('balanced')
      const b = buildBracket('sim-et-fixed-seed', mockStandings)
      const tie = b.ties.find((t) => t.round === 'r16' && (t.homeTeamId === 'user' || t.awayTeamId === 'user'))!
      const tiedTie = {
        ...tie,
        legs: [
          { homeGoals: 1, awayGoals: 1, hostedByAway: false },
          { homeGoals: 1, awayGoals: 1, hostedByAway: true },
        ],
      }
      setBracket({ ...b, ties: b.ties.map((t) => (t.id === tiedTie.id ? tiedTie : t)) })
      setKnockoutDebugEntry({ tieId: tiedTie.id, screen: 'extraTime' })
      setScreen('knockout')
    } else if (params.has('simKnockout')) {
      // Optional ?simKnockout=<name> tries a different bracket draw/RNG stream — useful since the
      // default seed isn't guaranteed winnable (by design), so a different seed can be tried for a
      // more favorable run without that being a permanent, hardcoded "easy mode".
      const variant = params.get('simKnockout') || 'default'
      setPicks(SIM_SQUAD)
      setTactic('balanced')
      setBracket(buildBracket(`sim-knockout-fixed-seed-${variant}`, mockStandings))
      setScreen('knockout')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const squadValid = isValidSquad(picks)
  const squadPlayersMap = useMemo(() => {
    if (!squadValid) return null
    const map = {} as Record<DraftSlot, Player>
    for (const s of DRAFT_SLOTS) map[s] = findPlayer((picks as Squad)[s])
    return map
  }, [picks, squadValid])

  function persist(
    overrides: Partial<{
      squad: Partial<Squad>
      tactic: Tactic
      fixtures: Fixture[]
      streak: number
      lastResult: string | null
      teamColor: string
    }> = {},
  ) {
    save({
      dayId,
      squad: overrides.squad ?? picks,
      tactic: overrides.tactic ?? tactic,
      fixtures: overrides.fixtures ?? fixtures,
      streak: overrides.streak ?? streak,
      lastResult: overrides.lastResult ?? lastResult,
      teamColor: overrides.teamColor ?? teamColor,
    })
  }

  function handleSetTeamColor(color: string) {
    setTeamColor(color)
    persist({ teamColor: color })
  }

  function handlePlay() {
    if (squadValid) setScreen('squad')
    else {
      setDraftStep(0)
      setScreen('draft')
    }
  }

  /** Wipes today's squad/tactic/fixtures (keeps streak/last-result history) and starts a fresh draft. */
  function handleNewGame() {
    setPicks({})
    setTactic('balanced')
    setFixtures([])
    setActiveFixtureN(null)
    engineRef.current = null
    persist({ squad: {}, tactic: 'balanced', fixtures: [] })
    setDraftStep(0)
    setScreen('draft')
  }

  function handleDraftPick(slot: DraftSlot, playerId: string) {
    const nextPicks = { ...picks, [slot]: playerId }
    setPicks(nextPicks)
    const idx = DRAFT_SLOTS.indexOf(slot)
    if (idx < DRAFT_SLOTS.length - 1) {
      setDraftStep(idx + 1)
    } else {
      persist({ squad: nextPicks })
      setScreen('squad')
    }
  }

  function handleDraftBack() {
    if (draftStep === 0) {
      setScreen('home')
      return
    }
    setDraftStep((s) => s - 1)
  }

  function handleSetTactic(t: Tactic) {
    setTactic(t)
    persist({ tactic: t })
  }

  function handleSquadContinue() {
    let nextFixtures = fixtures
    if (nextFixtures.length === 0) {
      nextFixtures = generateFixtures(dayId, teams)
      setFixtures(nextFixtures)
      persist({ fixtures: nextFixtures })
    }
    setScreen('fixtures')
  }

  function handlePlayFixture(fixture: Fixture) {
    if (!squadValid) return
    const seed = `${dayId}|${JSON.stringify(picks)}|${fixture.opponentId}|${tactic}|game${fixture.n}`
    const rng = new SeededRandom(seed)
    const opponent = teamsById[fixture.opponentId]
    const squad = squadPlayers(picks as Squad)
    engineRef.current = new MatchEngine(rng, squad, opponent, tactic, fixture.venue === 'HOME')
    setActiveFixtureN(fixture.n)
    setPendingOutcome(null)
    setScreen('match')
    forceUpdate((t) => t + 1)
  }

  function handleMatchContinue() {
    const engine = engineRef.current
    if (!engine) return
    if (engine.isComplete()) {
      const result = engine.result()

      const matchGoals: Record<string, number> = {}
      for (const d of result.decisions) {
        if (d.outcome === 'success' && isUserGoalEvent(d.event.id)) matchGoals[d.actorName] = (matchGoals[d.actorName] ?? 0) + 1
      }
      for (const e of result.ambientEvents) {
        if (e.isGoal && e.scorerName) matchGoals[e.scorerName] = (matchGoals[e.scorerName] ?? 0) + 1
      }
      addCareerGoals(matchGoals)

      const nextFixtures = fixtures.map((f) => (f.n === activeFixtureN ? { ...f, result } : f))
      setFixtures(nextFixtures)
      const resultLabel =
        result.userGoals > result.oppGoals
          ? `W ${result.userGoals}-${result.oppGoals}`
          : result.userGoals === result.oppGoals
            ? `D ${result.userGoals}-${result.oppGoals}`
            : `L ${result.userGoals}-${result.oppGoals}`
      const nextStreak = result.userGoals > result.oppGoals ? streak + 1 : 0
      setStreak(nextStreak)
      setLastResult(resultLabel)
      persist({ fixtures: nextFixtures, streak: nextStreak, lastResult: resultLabel })
      setScreen('results')
    } else {
      setDecisionOpen(true)
    }
  }

  function handleChoose(choiceIndex: 0 | 1 | 2) {
    const engine = engineRef.current
    if (!engine) return
    const record = engine.resolveChoice(choiceIndex)
    setPendingOutcome(record)
    setDecisionOpen(false)
    forceUpdate((t) => t + 1)
  }

  function handleEnterKnockout() {
    setBracket(buildBracket(dayId, leagueRows))
    setScreen('knockout')
  }

  const leagueRows = useMemo(() => {
    if (screen !== 'league') return []
    return buildLeagueTable(dayId, teams, 'Your Squad', teamColor, fixtures)
  }, [screen, dayId, fixtures, teamColor])

  const engine = engineRef.current
  const activeFixture = fixtures.find((f) => f.n === activeFixtureN)

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6">
      <ScreenShell>
        {screen === 'home' && (
          <HomeScreen onPlay={handlePlay} onNewGame={handleNewGame} hasSquad={squadValid} />
        )}

        {screen === 'draft' && (
          <DraftScreen step={draftStep} picks={picks} onBack={handleDraftBack} onPick={handleDraftPick} />
        )}

        {screen === 'squad' && squadValid && squadPlayersMap && (
          <SquadScreen
            squad={picks as Squad}
            players={squadPlayersMap}
            tactic={tactic}
            teamColor={teamColor}
            onBack={() => setScreen('home')}
            onSetTactic={handleSetTactic}
            onSetTeamColor={handleSetTeamColor}
            onViewPlayer={(slot) => {
              setViewedSlot(slot)
              setScreen('player')
            }}
            onContinue={handleSquadContinue}
          />
        )}

        {screen === 'fixtures' && (
          <FixturesScreen fixtures={fixtures} teamsById={teamsById} onBack={() => setScreen('squad')} onPlayNext={handlePlayFixture} />
        )}

        {screen === 'match' && engine && activeFixtureN && (
          <>
            <MatchScreen
              opponent={engine.opponent}
              label={`Group ${activeFixtureN}`}
              venue={activeFixture?.venue ?? 'HOME'}
              decisions={engine.decisions}
              ambientEvents={engine.ambientEvents}
              decisionsTotal={engine.eventQueue.length}
              isComplete={engine.isComplete()}
              userColor={teamColor}
              paused={!!pendingOutcome || decisionOpen}
              onBack={() => setScreen('fixtures')}
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
        )}

        {screen === 'results' && engine && activeFixtureN && (
          <ResultsScreen
            result={engine.result()}
            opponent={engine.opponent}
            label={`Group ${activeFixtureN}`}
            venue={activeFixture?.venue ?? 'HOME'}
            userColor={teamColor}
            onContinue={() => setScreen('league')}
            onViewFixtures={() => setScreen('fixtures')}
          />
        )}

        {screen === 'league' && (
          <LeagueTableScreen
            rows={leagueRows}
            gamesPlayed={fixtures.filter((f) => f.result).length}
            onBack={() => setScreen('squad')}
            onNextFixture={() => setScreen('fixtures')}
            onEnterKnockout={handleEnterKnockout}
          />
        )}

        {screen === 'player' && viewedSlot && squadValid && (
          <PlayerScreen player={findPlayer((picks as Squad)[viewedSlot])} onBack={() => setScreen('squad')} />
        )}

        {screen === 'knockout' && bracket && squadValid && (
          <KnockoutFlow
            bracket={bracket}
            onBracketChange={setBracket}
            teamsById={teamsById}
            squad={squadPlayers(picks as Squad)}
            tactic={tactic}
            teamColor={teamColor}
            seed={dayId}
            onExit={() => setScreen('league')}
            debugEntry={knockoutDebugEntry}
          />
        )}

        {screen === 'trophy' && (
          <TrophyScreen userTeamName="Your Squad" userColor={teamColor} onDone={() => setScreen('home')} />
        )}
      </ScreenShell>
    </div>
  )
}

export default App
