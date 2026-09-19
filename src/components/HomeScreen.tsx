import { AccentButton, ScreenShell } from './ui'

export function HomeScreen({
  onPlay,
  onNewGame,
  onOpenSettings,
  hasSquad,
}: {
  onPlay: () => void
  onNewGame: () => void
  onOpenSettings: () => void
  hasSquad: boolean
}) {
  return (
    <ScreenShell>
      <div className="flex grow flex-col items-center justify-center gap-7 p-8 text-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="font-heading text-[13px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
            ROAD TO GLORY
          </div>
          <div className="font-heading text-[44px] leading-[1.05] font-bold">EURO CHAMPIONS</div>
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
          <div
            onClick={onOpenSettings}
            className="cursor-pointer text-center text-[11px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
          >
            Settings
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
