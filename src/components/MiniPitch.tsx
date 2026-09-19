import type { DraftSlot, Player } from '../types'
import { DRAFT_SLOTS } from '../types'
import { POS_HEX, posColorKey } from '../theme'

interface Props {
  squad: Partial<Record<DraftSlot, Player>>
  /** Slots at index < activeStep (or all, if activeStep is undefined) render filled; the rest render as empty placeholders. */
  activeStep?: number
  height?: number
}

const ROW_Y: Record<'GK' | 'DEF' | 'MID' | 'ATT', number> = { GK: 82, DEF: 60, MID: 39, ATT: 18 }

export function MiniPitch({ squad, activeStep, height = 230 }: Props) {
  const flexRole = squad.FLEX?.flexRole ?? 'MID'
  const rowMembers: Record<'MID' | 'ATT', DraftSlot[]> = {
    MID: flexRole === 'MID' ? ['MID', 'FLEX'] : ['MID'],
    ATT: flexRole === 'ATT' ? ['ATT', 'FLEX'] : ['ATT'],
  }
  const rowKeyFor: Record<DraftSlot, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
    GK: 'GK',
    DEF: 'DEF',
    MID: 'MID',
    ATT: 'ATT',
    FLEX: flexRole === 'MID' ? 'MID' : 'ATT',
  }

  function xFor(rowKey: 'GK' | 'DEF' | 'MID' | 'ATT', slot: DraftSlot): number {
    const members = rowKey === 'MID' || rowKey === 'ATT' ? rowMembers[rowKey] : [slot]
    if (members.length === 1) return 50
    return members.indexOf(slot) === 0 ? 35 : 65
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ height, background: 'linear-gradient(180deg, #d9edd0 0%, #c3e2b4 100%)' }}
    >
      <div className="absolute top-1/2 left-[8%] right-[8%] h-px bg-black/15" />
      <div
        className="absolute top-1/2 left-1/2 rounded-full border border-black/15"
        style={{ width: 56, height: 56, marginLeft: -28, marginTop: -28 }}
      />
      {DRAFT_SLOTS.map((slot, i) => {
        const player = squad[slot]
        const confirmed = activeStep === undefined || i < activeStep
        const rowKey = rowKeyFor[slot]
        const x = xFor(rowKey, slot)
        const y = ROW_Y[rowKey]
        const colorKey = player ? posColorKey(player) : null
        return (
          <div
            key={slot}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%`, opacity: confirmed ? 1 : 0.4 }}
          >
            <div
              className="h-3.5 w-3.5 rounded-full"
              style={
                confirmed && colorKey
                  ? { background: POS_HEX[colorKey], border: '2px solid rgba(0,0,0,0.35)' }
                  : { background: 'transparent', border: '2px dashed rgba(0,0,0,0.25)' }
              }
            />
            {confirmed && player && (
              <div className="text-[10px] font-semibold whitespace-nowrap text-black">{player.name}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
