import type { MatchResult, Team } from '../types'
import { isOppGoalEvent, isUserGoalEvent } from '../engine/simulation'
import { MatchHeader } from './ui'

interface Props {
  result: MatchResult
  opponent: Team
  userTeamName: string
  /** Eyebrow label, e.g. "Group 3" or "Round of 16 · Leg 1". */
  label: string
  venue: 'HOME' | 'AWAY'
  userColor: string
  /** Optional highlighted line under the header — e.g. an aggregate-score/advancing note for a knockout leg. */
  bannerNote?: string
  continueLabel?: string
  onContinue: () => void
  onViewFixtures?: () => void
}

const PURPLE = '#6D28D9'
const INK = '#0A0A0A'

function OutcomeIcon({ success }: { success: boolean }) {
  return success ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ResultsScreen({
  result,
  opponent,
  userTeamName,
  label,
  venue,
  userColor,
  bannerNote,
  continueLabel = 'Continue',
  onContinue,
  onViewFixtures,
}: Props) {
  const scorers = [
    ...result.decisions
      .filter((d) => d.outcome === 'success' && isUserGoalEvent(d.event.id))
      .map((d) => ({ name: d.actorName, minute: d.minute })),
    ...result.ambientEvents.filter((e) => e.scorerName).map((e) => ({ name: e.scorerName!, minute: e.minute })),
  ].sort((a, b) => a.minute - b.minute)

  const feedItems = [
    ...result.decisions.map((d) => {
      const userGoal = d.outcome === 'success' && isUserGoalEvent(d.event.id)
      const oppGoal = d.outcome === 'failure' && isOppGoalEvent(d.event.id)
      return {
        minute: d.minute,
        text: d.summary,
        good: d.outcome === 'success',
        isGoal: userGoal || oppGoal,
        team: userGoal ? ('user' as const) : oppGoal ? ('opp' as const) : undefined,
        playerName: userGoal ? d.actorName : oppGoal ? opponent.name : undefined,
      }
    }),
    ...result.ambientEvents.map((e) => ({
      minute: e.minute,
      text: e.text,
      good: e.isGoal && !!e.scorerName,
      isGoal: e.isGoal,
      team: e.isGoal ? (e.scorerName ? ('user' as const) : ('opp' as const)) : undefined,
      playerName: e.isGoal ? (e.scorerName ?? opponent.name) : undefined,
    })),
  ].sort((a, b) => a.minute - b.minute)

  let feedRunningUser = 0
  let feedRunningOpp = 0
  const feed = feedItems.map((item) => {
    if (item.isGoal) {
      if (item.team === 'user') feedRunningUser++
      else feedRunningOpp++
    }
    return { ...item, scoreAfter: item.isGoal ? `${feedRunningUser}-${feedRunningOpp}` : null }
  })
  // The header always reads left-to-right as "home side, away side" — so when we're the away
  // side, "Your Squad" (and the goalscorers list below) moves to the right instead of always
  // sitting on the left.
  const isHomeVenue = venue === 'HOME'

  return (
    <div className="flex h-full flex-col" style={{ background: '#ffffff', color: INK, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <MatchHeader
        eyebrowTop={label}
        eyebrowBottom="Full Time"
        homeLabel={isHomeVenue ? userTeamName : opponent.name}
        homeSub={isHomeVenue ? 'Home' : 'Away'}
        awayLabel={isHomeVenue ? opponent.name : userTeamName}
        awaySub={isHomeVenue ? 'Away' : 'Home'}
        homeGoals={isHomeVenue ? result.userGoals : result.oppGoals}
        awayGoals={isHomeVenue ? result.oppGoals : result.userGoals}
        homeColor={isHomeVenue ? userColor : opponent.accentColor}
        awayColor={isHomeVenue ? opponent.accentColor : userColor}
      />

      {bannerNote && (
        <div className="mx-5 mt-4 px-4 py-2.5 text-center text-[13px] font-bold" style={{ background: 'rgba(109,40,217,0.1)', color: PURPLE }}>
          {bannerNote}
        </div>
      )}

      <div className="min-h-0 grow overflow-y-auto px-5 pt-5">
        {scorers.length > 0 && (
          <div className="mb-6" style={{ textAlign: isHomeVenue ? 'left' : 'right' }}>
            <div className="font-heading mb-2 text-[11px] font-bold tracking-[0.14em] text-black/40">GOALSCORERS</div>
            <div className="flex flex-col gap-2">
              {scorers.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5" style={{ flexDirection: isHomeVenue ? 'row' : 'row-reverse', justifyContent: isHomeVenue ? 'flex-start' : 'flex-end' }}>
                  <span
                    className="font-heading flex h-6 min-w-6 items-center justify-center px-1 text-[12px] font-bold text-white"
                    style={{ background: PURPLE }}
                  >
                    {Math.max(1, s.minute)}&rsquo;
                  </span>
                  <span className="text-[14px] font-semibold">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="font-heading mb-1.5 text-[11px] font-bold tracking-[0.14em] text-black/40">TACTICAL DECISIONS</div>
        {feed.map((entry, i) =>
          entry.isGoal ? (
            <div key={i} className="flex items-start gap-2.5 border-b border-black/8 py-2.5">
              <OutcomeIcon success={entry.good} />
              <div className="grid grow grid-cols-[24px_1fr] gap-x-2 gap-y-0.5">
                <span className="font-heading text-[13px] font-bold text-black">{entry.minute}&rsquo;</span>
                <span className="font-heading text-[15px] font-bold tracking-wide text-black uppercase">
                  GOAL! {entry.playerName} &mdash; {entry.scoreAfter}
                </span>
                <span />
                <span className="text-[13px] font-normal text-black/70">{entry.text}</span>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-2.5 border-b border-black/8 py-2.5">
              <OutcomeIcon success={entry.good} />
              <span className="font-heading w-6 shrink-0 text-[11px] text-black/40">{entry.minute}&rsquo;</span>
              <div className="grow text-[13px] text-black/75">{entry.text}</div>
            </div>
          ),
        )}
      </div>

      <div className="px-5 pt-4 pb-7">
        <div className="mb-2.5">
          <button
            onClick={onContinue}
            className="w-full cursor-pointer py-4 text-center text-[17px] tracking-wide text-white uppercase"
            style={{ background: PURPLE, fontFamily: 'var(--font-score)' }}
          >
            {continueLabel}
          </button>
        </div>
        {onViewFixtures && (
          <div onClick={onViewFixtures} className="cursor-pointer text-center text-[13px] font-semibold" style={{ color: PURPLE }}>
            View fixtures &rarr;
          </div>
        )}
      </div>
    </div>
  )
}
