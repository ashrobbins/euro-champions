import { useEffect, useRef } from 'react'
import type { LeagueRow } from '../types'
import { BackChevron, AccentButton } from './ui'

interface Props {
  rows: LeagueRow[]
  gamesPlayed: number
  onBack: () => void
  onNextFixture: () => void
  onEnterKnockout: () => void
}

export function LeagueTableScreen({ rows, gamesPlayed, onBack, onNextFixture, onEnterKnockout }: Props) {
  const userIndex = rows.findIndex((r) => r.teamId === 'user')
  const seasonComplete = gamesPlayed >= 8
  const qualified = userIndex >= 0 && userIndex < 24
  const userRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    userRowRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading text-[15px] font-bold">Group Stage</div>
        <div className="w-5" />
      </div>
      <div className="px-5 pt-1 pb-3.5 text-center text-xs text-[var(--color-text-tertiary)]">
        8 games &middot; standalone table &middot; game {gamesPlayed} of 8
      </div>

      <div className="min-h-0 grow overflow-y-auto">
        <div className="flex gap-2.5 border-b border-[var(--color-card-border)] px-4.5 pb-2 text-[10px] font-bold tracking-wide text-[var(--color-text-tertiary)]">
          <span className="w-5">#</span>
          <span className="grow">TEAM</span>
          <span className="w-6.5 text-center">P</span>
          <span className="w-6.5 text-center">GD</span>
          <span className="w-7 text-right">PTS</span>
        </div>
        {rows.map((r, i) => {
          const isUser = r.teamId === 'user'
          return (
            <div
              key={r.teamId}
              ref={isUser ? userRowRef : undefined}
              className="flex items-center gap-2.5 px-4.5 py-2.5 text-[12.5px]"
              style={isUser ? { background: 'rgba(139,92,246,0.16)' } : undefined}
            >
              <span className="w-5" style={{ color: isUser ? 'var(--color-accent)' : 'var(--color-text-tertiary)', fontWeight: 600 }}>
                {i + 1}
              </span>
              <span className="h-2.5 w-2.5 shrink-0 " style={{ background: r.accentColor }} />
              <span className="grow" style={isUser ? { fontWeight: 700, color: 'var(--color-text-primary)' } : undefined}>
                {r.teamName}
              </span>
              <span className="w-6.5 text-center text-[var(--color-text-secondary)]">{r.played}</span>
              <span className="w-6.5 text-center text-[var(--color-text-secondary)]">
                {r.goalsFor - r.goalsAgainst >= 0 ? '+' : ''}
                {r.goalsFor - r.goalsAgainst}
              </span>
              <span className="w-7 text-right font-bold" style={{ color: isUser ? 'var(--color-accent)' : undefined }}>
                {r.points}
              </span>
            </div>
          )
        })}
      </div>

      {userIndex >= 0 && (
        <div className="px-5 pt-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
          You're {userIndex + 1}
          {userIndex === 0 ? 'st' : userIndex === 1 ? 'nd' : userIndex === 2 ? 'rd' : 'th'} of {rows.length}
        </div>
      )}

      <div className="border-t border-[var(--color-card-border)] px-5 pt-4 pb-7">
        {seasonComplete ? (
          qualified ? (
            <div className="mb-2.5">
              <AccentButton onClick={onEnterKnockout}>CONTINUE TO KNOCKOUT STAGE</AccentButton>
            </div>
          ) : (
            <div className="mb-2.5 text-center text-[13px] font-semibold text-[var(--color-text-secondary)]">
              Finished {userIndex + 1}
              {userIndex === 2 ? 'rd' : 'th'} — outside the top 24. No knockout stage this season.
            </div>
          )
        ) : (
          <div className="mb-2.5">
            <AccentButton onClick={onNextFixture}>NEXT FIXTURE</AccentButton>
          </div>
        )}
        <div className="text-center text-[11px] text-[var(--color-text-tertiary)]">
          AI opponents only &middot; no live multiplayer
        </div>
      </div>
    </div>
  )
}
