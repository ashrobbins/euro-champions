import type { DraftSlot, Player, Squad } from '../types'
import { DRAFT_SLOTS } from '../types'
import { candidatesFor, findPlayer } from '../engine/draft'
import { POS_LABEL } from '../theme'
import { BackChevron, Ring } from './ui'
import { MiniPitch } from './MiniPitch'

interface Props {
  step: number
  picks: Partial<Squad>
  /** Seeds which random 5 candidates are offered per position (see engine/draft.ts) — stable for the day. */
  seed: string
  onBack: () => void
  onPick: (slot: DraftSlot, playerId: string) => void
}

export function DraftScreen({ step, picks, seed, onBack, onPick }: Props) {
  const slot = DRAFT_SLOTS[step]
  const candidates = candidatesFor(slot, seed)

  const squadForPitch: Partial<Record<DraftSlot, Player>> = {}
  for (const s of DRAFT_SLOTS) {
    const id = picks[s]
    if (id) squadForPitch[s] = findPlayer(id)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading rounded-full bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
          {step + 1} / 5
        </div>
        <div className="w-5.5" />
      </div>

      <div className="px-5 pt-2.5">
        <div className="font-heading text-[22px] font-bold">Build your squad</div>
        <div className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Choose one player per position.
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="font-heading text-[11px] font-bold tracking-[0.1em] text-[var(--color-text-tertiary)]">
          {POS_LABEL[slot]}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 py-2">
        {candidates.map((c) => (
          <div
            key={c.id}
            onClick={() => onPick(slot, c.id)}
            className="flex cursor-pointer items-center gap-3 bg-[var(--color-card)] p-2.5 rounded-2xl shadow-[var(--shadow-card)]"
          >
            <Ring player={c} size={34} />
            <div className="grow">
              <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{c.name}</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">{c.traits.join(' · ')}</div>
            </div>
            <div className="text-right">
              <div className="font-heading text-[17px] font-bold text-[var(--color-text-primary)]">{c.overall}</div>
              <div className="text-[9px] tracking-wide text-[var(--color-text-tertiary)]">OVR</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 shrink-0 px-5 pb-4">
        <div className="mb-2.5 flex gap-2">
          {DRAFT_SLOTS.map((s, i) => (
            <div
              key={s}
              className="h-1 flex-1 "
              style={{ background: i <= step ? 'var(--color-accent)' : 'var(--color-card)' }}
            />
          ))}
        </div>
        <MiniPitch squad={squadForPitch} activeStep={step} height={150} />
      </div>
    </div>
  )
}
