import { AccentButton, ScreenShell } from './ui'

export function HomeScreen({
  onPlay,
  onNewGame,
  onOpenSettings,
  onOpenHistory,
  hasSquad,
}: {
  onPlay: () => void
  onNewGame: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  hasSquad: boolean
}) {
  return (
    <ScreenShell>
      <div className="flex grow flex-col items-center justify-center gap-7 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="font-heading text-[12px] font-bold tracking-[0.22em] text-[var(--color-accent-2)]">
            ROAD TO GLORY
          </div>
          <div
            className="text-[54px] leading-[0.95] tracking-[0.01em] uppercase"
            style={{
              fontFamily: 'var(--font-score)',
              background: 'linear-gradient(135deg, #fff, #d9c8ff 60%, var(--color-accent-2))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Euro
            <br />
            Champions
          </div>
        </div>

        <p className="m-0 max-w-[280px] text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Draft five players. Watch a match unfold in minutes. Six decisions decide it — even a strong squad can lose.
        </p>

        <div className="flex w-full max-w-[280px] flex-col gap-3.5">
          <AccentButton onClick={onPlay}>{hasSquad ? 'CONTINUE SEASON' : 'PLAY'}</AccentButton>
          {hasSquad && (
            <div
              onClick={onNewGame}
              className="cursor-pointer text-center text-[11px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
            >
              New Game — Reset Squad
            </div>
          )}
          <div className="flex justify-center gap-4">
            <div
              onClick={onOpenHistory}
              className="cursor-pointer text-center text-[11px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
            >
              Season History
            </div>
            <div
              onClick={onOpenSettings}
              className="cursor-pointer text-center text-[11px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
            >
              Settings
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
