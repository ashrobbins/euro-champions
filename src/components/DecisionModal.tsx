import type { Player } from '../types'
import { commentaryFor, type DrawnEvent } from '../engine/events'
import { Ring } from './ui'

interface Props {
  event: DrawnEvent
  candidates: Player[]
  actor: Player | null
  minute: number
  userGoals: number
  oppGoals: number
  onChoose: (choiceIndex: 0 | 1 | 2) => void
}

export function DecisionModal({ event, candidates, actor, minute, userGoals, oppGoals, onChoose }: Props) {
  const isAction = event.choiceMode === 'action'
  const commentary = commentaryFor(event, minute, userGoals, oppGoals)

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ background: 'rgba(5,7,13,0.72)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 40% at 50% 20%, rgba(139,92,246,0.10), transparent)' }}
      />
      <div className="relative flex flex-col gap-4 rounded-t-[24px] bg-[var(--color-bg-elev)] pt-5 pb-5.5 shadow-[0_-20px_40px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-end px-5">
          <div className="font-heading flex items-center gap-2 text-[13px] font-bold tabular-nums">
            <span>
              {userGoals}&ndash;{oppGoals}
            </span>
            <span className="text-[var(--color-text-tertiary)]">&middot;</span>
            <span className="text-[var(--color-text-secondary)]">{minute}:00</span>
          </div>
        </div>

        <div className="px-5">
          <div className="font-heading text-[11px] font-bold tracking-[0.1em] text-[var(--color-accent)]">
            {event.label.toUpperCase()}
          </div>
          <div className="font-heading mt-1 text-[18px] leading-snug font-bold">{commentary}</div>
          <div className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{event.prompt}</div>
        </div>

        {isAction && actor && !event.hideActor && (
          <div className="mx-5 flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3">
            <Ring player={actor} size={34} />
            <div className="grow">
              <div className="text-[13px] font-semibold">{actor.name}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{actor.traits[0]}</div>
            </div>
            <div className="text-right">
              <div className="font-heading text-[15px] font-bold text-[var(--color-text-secondary)]">
                {actor.ratings[event.statA]}
              </div>
              <div className="text-[9px] text-[var(--color-text-tertiary)]">{event.statA.toUpperCase()}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 px-5">
          {isAction
            ? event.choices.map((label, i) => (
                <div
                  key={label}
                  onClick={() => onChoose(i as 0 | 1 | 2)}
                  className="cursor-pointer rounded-xl px-4 py-4 text-center"
                  style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)' }}
                >
                  <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{label}</span>
                </div>
              ))
            : candidates.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => onChoose(i as 0 | 1 | 2)}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-4"
                  style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)' }}
                >
                  <Ring player={c} size={40} />
                  <div className="grow">
                    <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{c.name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{c.traits[0]}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-[16px] font-bold text-[var(--color-text-primary)]">
                      {c.ratings[event.statA]}
                    </div>
                    <div className="text-[9px] text-[var(--color-text-tertiary)]">{event.statA.toUpperCase()}</div>
                  </div>
                </div>
              ))}
        </div>

        <div className="px-5 text-center text-[11px] text-[var(--color-text-tertiary)]">
          {isAction ? 'Tap to decide.' : 'Tap a player to decide.'}
        </div>
      </div>
    </div>
  )
}
