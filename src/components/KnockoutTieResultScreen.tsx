import type { KnockoutRoundId, KnockoutTie, Team } from '../types'
import { ROUND_LABEL, tieAggregate } from '../engine/knockout'
import { AccentButton } from './ui'

interface Props {
  tie: KnockoutTie
  opponent: Team
  userTeamId: string
  userTeamName: string
  userColor: string
  userAdvanced: boolean
  isFinal: boolean
  onContinue: () => void
}

const DECIDED_BY_NOTE: Record<NonNullable<KnockoutTie['decidedBy']>, string> = {
  regulation: 'Decided on aggregate',
  extraTime: 'Decided after extra time',
  penalties: 'Decided on penalties',
}

export function KnockoutTieResultScreen({ tie, opponent, userTeamId, userTeamName, userColor, userAdvanced, isFinal, onContinue }: Props) {
  const agg = tieAggregate(tie)
  const userIsHome = tie.homeTeamId === userTeamId
  const mine = userIsHome ? agg.home : agg.away
  const theirs = userIsHome ? agg.away : agg.home
  const roundLabel = ROUND_LABEL[tie.round as KnockoutRoundId]

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center" style={{ background: '#ffffff' }}>
      <div>
        <div className="font-heading text-[13px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-accent)' }}>
          {roundLabel}
          {tie.twoLegged ? ' · Aggregate' : ''}
        </div>
        <div className="font-heading mt-3 text-[40px] leading-[1.02] font-bold uppercase">
          {userAdvanced ? (isFinal ? 'You Won!' : 'You Advance') : 'Knocked Out'}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="h-3 w-3" style={{ background: userColor }} />
          <span className="text-[13px] font-semibold">{userTeamName}</span>
        </div>
        <div className="flex items-baseline">
          <span className="font-heading text-[48px] leading-none tabular-nums">{mine}</span>
          <span className="font-heading px-1 text-[48px] leading-none tabular-nums text-black/25">:</span>
          <span className="font-heading text-[48px] leading-none tabular-nums">{theirs}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="h-3 w-3" style={{ background: opponent.accentColor }} />
          <span className="text-[13px] font-semibold">{opponent.name}</span>
        </div>
      </div>

      {tie.decidedBy && tie.decidedBy !== 'regulation' && (
        <div className="text-[12px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
          {DECIDED_BY_NOTE[tie.decidedBy]}
        </div>
      )}

      <p className="max-w-[280px] text-sm text-[var(--color-text-secondary)]">
        {userAdvanced
          ? isFinal
            ? "You're through — the trophy's next."
            : `Onward to the ${nextRoundLabel(tie.round)}.`
          : "The run ends here — thanks for the ride."}
      </p>

      <div className="w-full max-w-[280px]">
        <AccentButton onClick={onContinue}>{userAdvanced && isFinal ? 'LIFT THE TROPHY' : 'CONTINUE'}</AccentButton>
      </div>
    </div>
  )
}

function nextRoundLabel(round: KnockoutRoundId): string {
  const order: KnockoutRoundId[] = ['r16', 'qf', 'sf', 'final']
  const idx = order.indexOf(round)
  return ROUND_LABEL[order[idx + 1]] ?? 'Final'
}
