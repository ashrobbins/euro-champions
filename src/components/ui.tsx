import type { Player } from '../types'
import { POS_HEX, TIER_STYLE, posAbbr, posColorKey } from '../theme'

export function Ring({ player, size = 40 }: { player: Player; size?: number }) {
  const hex = POS_HEX[posColorKey(player)]
  return (
    <div
      className="flex shrink-0 items-center justify-center font-heading font-bold text-[#0a0f1c]"
      style={{ background: hex, width: size, height: size, fontSize: size * 0.24 }}
    >
      {posAbbr(player)}
    </div>
  )
}

export function TierBadge({ tier }: { tier: string }) {
  const t = TIER_STYLE[tier]
  return (
    <span
      className=" px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color: t.color, background: t.bg }}
    >
      {t.label}
    </span>
  )
}

export function AccentButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full  bg-[var(--color-accent)] py-4 text-center text-[15px] font-semibold text-[#ffffff] cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export function BackChevron({ onClick }: { onClick: () => void }) {
  return (
    <svg
      onClick={onClick}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-primary)"
      strokeWidth="1.8"
      className="cursor-pointer"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/**
 * Shared score header for match/results/knockout screens — eyebrow, big
 * colon-separated score, optional live-clock badge, team names with an
 * optional subtitle (e.g. Home/Away), team-color strip, purple accent strip.
 * No club crests (deliberate — see plan doc decisions on real-club branding)
 * and no rounded corners (house style is 0deg corners throughout).
 */
export function MatchHeader({
  eyebrowTop,
  eyebrowBottom,
  onBack,
  homeLabel,
  homeSub,
  awayLabel,
  awaySub,
  homeGoals,
  awayGoals,
  homeColor,
  awayColor,
  clockBadge,
  aggregateNote,
}: {
  eyebrowTop: string
  eyebrowBottom?: string
  onBack?: () => void
  homeLabel: string
  homeSub?: string
  awayLabel: string
  awaySub?: string
  homeGoals: number
  awayGoals: number
  homeColor: string
  awayColor: string
  clockBadge?: string
  /** e.g. "Aggregate 2-1" — shown under the score/clock for a knockout leg 2, so the tie total stays visible without leaving the live match. */
  aggregateNote?: string
}) {
  return (
    <div className="relative pb-6">
      <div className="flex items-center px-5 pt-6">
        {onBack ? <BackChevron onClick={onBack} /> : <div className="w-5.5" />}
        <div className="flex-1 text-center">
          <div className="font-heading text-[15px] font-bold uppercase text-[var(--color-text-primary)]">{eyebrowTop}</div>
          {eyebrowBottom && <div className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{eyebrowBottom}</div>}
        </div>
        <div className="w-5.5" />
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <div className="flex-1">
          <div className="font-heading text-[19px] leading-[1.05] uppercase">{homeLabel}</div>
          {homeSub && <div className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{homeSub}</div>}
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2">
          <div className="flex items-baseline">
            <span className="font-heading text-[52px] leading-none tabular-nums">{homeGoals}</span>
            <span className="font-heading px-1 text-[52px] leading-none tabular-nums text-black/25">:</span>
            <span className="font-heading text-[52px] leading-none tabular-nums">{awayGoals}</span>
          </div>
          {clockBadge && (
            <div
              className="font-heading px-2.5 py-1 text-[13px] font-bold tabular-nums"
              style={{ background: 'rgba(109,40,217,0.12)', color: 'var(--color-accent)' }}
            >
              {clockBadge}
            </div>
          )}
          {aggregateNote && (
            <div className="text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)] uppercase">{aggregateNote}</div>
          )}
        </div>

        <div className="flex-1 text-right">
          <div className="font-heading text-[19px] leading-[1.05] uppercase">{awayLabel}</div>
          {awaySub && <div className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{awaySub}</div>}
        </div>
      </div>

      <div className="mt-4 flex h-2 px-0">
        <div className="flex-1" style={{ background: homeColor }} />
        <div className="flex-1" style={{ background: awayColor }} />
      </div>

      <div className="absolute right-0 bottom-0 left-0 h-5" style={{ background: 'var(--color-accent)' }} />
    </div>
  )
}

export function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-[844px] w-[390px] flex-col overflow-hidden  font-body text-[var(--color-text-primary)]"
      style={{
        background: 'radial-gradient(120% 70% at 50% -10%, #f6f3fc 0%, #ffffff 55%), #ffffff',
      }}
    >
      {children}
    </div>
  )
}
