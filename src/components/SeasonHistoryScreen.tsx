import type { KnockoutOutcome, SeasonRecord } from '../engine/persistence'
import { BackChevron } from './ui'

interface Props {
  records: SeasonRecord[]
  onBack: () => void
}

const OUTCOME_LABEL: Record<KnockoutOutcome, string> = {
  r16: 'Eliminated — Round of 16',
  qf: 'Eliminated — Quarter-Final',
  sf: 'Eliminated — Semi-Final',
  final: 'Runner-Up',
  champion: 'Champions',
}

function outcomeLabel(record: SeasonRecord): string {
  if (record.knockoutOutcome) return OUTCOME_LABEL[record.knockoutOutcome]
  return record.qualifiedForKnockout ? 'Qualified — knockout not played' : 'Group Stage'
}

function outcomeColor(record: SeasonRecord): string {
  if (record.knockoutOutcome === 'champion') return 'var(--color-gold)'
  if (record.knockoutOutcome) return 'var(--color-accent)'
  return 'var(--color-text-tertiary)'
}

function formatDate(dayId: string): string {
  const d = new Date(`${dayId}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dayId
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n}st`
  if (n % 10 === 2 && n % 100 !== 12) return `${n}nd`
  if (n % 10 === 3 && n % 100 !== 13) return `${n}rd`
  return `${n}th`
}

export function SeasonHistoryScreen({ records, onBack }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading text-[15px] font-bold">Season History</div>
        <div className="w-5.5" />
      </div>

      {records.length === 0 ? (
        <div className="flex grow flex-col items-center justify-center gap-2 px-8 text-center">
          <div className="font-heading text-[17px] font-bold">No seasons yet</div>
          <p className="m-0 max-w-[240px] text-sm text-[var(--color-text-secondary)]">
            Finish a group stage (or start a new one) and it'll show up here.
          </p>
        </div>
      ) : (
        <div className="min-h-0 grow overflow-y-auto px-5 pt-3.5">
          <div className="flex flex-col gap-2.5 pb-6">
            {records.map((r, i) => (
              <div key={i} className="bg-[var(--color-card)] p-3.5 rounded-2xl shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div className="font-heading text-[14px] font-bold">{r.teamName}</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">{formatDate(r.dayId)}</div>
                </div>

                <div
                  className="font-heading mt-1 text-[11px] font-bold tracking-[0.06em] uppercase"
                  style={{ color: outcomeColor(r) }}
                >
                  {outcomeLabel(r)}
                </div>

                <div className="mt-2.5 flex items-center gap-3.5 text-[12px] text-[var(--color-text-secondary)]">
                  <span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {r.won}-{r.drawn}-{r.lost}
                    </span>{' '}
                    W-D-L
                  </span>
                  <span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{r.points}</span> pts
                  </span>
                  <span>
                    Finished{' '}
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {ordinal(r.position)}
                    </span>{' '}
                    of {r.totalTeams}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
