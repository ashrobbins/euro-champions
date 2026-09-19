import type { Bracket, KnockoutRoundId, KnockoutTie, Team } from '../types'
import { ROUND_LABEL, ROUND_ORDER, findActiveUserTie, isUserEliminated, tieAggregate, userWonFinal } from '../engine/knockout'
import { AccentButton, BackChevron } from './ui'

interface Props {
  bracket: Bracket
  teamsById: Record<string, Team>
  userTeamId: string
  userTeamName: string
  userColor: string
  onBack: () => void
  onPlayNext: () => void
}

// Fixed-geometry bracket tree: every card is the same height, and each round's vertical pitch
// (center-to-center spacing) is exactly double the previous round's — so a round-2 card always
// centers precisely between the two round-1 cards that feed into it, all the way up the tree.
const CARD_W = 168
const CARD_H = 72
const COL_GAP = 48
const LEAF_GAP = 14
const LEAF_PITCH = CARD_H + LEAF_GAP // D0

function pitchFor(roundIdx: number): number {
  return LEAF_PITCH * 2 ** roundIdx
}

/** Top offset (px) of item `i` within round `roundIdx`, relative to the bracket's own top. */
function topFor(roundIdx: number, i: number): number {
  const pitch = pitchFor(roundIdx)
  return i * pitch + (pitch - LEAF_PITCH) / 2
}

function colX(roundIdx: number): number {
  return roundIdx * (CARD_W + COL_GAP)
}

/** The bracket slot the user would occupy in each later round if they keep winning — known from the tree shape alone, before opponents are decided. */
function userSlotChain(bracket: Bracket, userTeamId: string): Partial<Record<KnockoutRoundId, number>> {
  const r16Tie = bracket.ties.find((t) => t.round === 'r16' && (t.homeTeamId === userTeamId || t.awayTeamId === userTeamId))
  if (!r16Tie) return {}
  let slot = r16Tie.slotIndex
  const chain: Partial<Record<KnockoutRoundId, number>> = { r16: slot }
  for (const r of ['qf', 'sf', 'final'] as KnockoutRoundId[]) {
    slot = Math.floor(slot / 2)
    chain[r] = slot
  }
  return chain
}

function teamLabel(teamId: string | null, teamsById: Record<string, Team>, userTeamId: string, userTeamName: string): string {
  if (!teamId) return 'TBD'
  if (teamId === userTeamId) return userTeamName
  return teamsById[teamId]?.name ?? teamId
}

function teamColor(teamId: string | null, teamsById: Record<string, Team>, userTeamId: string, userColor: string): string {
  if (!teamId) return 'rgba(0,0,0,0.15)'
  if (teamId === userTeamId) return userColor
  return teamsById[teamId]?.accentColor ?? '#999999'
}

function TieCard({
  tie,
  x,
  y,
  highlighted,
  suppressResult,
  suppressTeams,
  teamsById,
  userTeamId,
  userTeamName,
  userColor,
}: {
  tie: KnockoutTie
  x: number
  y: number
  highlighted: boolean
  /** True for a tie in the user's current round (or later) that isn't their own — it may already be resolved behind the scenes, but showing that score here would spoil a round the user hasn't reached yet. */
  suppressResult: boolean
  /** True for any round strictly after the user's current one — who's even playing in it isn't revealed yet, so both sides read "TBC" regardless of what's already decided behind the scenes. */
  suppressTeams: boolean
  teamsById: Record<string, Team>
  userTeamId: string
  userTeamName: string
  userColor: string
}) {
  const agg = tieAggregate(tie)
  const hasScore = tie.legs.length > 0 && !suppressResult
  const decided = !!tie.winnerTeamId && !suppressResult
  const homeFaded = decided && tie.winnerTeamId !== tie.homeTeamId
  const awayFaded = decided && tie.winnerTeamId !== tie.awayTeamId
  const homeId = suppressTeams ? null : tie.homeTeamId
  const awayId = suppressTeams ? null : tie.awayTeamId
  const note = suppressResult ? '' : tie.decidedBy === 'penalties' ? 'On penalties' : tie.decidedBy === 'extraTime' ? 'After extra time' : ''

  return (
    <div
      className="absolute flex flex-col justify-center gap-1 overflow-hidden px-3"
      style={{
        left: x,
        top: y,
        width: CARD_W,
        height: CARD_H,
        background: highlighted ? 'rgba(109,40,217,0.08)' : '#ffffff',
        boxShadow: highlighted ? 'inset 0 0 0 2px var(--color-accent)' : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-2" style={{ opacity: homeFaded ? 0.35 : 1 }}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0" style={{ background: teamColor(homeId, teamsById, userTeamId, userColor) }} />
          <span className="truncate text-[12px] font-semibold">{suppressTeams ? 'TBC' : teamLabel(homeId, teamsById, userTeamId, userTeamName)}</span>
        </div>
        {hasScore && <span className="font-heading shrink-0 text-[13px] font-bold tabular-nums">{agg.home}</span>}
      </div>
      <div className="flex items-center justify-between gap-2" style={{ opacity: awayFaded ? 0.35 : 1 }}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0" style={{ background: teamColor(awayId, teamsById, userTeamId, userColor) }} />
          <span className="truncate text-[12px] font-semibold">{suppressTeams ? 'TBC' : teamLabel(awayId, teamsById, userTeamId, userTeamName)}</span>
        </div>
        {hasScore && <span className="font-heading shrink-0 text-[13px] font-bold tabular-nums">{agg.away}</span>}
      </div>
      <div className="h-[11px] text-[9px] font-semibold tracking-wide text-black/40 uppercase">{note}</div>
    </div>
  )
}

export function BracketScreen({ bracket, teamsById, userTeamId, userTeamName, userColor, onBack, onPlayNext }: Props) {
  const chain = userSlotChain(bracket, userTeamId)
  const activeTie = findActiveUserTie(bracket, userTeamId)
  const eliminated = isUserEliminated(bracket, userTeamId)
  const champion = userWonFinal(bracket, userTeamId)
  // While the user still has a tie to play, hold back results for their current round (other
  // simultaneous ties) and every round after it — those matches may already be resolved behind
  // the scenes, but showing the scores would spoil rounds the user hasn't reached yet.
  const activeRoundIdx = activeTie ? ROUND_ORDER.indexOf(activeTie.round) : -1

  const totalWidth = colX(ROUND_ORDER.length - 1) + CARD_W
  const totalHeight = pitchFor(0) * 8 // Round of 16 (8 ties) is always the tallest column

  // Connector lines: for every tie beyond Round of 16, an elbow bracket joining the vertical
  // centers of the two feeder ties (previous round, slots 2i and 2i+1) into this tie's center.
  const connectors: { key: string; top: number; bottom: number; xMid: number; xLeft: number; xRight: number }[] = []
  ROUND_ORDER.forEach((round, roundIdx) => {
    if (roundIdx === 0) return
    const count = 8 / 2 ** roundIdx
    for (let i = 0; i < count; i++) {
      const parentTop = topFor(roundIdx - 1, 2 * i) + CARD_H / 2
      const parentBottom = topFor(roundIdx - 1, 2 * i + 1) + CARD_H / 2
      const xLeft = colX(roundIdx - 1) + CARD_W
      const xRight = colX(roundIdx)
      connectors.push({ key: `${round}-${i}`, top: parentTop, bottom: parentBottom, xMid: xLeft + COL_GAP / 2, xLeft, xRight })
    }
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center px-5 pt-6 pb-4">
        <BackChevron onClick={onBack} />
        <div className="flex-1 text-center">
          <div className="font-heading text-[15px] font-bold uppercase">Knockout Stage</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">Your path highlighted</div>
        </div>
        <div className="w-5.5" />
      </div>

      <div className="min-h-0 grow overflow-x-auto overflow-y-auto px-5 pb-4">
        <div className="flex" style={{ width: totalWidth, gap: 0 }}>
          {ROUND_ORDER.map((round, roundIdx) => (
            <div
              key={round}
              className="font-heading shrink-0 text-center text-[11px] font-bold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase"
              style={{ width: CARD_W, marginLeft: roundIdx === 0 ? 0 : COL_GAP }}
            >
              {ROUND_LABEL[round]}
            </div>
          ))}
        </div>

        <div className="relative mt-3" style={{ width: totalWidth, height: totalHeight }}>
          <svg className="pointer-events-none absolute top-0 left-0" width={totalWidth} height={totalHeight}>
            {connectors.map((c) => (
              <path
                key={c.key}
                d={`M ${c.xLeft} ${c.top} H ${c.xMid} V ${c.bottom} H ${c.xLeft}`}
                fill="none"
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={1.5}
              />
            ))}
            {connectors.map((c) => (
              <line
                key={`${c.key}-out`}
                x1={c.xMid}
                y1={(c.top + c.bottom) / 2}
                x2={c.xRight}
                y2={(c.top + c.bottom) / 2}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={1.5}
              />
            ))}
          </svg>

          {ROUND_ORDER.map((round, roundIdx) =>
            bracket.ties
              .filter((t) => t.round === round)
              .sort((a, b) => a.slotIndex - b.slotIndex)
              .map((tie) => (
                <TieCard
                  key={tie.id}
                  tie={tie}
                  x={colX(roundIdx)}
                  y={topFor(roundIdx, tie.slotIndex)}
                  highlighted={chain[round] === tie.slotIndex}
                  suppressResult={
                    activeTie !== undefined && tie.id !== activeTie?.id && ROUND_ORDER.indexOf(tie.round) >= activeRoundIdx
                  }
                  suppressTeams={activeTie !== undefined && ROUND_ORDER.indexOf(tie.round) > activeRoundIdx}
                  teamsById={teamsById}
                  userTeamId={userTeamId}
                  userTeamName={userTeamName}
                  userColor={userColor}
                />
              )),
          )}
        </div>
      </div>

      <div className="px-5 pt-3 pb-7">
        {champion && (
          <div className="mb-2.5 text-center text-[13px] font-bold" style={{ color: 'var(--color-accent)' }}>
            Champions! 🏆
          </div>
        )}
        {!champion && eliminated && (
          <>
            <div className="mb-2.5 text-center text-[13px] font-semibold text-[var(--color-text-secondary)]">
              Knocked out — thanks for the run.
            </div>
            <AccentButton onClick={onBack}>Finish Season</AccentButton>
          </>
        )}
        {activeTie && !champion && (
          <AccentButton onClick={onPlayNext}>
            {activeTie.legs.length === 0 ? `Play ${ROUND_LABEL[activeTie.round]}` : 'Play Next Leg'}
          </AccentButton>
        )}
      </div>
    </div>
  )
}
