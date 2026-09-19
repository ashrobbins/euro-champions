import { useState } from 'react'
import { AccentButton, BackChevron } from './ui'

const MAX_LENGTH = 24

interface Props {
  /** 'onboarding': shown once, first time the user hits Play — no way back, friendly copy. 'settings': reachable any time from Home to rename later. */
  mode: 'onboarding' | 'settings'
  initialName: string
  onBack?: () => void
  onSubmit: (name: string) => void
}

export function TeamNameScreen({ mode, initialName, onBack, onSubmit }: Props) {
  const [name, setName] = useState(initialName)
  const trimmed = name.trim()

  function handleSubmit() {
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className="flex h-full flex-col">
      {mode === 'settings' && (
        <div className="flex items-center px-5 pt-6">
          <BackChevron onClick={onBack!} />
          <div className="flex-1 text-center font-heading text-[15px] font-bold uppercase">Settings</div>
          <div className="w-5.5" />
        </div>
      )}

      <div className="flex grow flex-col items-center justify-center gap-7 p-8 text-center">
        <div className="flex flex-col items-center gap-2.5">
          {mode === 'onboarding' && (
            <div className="font-heading text-[13px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
              BEFORE WE START
            </div>
          )}
          <div className="font-heading text-[30px] leading-[1.1] font-bold">
            {mode === 'onboarding' ? 'Name Your Squad' : 'Team Name'}
          </div>
        </div>

        {mode === 'onboarding' && (
          <p className="m-0 max-w-[280px] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            What should we call your squad? You can change this any time from Settings.
          </p>
        )}

        <div className="flex w-full max-w-[280px] flex-col gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            placeholder="Your Squad"
            className="w-full bg-[var(--color-card)] px-4 py-3.5 text-center text-[17px] font-semibold text-[var(--color-text-primary)] outline-none"
            style={{ border: '1px solid var(--color-card-border)' }}
          />
          <div className="text-right text-[11px] text-[var(--color-text-tertiary)]">{name.length}/{MAX_LENGTH}</div>
        </div>

        <div className="w-full max-w-[280px]">
          <AccentButton onClick={handleSubmit} className={trimmed ? '' : 'pointer-events-none opacity-40'}>
            {mode === 'onboarding' ? 'CONTINUE' : 'SAVE'}
          </AccentButton>
        </div>
      </div>
    </div>
  )
}
