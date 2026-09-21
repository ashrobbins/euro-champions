import type { Fixture, Team } from '../types'
import { BackChevron, AccentButton } from './ui'

interface Props {
  fixtures: Fixture[]
  teamsById: Record<string, Team>
  onBack: () => void
  onPlayNext: (fixture: Fixture) => void
}

export function FixturesScreen({ fixtures, teamsById, onBack, onPlayNext }: Props) {
  const nextIndex = fixtures.findIndex((f) => !f.result)
  const nextFixture = nextIndex >= 0 ? fixtures[nextIndex] : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading text-[15px] font-bold">Group Fixtures</div>
        <div className="w-[22px]" />
      </div>
      <div className="px-5 pt-1 pb-3.5 text-center text-xs text-[var(--color-text-tertiary)]">
        8 games &middot; home &amp; away &middot; same squad throughout
      </div>

      <div className="flex grow flex-col gap-2 px-5">
        {fixtures.map((f, i) => {
          const opp = teamsById[f.opponentId]
          const isNext = i === nextIndex
          const played = !!f.result
          const resultLabel = played
            ? f.result!.userGoals > f.result!.oppGoals
              ? `W ${f.result!.userGoals}–${f.result!.oppGoals}`
              : f.result!.userGoals === f.result!.oppGoals
                ? `D ${f.result!.userGoals}–${f.result!.oppGoals}`
                : `L ${f.result!.userGoals}–${f.result!.oppGoals}`
            : isNext
              ? 'NEXT'
              : '—'
          return (
            <div
              key={f.n}
              className="flex items-center gap-2.5 rounded-xl border bg-[var(--color-card)] px-2.5 py-1.5 shadow-[var(--shadow-card)]"
              style={{
                borderColor: isNext ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
                boxShadow: isNext ? '0 0 0 1px var(--color-accent) inset' : undefined,
              }}
            >
              <span className="w-4 shrink-0 text-[9px] font-bold text-[var(--color-text-tertiary)]">{f.n}</span>
              <div className="h-2.5 w-2.5 shrink-0 " style={{ background: opp.accentColor }} />
              <div className="grow">
                <div className="text-[13px] font-semibold">{opp.name}</div>
                <div className="mt-px text-[10px] tracking-wide text-[var(--color-text-tertiary)]">{f.venue}</div>
              </div>
              <span
                className="font-heading text-xs font-bold"
                style={{ color: isNext ? 'var(--color-accent)' : played ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}
              >
                {resultLabel}
              </span>
            </div>
          )
        })}
      </div>

      <div className="border-t border-[var(--color-card-border)] px-5 pt-4 pb-7">
        {nextFixture && (
          <div className="mb-2.5">
            <AccentButton onClick={() => onPlayNext(nextFixture)}>KICK OFF</AccentButton>
          </div>
        )}
        <div className="text-center text-[11px] text-[var(--color-text-tertiary)]">
          Away fixtures trim your win probability slightly
        </div>
      </div>
    </div>
  )
}
