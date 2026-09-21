import { useEffect, useState } from 'react'
import type { Team } from '../types'
import type { RawPenaltyKick } from '../engine/simulation'
import { AccentButton, MatchHeader } from './ui'

interface Props {
  opponent: Team
  userColor: string
  userTeamName: string
  /** True when the user is the away side for this leg — swaps which side of the header the user's team sits on. */
  isHomeVenue: boolean
  kicks: RawPenaltyKick[]
  onDone: () => void
}

const REVEAL_MS = 650

function PenaltyRow({ label, color, kicks }: { label: string; color: string; kicks: RawPenaltyKick[] }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[96px] shrink-0 truncate border-l-[3px] pl-2 text-[12px] font-semibold" style={{ borderColor: color }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {kicks.map((k, i) => (
          <span key={i} className="h-5 w-5" style={{ background: k.scored ? 'var(--color-green)' : 'var(--color-red)' }} />
        ))}
        {Array.from({ length: Math.max(0, 5 - kicks.length) }).map((_, i) => (
          <span key={`pending-${i}`} className="h-5 w-5" style={{ background: 'rgba(255,255,255,0.10)' }} />
        ))}
      </div>
    </div>
  )
}

export function PenaltyShootoutScreen({ opponent, userColor, userTeamName, isHomeVenue, kicks, onDone }: Props) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (revealed >= kicks.length) return
    const t = setTimeout(() => setRevealed((n) => n + 1), REVEAL_MS)
    return () => clearTimeout(t)
  }, [revealed, kicks.length])

  const shown = kicks.slice(0, revealed)
  const userShown = shown.filter((k) => k.side === 'user')
  const oppShown = shown.filter((k) => k.side === 'opp')
  const userScore = userShown.filter((k) => k.scored).length
  const oppScore = oppShown.filter((k) => k.scored).length
  const done = revealed >= kicks.length
  const latest = shown[shown.length - 1]

  return (
    <div className="flex h-full flex-col">
      <MatchHeader
        eyebrowTop="Penalty Shootout"
        eyebrowBottom="Sudden Death If Level"
        homeLabel={isHomeVenue ? userTeamName : opponent.name}
        awayLabel={isHomeVenue ? opponent.name : userTeamName}
        homeGoals={isHomeVenue ? userScore : oppScore}
        awayGoals={isHomeVenue ? oppScore : userScore}
        homeColor={isHomeVenue ? userColor : opponent.accentColor}
        awayColor={isHomeVenue ? opponent.accentColor : userColor}
      />

      <div className="min-h-0 grow px-6 pt-6.5">
        <div className="flex h-full min-h-0 flex-col gap-5 bg-[var(--color-card)] p-4 rounded-2xl shadow-[var(--shadow-card)]">
          <PenaltyRow label={userTeamName} color={userColor} kicks={userShown} />
          <PenaltyRow label={opponent.name} color={opponent.accentColor} kicks={oppShown} />

          <div className="min-h-0 grow mt-2 flex flex-col gap-1.5 overflow-y-auto text-[13px] text-[var(--color-text-secondary)]">
            {shown
              .slice()
              .reverse()
              .map((k, i) => (
                <div
                  key={i}
                  className={i === 0 ? 'font-heading text-[15px] font-bold text-[var(--color-text-primary)]' : ''}
                >
                  {k.side === 'user' ? userTeamName : opponent.name} &mdash; {k.takerName}: {k.scored ? 'Scored!' : 'Missed'}
                </div>
              ))}
          </div>

          {!done && latest === undefined && (
            <div className="text-[13px] font-medium text-[var(--color-text-primary)]">Stepping up first&hellip;</div>
          )}
        </div>
      </div>

      <div className="px-6 pt-4.5 pb-7">{done && <AccentButton onClick={onDone}>CONTINUE</AccentButton>}</div>
    </div>
  )
}
