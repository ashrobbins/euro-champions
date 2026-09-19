import { useEffect, useRef, useState } from 'react'
import type { AmbientEvent, Team } from '../types'
import { AccentButton, MatchHeader } from './ui'

interface Props {
  opponent: Team
  userColor: string
  userTeamName: string
  /** True when the user is the away side for this leg — swaps which side of the header the user's team sits on. */
  isHomeVenue: boolean
  /** Aggregate score heading into extra time, so the header reads as a continuation of the tie. */
  aggUserBefore: number
  aggOppBefore: number
  ambientEvents: AmbientEvent[]
  onDone: () => void
}

/** Extra time runs quicker on-screen than normal time — it's a short, tense stretch, not a full half. */
const ET_MINUTES_PER_REAL_SECOND = 3

function formatClock(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60)
  const ss = Math.floor(totalSeconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}

export function ExtraTimeScreen({ opponent, userColor, userTeamName, isHomeVenue, aggUserBefore, aggOppBefore, ambientEvents, onDone }: Props) {
  const [displaySeconds, setDisplaySeconds] = useState(90 * 60)
  const [running, setRunning] = useState(true)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const startedAt = performance.now()
    const secondsPerMs = (ET_MINUTES_PER_REAL_SECOND * 60) / 1000
    const startSeconds = 90 * 60
    const targetSeconds = 120 * 60
    const tick = (now: number) => {
      const next = startSeconds + (now - startedAt) * secondsPerMs
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
  }, [])

  const clockMinute = displaySeconds / 60
  const sortedEvents = [...ambientEvents].sort((a, b) => a.minute - b.minute)
  let userSoFar = 0
  let oppSoFar = 0
  for (const e of sortedEvents) {
    if (e.minute > clockMinute) break
    if (e.scorerName) userSoFar++
    else oppSoFar++
  }
  const revealedNewestFirst = sortedEvents.filter((e) => e.minute <= clockMinute).reverse()

  return (
    <div className="flex h-full flex-col">
      <MatchHeader
        eyebrowTop="Extra Time"
        eyebrowBottom="30 Minutes"
        homeLabel={isHomeVenue ? userTeamName : opponent.name}
        awayLabel={isHomeVenue ? opponent.name : userTeamName}
        homeGoals={isHomeVenue ? aggUserBefore + userSoFar : aggOppBefore + oppSoFar}
        awayGoals={isHomeVenue ? aggOppBefore + oppSoFar : aggUserBefore + userSoFar}
        homeColor={isHomeVenue ? userColor : opponent.accentColor}
        awayColor={isHomeVenue ? opponent.accentColor : userColor}
        clockBadge={formatClock(displaySeconds)}
      />

      <div className="min-h-0 grow px-6 pt-6.5">
        <div className="flex h-full min-h-0 flex-col bg-[var(--color-card)] p-3.5">
          <div className="font-heading mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)]">
            EXTRA TIME
          </div>
          <div className="min-h-0 grow overflow-y-auto flex flex-col gap-2 text-[13px] text-[var(--color-text-secondary)]">
            {running && <div>Both sides pushing for a winner&hellip;</div>}
            {!running && revealedNewestFirst.length === 0 && <div>Stalemate holds — this one's going to penalties.</div>}
            {revealedNewestFirst.map((e, i) => (
              <div key={i} className={`flex gap-2.5 ${e.isGoal ? 'font-bold text-[var(--color-text-primary)]' : ''}`}>
                <span className="font-heading w-7 shrink-0 tabular-nums">{e.minute}&rsquo;</span>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4.5 pb-7">{!running && <AccentButton onClick={onDone}>CONTINUE</AccentButton>}</div>
    </div>
  )
}
