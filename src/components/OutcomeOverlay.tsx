import { useEffect, useState } from 'react'
import type { DecisionRecord } from '../types'

interface Props {
  record: DecisionRecord
  onDone: () => void
}

type Phase = 'enter' | 'shown' | 'exit'

const SHOWN_DELAY = 20
const HOLD_MS = 900
const TRANSITION_MS = 250

export function OutcomeOverlay({ record, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('enter')
  const good = record.outcome === 'success'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shown'), SHOWN_DELAY)
    const t2 = setTimeout(() => setPhase('exit'), SHOWN_DELAY + HOLD_MS)
    const t3 = setTimeout(onDone, SHOWN_DELAY + HOLD_MS + TRANSITION_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const color = good ? 'var(--color-green)' : 'var(--color-red)'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center"
      style={{
        background: 'rgba(5,7,13,0.92)',
        opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
        transition: `opacity ${TRANSITION_MS}ms ease`,
      }}
    >
      <div
        className="font-heading text-[44px] font-bold"
        style={{
          color,
          transform: phase === 'enter' ? 'scale(0.6)' : phase === 'exit' ? 'scale(1.25)' : 'scale(1)',
          opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
          transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${TRANSITION_MS}ms ease`,
          textShadow: `0 0 32px ${color}55`,
        }}
      >
        {record.headline}
      </div>
      <div
        className="max-w-[280px] text-sm text-[var(--color-text-secondary)]"
        style={{
          opacity: phase === 'shown' ? 1 : 0,
          transition: `opacity ${TRANSITION_MS}ms ease ${phase === 'shown' ? 80 : 0}ms`,
        }}
      >
        {record.summary}
      </div>
    </div>
  )
}
