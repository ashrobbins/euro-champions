import type { Player, StatField } from '../types'
import { STAT_FIELDS } from '../types'
import { POS_LABEL } from '../theme'
import { BackChevron, Ring } from './ui'

const STAT_LABEL: Record<StatField, string> = {
  finishing: 'Finishing',
  passing: 'Passing',
  composure: 'Composure',
  setPieces: 'Set Pieces',
  defending: 'Defending',
  goalkeeping: 'Goalkeeping',
  pace: 'Pace',
  stamina: 'Stamina',
}

export function PlayerScreen({ player, onBack }: { player: Player; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5">
        <BackChevron onClick={onBack} />
      </div>

      <div className="flex items-center gap-3.5 px-6 pt-3.5">
        <Ring player={player} size={56} />
        <div>
          <div className="font-heading text-[20px] font-bold">{player.name}</div>
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-full bg-[var(--color-card)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)]">
              {POS_LABEL[player.position]}
            </span>
          </div>
        </div>
        <div className="ml-auto text-center">
          <div className="font-heading text-[26px] font-bold text-[var(--color-accent)]">{player.overall}</div>
          <div className="text-[9px] text-[var(--color-text-tertiary)]">OVR</div>
        </div>
      </div>

      <div className="px-6 pt-6.5">
        {STAT_FIELDS.map((stat) => {
          const value = player.ratings[stat]
          const irrelevant = value < 30
          return (
            <div key={stat} className="mb-3 flex items-center gap-2.5">
              <span className="w-[88px] text-xs text-[var(--color-text-secondary)]">{STAT_LABEL[stat]}</span>
              <div className="h-1.5 grow overflow-hidden rounded-full bg-[var(--color-card)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, background: irrelevant ? 'var(--color-text-tertiary)' : 'var(--color-accent)' }}
                />
              </div>
              <span className="w-6 text-right text-xs font-semibold text-[var(--color-text-secondary)]">{value}</span>
            </div>
          )
        })}
      </div>

      <div className="px-6 pt-2.5">
        <div className="font-heading mb-2 text-[11px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)]">
          TRAITS
        </div>
        <div className="flex flex-wrap gap-2">
          {player.traits.map((t) => (
            <span
              key={t}
              className="rounded-full bg-[var(--color-card)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-[var(--color-card-border)] px-6 pt-4.5 pb-7 text-center text-xs text-[var(--color-text-tertiary)]">
        Ratings are the only source of truth — no hidden stats.
      </div>
    </div>
  )
}
