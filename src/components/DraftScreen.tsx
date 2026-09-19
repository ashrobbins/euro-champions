import type { DraftSlot, Player, Squad } from '../types'
import { DRAFT_SLOTS } from '../types'
import { candidatesFor, canSelect, findPlayer, legendCount } from '../engine/draft'
import { POS_LABEL } from '../theme'
import { BackChevron, Ring, TierBadge } from './ui'
import { MiniPitch } from './MiniPitch'

interface Props {
  step: number
  picks: Partial<Squad>
  onBack: () => void
  onPick: (slot: DraftSlot, playerId: string) => void
}

export function DraftScreen({ step, picks, onBack, onPick }: Props) {
  const slot = DRAFT_SLOTS[step]
  const candidates = candidatesFor(slot)
  const totalLegends = legendCount(picks)

  const squadForPitch: Partial<Record<DraftSlot, Player>> = {}
  for (const s of DRAFT_SLOTS) {
    const id = picks[s]
    if (id) squadForPitch[s] = findPlayer(id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading  bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
          {step + 1} / 5
        </div>
        <div className="font-heading  bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-bold text-[#ffffff]">
          {totalLegends}/3 LEGENDS
        </div>
      </div>

      <div className="px-5 pt-2.5">
        <div className="font-heading text-[22px] font-bold">Build your squad</div>
        <div className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Choose one player per position. Maximum three legends in your final five.
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="font-heading text-[11px] font-bold tracking-[0.1em] text-[var(--color-text-tertiary)]">
          {POS_LABEL[slot]}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 py-2">
        {candidates.map((c) => {
          const disabled = !canSelect(picks, slot, c.id)
          return (
            <div
              key={c.id}
              onClick={disabled ? undefined : () => onPick(slot, c.id)}
              className="flex items-center gap-3 bg-black p-2.5"
              style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
            >
              <Ring player={c} size={34} />
              <div className="grow">
                <div className="text-[13px] font-semibold text-white">{c.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <TierBadge tier={c.tier} />
                  <span className="text-[10px] text-white/50">{c.traits.join(' · ')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-heading text-[17px] font-bold text-white">{c.overall}</div>
                <div className="text-[9px] tracking-wide text-white/50">OVR</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-auto px-5 pt-2 pb-4">
        <div className="mb-2.5 flex gap-2">
          {DRAFT_SLOTS.map((s, i) => (
            <div
              key={s}
              className="h-1 flex-1 "
              style={{ background: i <= step ? 'var(--color-accent)' : 'var(--color-card)' }}
            />
          ))}
        </div>
        <MiniPitch squad={squadForPitch} activeStep={step} />
      </div>
    </div>
  )
}
