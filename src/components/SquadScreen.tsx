import { useState } from 'react'
import type { DraftSlot, Player, Squad, Tactic } from '../types'
import { DRAFT_SLOTS } from '../types'
import { squadOverall } from '../engine/draft'
import { TEAM_COLORS } from '../theme'
import { BackChevron, AccentButton, Ring } from './ui'
import { MiniPitch } from './MiniPitch'

interface Props {
  squad: Squad
  players: Record<DraftSlot, Player>
  tactic: Tactic
  teamColor: string
  onBack: () => void
  onSetTactic: (t: Tactic) => void
  onSetTeamColor: (color: string) => void
  onViewPlayer: (slot: DraftSlot) => void
  onContinue: () => void
}

const TACTICS: { id: Tactic; label: string }[] = [
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'defensive', label: 'Defensive' },
]

export function SquadScreen({ squad, players, tactic, teamColor, onBack, onSetTactic, onSetTeamColor, onViewPlayer, onContinue }: Props) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const legends = DRAFT_SLOTS.filter((s) => players[s].tier === 'legend').length
  const overall = squadOverall(squad)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <BackChevron onClick={onBack} />
        <div className="font-heading text-[15px] font-bold">Your Squad</div>
        <div className="w-[22px]" />
      </div>

      <div className="flex gap-2 px-5 pt-3.5">
        <div className="font-heading bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-bold text-[#ffffff]">
          {legends}/3 LEGENDS
        </div>
        <div className="font-heading bg-[var(--color-card)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
          {overall} OVR
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-5 pt-3.5">
        {DRAFT_SLOTS.map((slot) => {
          const p = players[slot]
          return (
            <div
              key={slot}
              onClick={() => onViewPlayer(slot)}
              className="flex cursor-pointer items-center gap-2.5 bg-[var(--color-card)] px-2.5 py-1.5"
            >
              <span className="w-[30px] shrink-0 text-[9px] font-bold tracking-wide text-[var(--color-text-tertiary)]">
                {slot}
              </span>
              <Ring player={p} size={26} />
              <div className="grow text-xs font-semibold">{p.name}</div>
              <span className="font-heading text-[13px] font-bold">{p.overall}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2.5 px-5 pt-4">
        <div className="flex-1">
          <div className="font-heading mb-2 text-[11px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)]">
            TACTIC
          </div>
          <div className="flex gap-2">
            {TACTICS.map((t) => {
              const active = tactic === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => onSetTactic(t.id)}
                  className="flex-1 cursor-pointer py-2.5 text-center text-xs"
                  style={{
                    background: active ? 'var(--color-accent)' : 'black',
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {t.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative" style={{ width: 42 }}>
          <div className="font-heading mb-2 text-[11px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)]">
            COLOUR
          </div>
          <div
            onClick={() => setColorPickerOpen((v) => !v)}
            className="flex cursor-pointer items-center justify-center bg-black"
            style={{ height: 38, width: 38 }}
          >
            <div className="h-4 w-4" style={{ background: teamColor }} />
          </div>

          {colorPickerOpen && (
            <div
              className="absolute z-10 grid grid-cols-5 gap-2.5 bg-black"
              style={{ top: 62, right: 0, width: 'max-content', padding: 14 }}
            >
              {TEAM_COLORS.map((c) => {
                const active = c.toLowerCase() === teamColor.toLowerCase()
                return (
                  <div
                    key={c}
                    onClick={() => {
                      onSetTeamColor(c)
                      setColorPickerOpen(false)
                    }}
                    className="cursor-pointer"
                    style={{
                      height: 32,
                      width: 32,
                      background: c,
                      boxShadow: active ? '0 0 0 2px black, 0 0 0 4px var(--color-accent)' : undefined,
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-5">
        <MiniPitch squad={players} height={170} />
      </div>

      <div className="mt-auto border-t border-black/8 px-5 pt-4.5 pb-7">
        <AccentButton onClick={onContinue}>CONTINUE</AccentButton>
      </div>
    </div>
  )
}
