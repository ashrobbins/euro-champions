import { useEffect, useRef, useState } from 'react'
import type { AmbientEvent, DecisionRecord, Team } from '../types'
import { isOppGoalEvent, isUserGoalEvent, minuteForDecisions } from '../engine/simulation'
import { AccentButton, MatchHeader } from './ui'

interface Props {
  opponent: Team
  /** Eyebrow label, e.g. "Group 3" or "Round of 16 · Leg 1". */
  label: string
  venue: 'HOME' | 'AWAY'
  /** Goals already banked from a prior leg of the same knockout tie — the header adds this match's live score on top and shows the running total. */
  aggregateBefore?: { mine: number; theirs: number }
  decisions: DecisionRecord[]
  ambientEvents: AmbientEvent[]
  decisionsTotal: number
  isComplete: boolean
  userColor: string
  /** True while the outcome overlay for the last decision is still showing — freezes the clock until it clears. */
  paused: boolean
  onBack: () => void
  onContinue: () => void
}

/** Game-minutes that pass per real second — a fast-moving seconds hand, a slower-creeping minute count. */
const GAME_MINUTES_PER_REAL_SECOND = 4
const AUTO_ADVANCE_DELAY_MS = 1500

function formatClock(totalGameSeconds: number): string {
  const mm = Math.floor(totalGameSeconds / 60)
  const ss = Math.floor(totalGameSeconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}

const LEAD_IN_LINES = [
  "The crowd holds its breath…",
  'A promising-looking attack is building…',
  'Tension rising around the ground…',
  'This could be the moment that decides it…',
  'Everyone in the stadium can feel this one…',
  'The atmosphere just changed…',
  'All eyes are on this passage of play…',
  'This is shaping up to be a pivotal moment…',
]

export function MatchScreen({
  opponent,
  label,
  venue,
  aggregateBefore,
  decisions,
  ambientEvents,
  decisionsTotal,
  isComplete,
  userColor,
  paused,
  onBack,
  onContinue,
}: Props) {
  const targetMinute = isComplete ? 90 : minuteForDecisions(decisions.length, decisionsTotal)
  const startMinute = decisions.length === 0 ? 0 : minuteForDecisions(decisions.length - 1, decisionsTotal)
  const leadIn = LEAD_IN_LINES[decisions.length % LEAD_IN_LINES.length]

  const [displaySeconds, setDisplaySeconds] = useState(startMinute * 60)
  const [running, setRunning] = useState(false)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (paused) return
    const targetSeconds = targetMinute * 60
    const startSeconds = startMinute * 60
    if (targetSeconds <= startSeconds) {
      setDisplaySeconds(targetSeconds)
      setRunning(false)
      return
    }
    setRunning(true)
    const startedAt = performance.now()
    const secondsPerMs = (GAME_MINUTES_PER_REAL_SECOND * 60) / 1000
    const tick = (now: number) => {
      const elapsed = (now - startedAt) * secondsPerMs
      const next = startSeconds + elapsed
      if (next >= targetSeconds) {
        setDisplaySeconds(targetSeconds)
        setRunning(false)
        return
      }
      setDisplaySeconds(next)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  // Once the clock catches up, move straight into the next decision — no CTA to tap.
  // Full time is the one deliberate pause point, left to a manual continue.
  useEffect(() => {
    if (paused || running || isComplete) return
    const t = setTimeout(onContinue, AUTO_ADVANCE_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, running, isComplete])

  // Ambient goals are independent of the user's choices, so they're revealed strictly by the
  // clock's own live position — never by the (later) target it's animating towards, and never
  // by isComplete firing early — so a goal can never appear in the feed before the on-screen
  // clock has actually reached its minute. Even at full time, displaySeconds itself keeps
  // animating up to 90:00 before this reaches 90, so there's no need to special-case it here.
  // Decision entries need no such guard: the clock always finishes animating to a decision's
  // minute before that decision fires, so they're already safe to show as soon as resolved.
  const clockMinute = displaySeconds / 60
  const rawItems = [
    ...decisions.map((d) => {
      const userGoal = d.outcome === 'success' && isUserGoalEvent(d.event.id)
      const oppGoal = d.outcome === 'failure' && isOppGoalEvent(d.event.id)
      const isGoal = userGoal || oppGoal
      return {
        minute: d.minute,
        text: d.summary,
        isGoal,
        team: userGoal ? ('user' as const) : oppGoal ? ('opp' as const) : undefined,
        playerName: userGoal ? d.actorName : oppGoal ? opponent.name : undefined,
      }
    }),
    ...ambientEvents
      .filter((e) => e.minute <= clockMinute)
      .map((e) => ({
        minute: e.minute,
        text: e.text,
        isGoal: e.isGoal,
        team: e.isGoal ? (e.scorerName ? ('user' as const) : ('opp' as const)) : undefined,
        playerName: e.isGoal ? (e.scorerName ?? opponent.name) : undefined,
      })),
  ].sort((a, b) => a.minute - b.minute)

  // Running score is derived from the same sorted feed the ticker renders, so the score badge
  // on each goal line and the live header score can never drift apart.
  let runningUser = 0
  let runningOpp = 0
  const ticker = rawItems.map((item) => {
    if (item.isGoal) {
      if (item.team === 'user') runningUser++
      else runningOpp++
    }
    return { ...item, scoreAfter: item.isGoal ? `${runningUser}-${runningOpp}` : null }
  })
  const displayUserGoals = runningUser
  const displayOppGoals = runningOpp
  // Newest event first, so the running score is always visible without scrolling as the feed grows.
  const tickerNewestFirst = [...ticker].reverse()
  const aggregateNote = aggregateBefore
    ? `Aggregate ${aggregateBefore.mine + displayUserGoals}-${aggregateBefore.theirs + displayOppGoals}`
    : undefined

  // The header always reads left-to-right as "home side, away side" — so when we're the away
  // side, "Your Squad" moves to the right-hand slot instead of always sitting on the left.
  const isHomeVenue = venue === 'HOME'

  return (
    <div className="flex h-full flex-col">
      <MatchHeader
        eyebrowTop={label}
        eyebrowBottom="Live Match"
        onBack={onBack}
        homeLabel={isHomeVenue ? 'Your Squad' : opponent.name}
        homeSub={isHomeVenue ? 'Home' : 'Away'}
        awayLabel={isHomeVenue ? opponent.name : 'Your Squad'}
        awaySub={isHomeVenue ? 'Away' : 'Home'}
        homeGoals={isHomeVenue ? displayUserGoals : displayOppGoals}
        awayGoals={isHomeVenue ? displayOppGoals : displayUserGoals}
        homeColor={isHomeVenue ? userColor : opponent.accentColor}
        awayColor={isHomeVenue ? opponent.accentColor : userColor}
        clockBadge={formatClock(displaySeconds)}
        aggregateNote={aggregateNote}
      />

      <div className="grow px-6 pt-6.5">
        <div className="flex h-full flex-col  bg-[var(--color-card)] p-3.5">
          <div className="font-heading mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)]">
            MATCH EVENTS
          </div>
          <div className="flex flex-col gap-2 text-[13px] text-[var(--color-text-secondary)] overflow-y-auto">
            {!paused && running && <div className="text-[var(--color-text-secondary)]">Play in progress&hellip;</div>}
            {!paused && !running && !isComplete && (
              <div className="text-[var(--color-text-primary)] font-medium">{leadIn}</div>
            )}
            {tickerNewestFirst.length === 0 && <div>Kickoff — settling into the match.</div>}
            {tickerNewestFirst.map((entry, i) =>
              entry.isGoal ? (
                <div key={i} className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-0.5">
                  <span className="font-heading tabular-nums text-[15px] font-bold text-[var(--color-text-primary)]">
                    {entry.minute}&rsquo;
                  </span>
                  <span className="font-heading text-[15px] font-bold tracking-wide text-[var(--color-text-primary)] uppercase">
                    GOAL! {entry.playerName} &mdash; {entry.scoreAfter}
                  </span>
                  <span />
                  <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">{entry.text}</span>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="font-heading w-7 shrink-0 tabular-nums text-[var(--color-text-tertiary)]">
                    {entry.minute}&rsquo;
                  </span>
                  <span>{entry.text}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4.5 pb-7">
        {isComplete && !paused && !running && <AccentButton onClick={onContinue}>FULL TIME — CONTINUE</AccentButton>}
      </div>
    </div>
  )
}
