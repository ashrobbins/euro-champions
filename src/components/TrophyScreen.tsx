import { useMemo } from 'react'
import { AccentButton } from './ui'

interface Props {
  userTeamName: string
  userColor: string
  onDone: () => void
}

const CONFETTI_COLORS = ['#6D28D9', '#e8b93f', '#16A34A', '#2563EB', '#DC2626', '#ffffff']

function TrophyIcon() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8v4a4 4 0 0 1-8 0V3z" />
      <path d="M5 5H3v2a4 4 0 0 0 4 4" />
      <path d="M19 5h2v2a4 4 0 0 1-4 4" />
      <path d="M12 11v6" />
      <path d="M9 21h6" />
      <path d="M10 17h4v4h-4z" />
    </svg>
  )
}

/** Full-screen champion celebration: confetti + streamers via CSS keyframes, no external assets. */
export function TrophyScreen({ userTeamName, userColor, onDone }: Props) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.6 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        width: 5 + Math.random() * 5,
        rotate: Math.random() * 360,
      })),
    [],
  )

  const streamers = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        left: 4 + i * 11,
        delay: Math.random() * 0.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  )

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <style>{`
        @keyframes euc-confetti-fall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(920px) rotate(540deg); opacity: 0.9; }
        }
        @keyframes euc-streamer-fall {
          0% { transform: translateY(-20%) scaleY(0.6); opacity: 1; }
          100% { transform: translateY(900px) scaleY(1); opacity: 0; }
        }
        @keyframes euc-trophy-pop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {confetti.map((c) => (
        <span
          key={c.id}
          className="pointer-events-none absolute top-0"
          style={{
            left: `${c.left}%`,
            width: c.width,
            height: c.width * 0.4,
            background: c.color,
            animation: `euc-confetti-fall ${c.duration}s ease-in ${c.delay}s infinite`,
            transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}
      {streamers.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute top-0 w-[3px]"
          style={{ left: `${s.left}%`, height: 120, background: s.color, animation: `euc-streamer-fall 2.4s ease-in ${s.delay}s infinite` }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div style={{ animation: 'euc-trophy-pop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <TrophyIcon />
        </div>
        <div>
          <div className="font-heading text-[13px] font-bold tracking-[0.18em] text-[var(--color-accent)] uppercase">Euro Champions</div>
          <div className="font-heading mt-1 text-[44px] leading-[1.02] font-bold uppercase">Champions!</div>
        </div>
        <div className="max-w-[280px] text-sm text-[var(--color-text-secondary)]">
          {userTeamName} have won it all — every group game, every knockout tie, all the way to the trophy.
        </div>
        <div className="mt-2 h-2 w-24" style={{ background: userColor }} />
      </div>

      <div className="absolute right-8 bottom-8 left-8 z-10">
        <AccentButton onClick={onDone}>BACK TO HOME</AccentButton>
      </div>
    </div>
  )
}
