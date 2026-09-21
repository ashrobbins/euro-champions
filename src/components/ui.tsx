import type { Player } from '../types'
import { POS_HEX, initials, posAbbr, posColorKey } from '../theme'

export function Ring({ player, size = 40 }: { player: Player; size?: number }) {
  const hex = POS_HEX[posColorKey(player)]
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[28%] font-heading font-bold text-[#0a0f1c]"
      style={{ background: hex, width: size, height: size, fontSize: size * 0.24 }}
    >
      {posAbbr(player)}
    </div>
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
      className={`w-full cursor-pointer rounded-2xl py-4 text-center text-[15px] font-bold tracking-wide text-[#ffffff] ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
        boxShadow: '0 14px 26px -14px rgba(139,92,246,0.55)',
      }}
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

/** Scales a team-name label down as it gets longer, so a long single-word name (no spaces to wrap on) still fits its column without forcing it wider. */
function nameSizeClass(name: string): string {
  if (name.length > 16) return 'text-[13px]'
  if (name.length > 11) return 'text-[15px]'
  return 'text-[19px]'
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
  // The eyebrow-bottom label doubles as a status pill — pink/live for anything still in play,
  // green once there's a final result to show, so the same slot reads correctly for every
  // screen that reuses this header (live match, extra time, shootout, full time).
  const isLive = eyebrowBottom !== undefined && eyebrowBottom !== 'Full Time'

  return (
    <div className="px-5 pt-6 pb-5">
      <div className="flex items-center justify-between gap-2">
        {onBack ? <BackChevron onClick={onBack} /> : <div className="w-5.5 shrink-0" />}
        <div className="font-heading text-[13px] font-bold tracking-[0.03em] text-[var(--color-text-primary)] uppercase">{eyebrowTop}</div>
        {eyebrowBottom ? (
          <span
            className="font-heading inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.06em] uppercase"
            style={{
              background: isLive ? 'rgba(236,72,153,0.16)' : 'rgba(52,211,153,0.14)',
              color: isLive ? 'var(--color-accent-2)' : 'var(--color-green)',
            }}
          >
            {isLive && <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent-2)' }} />}
            {eyebrowBottom}
          </span>
        ) : (
          <div className="w-5.5 shrink-0" />
        )}
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-[22px] px-4 pt-5 pb-4"
        style={{
          background: 'linear-gradient(135deg, #5b21b6 0%, #9333ea 55%, #db2777 100%)',
          boxShadow: '0 18px 34px -16px rgba(157,23,150,0.55)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 85% -10%, rgba(255,255,255,0.22), transparent 55%)' }}
        />

        {/* Grid (not flex) so the two side columns always stay equal width — an unbreakable long
            team name in flexbox can force its column wider via min-content sizing, pushing the
            score off-centre. min-w-0 + overflow-wrap lets a long name wrap instead of doing that. */}
        <div className="relative grid items-start gap-1.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <div className="flex min-w-0 flex-col items-center gap-2" style={{ overflowWrap: 'anywhere' }}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[12px] font-bold text-white"
              style={{ background: homeColor, fontFamily: 'var(--font-heading)' }}
            >
              {initials(homeLabel)}
            </span>
            <div className="text-center">
              <div className={`font-heading ${nameSizeClass(homeLabel)} leading-[1.1] font-bold text-white uppercase`}>{homeLabel}</div>
              {homeSub && <div className="mt-0.5 text-[9px] tracking-[0.08em] text-white/65 uppercase">{homeSub}</div>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 px-1">
            <div className="flex items-baseline text-white" style={{ fontFamily: 'var(--font-score)' }}>
              <span className="text-[42px] leading-none tabular-nums">{homeGoals}</span>
              <span className="px-1 text-[26px] leading-none tabular-nums text-white/50">:</span>
              <span className="text-[42px] leading-none tabular-nums">{awayGoals}</span>
            </div>
            {clockBadge && (
              <div
                className="font-heading rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums text-white"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {clockBadge}
              </div>
            )}
            {aggregateNote && (
              <div className="text-[9px] font-bold tracking-[0.08em] text-white/75 uppercase">{aggregateNote}</div>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center gap-2" style={{ overflowWrap: 'anywhere' }}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[12px] font-bold text-white"
              style={{ background: awayColor, fontFamily: 'var(--font-heading)' }}
            >
              {initials(awayLabel)}
            </span>
            <div className="text-center">
              <div className={`font-heading ${nameSizeClass(awayLabel)} leading-[1.1] font-bold text-white uppercase`}>{awayLabel}</div>
              {awaySub && <div className="mt-0.5 text-[9px] tracking-[0.08em] text-white/65 uppercase">{awaySub}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-dvh w-full max-w-[390px] flex-col overflow-hidden font-body text-[var(--color-text-primary)] sm:h-[844px]"
      style={{
        background:
          'radial-gradient(120% 70% at 50% -10%, var(--color-bg-elev) 0%, var(--color-bg) 55%), var(--color-bg)',
      }}
    >
      {children}
    </div>
  )
}
