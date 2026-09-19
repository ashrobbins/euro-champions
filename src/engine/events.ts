import type { EventDefinition, Player, StatField, TeamRatingField } from '../types'
import { SeededRandom } from './random'

/**
 * The 10-event pool from plan doc Appendix C. Every match draws exactly 6,
 * weighted by `weight`. statA is the relevant player rating; teamStat is the
 * opponent team-level rating it's weighed against (Appendix D).
 */
export interface PoolEvent extends EventDefinition {
  teamStat: TeamRatingField
  /** True for genuinely team-wide calls (tactical stance, defensive shape) where naming one player is arbitrary — the actor still drives probability internally, just isn't shown. */
  hideActor?: boolean
}

/**
 * An event drawn into this match's queue. Commentary is deliberately NOT baked in here — the
 * score at the moment this event actually fires isn't known until the match has played out that
 * far (ambient goals and earlier decisions can move it), so commentary is picked lazily at
 * display time via `commentaryFor`, using the live score then. See `commentaryFor`.
 */
export type DrawnEvent = PoolEvent

export const EVENT_POOL: PoolEvent[] = [
  { id: 'penalty_save', label: 'Penalty save', prompt: 'Which way does he go?', choiceMode: 'action', choices: ['Dive left', 'Dive centre', 'Dive right'], statA: 'goalkeeping', statB: 'composure', teamStat: 'setPieces', weight: 20 },
  { id: 'free_kick', label: 'Free kick', prompt: 'Who takes it?', choiceMode: 'player', choices: ['Curl it in', 'Drive it low', 'Chip the wall'], statA: 'setPieces', statB: 'composure', teamStat: 'goalkeeping', weight: 15 },
  { id: 'one_on_one', label: 'One-on-one', prompt: 'How does he finish?', choiceMode: 'action', choices: ['Place it', 'Smash it', 'Dink the keeper'], statA: 'finishing', statB: 'composure', teamStat: 'goalkeeping', weight: 15 },
  { id: 'corner', label: 'Corner', prompt: 'Where do you send it?', choiceMode: 'action', choices: ['Near post', 'Far post', 'Play it short'], statA: 'setPieces', statB: 'pace', teamStat: 'defence', weight: 15 },
  { id: 'break_press', label: 'Break the press', prompt: 'Which way out?', choiceMode: 'action', choices: ['Middle', 'Wing', 'Long clearance'], statA: 'passing', statB: 'pace', teamStat: 'defence', weight: 15 },
  { id: 'late_tactic', label: 'Late-game tactic', prompt: "What's the call?", choiceMode: 'action', hideActor: true, choices: ['Attack! Attack! Attack!', 'Keep it balanced', 'Park the Bus'], statA: 'stamina', statB: 'defending', teamStat: 'stamina', weight: 15 },
  { id: 'last_ditch_tackle', label: 'Last-ditch tackle', prompt: 'How does he defend it?', choiceMode: 'action', choices: ['Slide tackle', 'Stand off', 'Block the shot'], statA: 'defending', statB: 'composure', teamStat: 'attack', weight: 30 },
  { id: 'long_range', label: 'Long-range effort', prompt: 'Who takes the shot?', choiceMode: 'player', choices: ['Near post', 'Far post', 'Pass instead'], statA: 'finishing', statB: 'composure', teamStat: 'goalkeeping', weight: 10 },
  { id: 'def_set_piece', label: 'Defensive set piece', prompt: 'How do you set up?', choiceMode: 'action', hideActor: true, choices: ['Zonal marking', 'Man marking', 'Short setup'], statA: 'defending', statB: 'goalkeeping', teamStat: 'setPieces', weight: 30 },
  { id: 'counter_attack', label: 'Counter-attack trigger', prompt: 'How do you play it?', choiceMode: 'action', choices: ['Fast break', 'Hold possession', 'Switch play'], statA: 'pace', statB: 'passing', teamStat: 'attack', weight: 10 },
]

/** Best squad player for a given stat, used to represent "who's involved" in an event. */
export function bestFor(squad: Player[], stat: StatField): Player {
  return squad.reduce((best, p) => (p.ratings[stat] > best.ratings[stat] ? p : best), squad[0])
}

/** The single player who performs an 'action'-mode event — the GK for saves, otherwise the best-suited outfield player. */
export function actorFor(squad: Player[], event: PoolEvent): Player {
  if (event.id === 'penalty_save') {
    return squad.find((p) => p.position === 'GK') ?? bestFor(squad, event.statA)
  }
  return bestFor(squad, event.statA)
}

/**
 * A commentary line can be a plain string (always eligible) or tagged with the score states it
 * makes sense in — e.g. "no keeper wants to concede first" only reads right at 0-0, and "take the
 * lead now" is wrong if you're already ahead. `only` restricts a line to specific ScoreStates;
 * omitted means it works regardless of score.
 */
type ScoreState = 'level' | 'userLeads' | 'userTrails'
type CommentaryLine = string | { text: string; only: ScoreState[] }

/**
 * Commentator lines per event, in the voice of a match commentator building
 * the moment rather than a neutral system label. Split early/late so a
 * 15th-minute moment doesn't get "this decides the match" framing that only
 * makes sense once the game's actually reached its closing stages — and
 * several lines per bucket so the same event doesn't read identically twice.
 * late_tactic only ever fires late (gated at draw time), so it needs no early bucket.
 */
const COMMENTARY: Record<string, { early: CommentaryLine[]; late: CommentaryLine[] }> = {
  penalty_save: {
    early: [
      "A penalty this early on — a chance to settle the nerves before the game's even properly begun.",
      { text: 'The referee points to the spot. Early enough to shrug off, but no keeper wants to concede first.', only: ['level'] },
      "A soft penalty award, but it still counts. Let's see how your keeper responds.",
      "First real talking point of the match — a penalty. Plenty of game left either way.",
    ],
    late: [
      'The referee points to the spot. Dead silence around the ground — this could be the moment that decides it.',
      'A penalty at this stage of the game — everything could hinge on the next few seconds.',
      'This late, a save here could be worth all three points.',
      "The stadium holds its breath. Guess right, and you're a hero. Guess wrong, and it's in the net.",
    ],
  },
  free_kick: {
    early: [
      "An early free kick in a decent area — worth a look, even if it's not the biggest moment yet.",
      'A foul early doors gives you a sighter at goal from a dead ball.',
      "Not the most dangerous area, but a free kick this early can set the tone.",
      "The wall goes up. Nothing riding on this one yet, but every goal counts.",
    ],
    late: [
      'A free kick with the game deep into its closing stages — this could be the decisive moment.',
      "The wall is set, the keeper's barking instructions. This late, it matters enormously.",
      "Right in the pocket, and with time running out. You don't get many cleaner looks than this.",
      'The referee paces out the wall. A huge chance, this late, to make it count.',
    ],
  },
  one_on_one: {
    early: [
      'Clean through early on — a chance to make an early statement.',
      { text: 'Through on goal in the opening spell — no real pressure yet, but a goal here sets you up nicely.', only: ['level', 'userTrails'] },
      { text: 'The last defender is beaten early in the game. Take the lead now and dictate the rest.', only: ['level', 'userTrails'] },
      "A one-on-one this early — the kind of chance you want to take before the game settles.",
    ],
    late: [
      'Clean through, deep into the game — this is the kind of chance that wins matches.',
      'The last defender is beaten with time running out. This could be the difference.',
      'Through on goal at a crucial stage — composure is everything in the next two seconds.',
      "The crowd's on its feet. This late, one touch could decide the whole night.",
    ],
  },
  corner: {
    early: [
      'An early corner — a look at how dangerous you can be from the first set piece of the night.',
      'Corner won early doors. Nothing to lose by testing them here.',
      'The first corner of the match. Early days, but every goal helps.',
      'A routine-looking corner, early in proceedings.',
    ],
    late: [
      'A corner deep into the game — the kind of moment that could decide it.',
      'Bodies piling into the box this late — a huge moment at the set piece.',
      "The delivery's coming in, with precious little time left. Anyone could get on the end of this.",
      'Corner won in the closing stages — get the delivery right and this could be massive.',
    ],
  },
  break_press: {
    early: [
      "They're pressing high already — early in the game, keep your composure and settle into it.",
      'Surrounded in your own half early on — no need to panic yet.',
      'The press is on early. Find a way out and set the tone for the rest of the game.',
      'Under pressure in the opening exchanges — stay calm.',
    ],
    late: [
      "They're pressing high, hunting the ball back with time running out. Keep your composure or it could get dangerous.",
      'Surrounded in your own half this late — the next pass has to be the right one.',
      'The press is on, deep into the game. One careless touch here and it could cost you everything.',
      'Under real pressure now, late on. Find a way out and you could settle this.',
    ],
  },
  late_tactic: {
    early: [],
    late: [
      "The clock's ticking down and the manager needs a call — see this out, or go looking for more?",
      'Nerves in the stands. How you play these closing stages could define the result.',
      "Time is the story now. Push on, or protect what you've got?",
      'The final stretch. One tactical call here shapes how the last minutes play out.',
    ],
  },
  last_ditch_tackle: {
    early: [
      'An early foray forward for them — a good chance to show your defence is switched on from the start.',
      "They're in behind early — a routine enough situation, but worth dealing with properly.",
      'Early pressure from the opposition — a challenge here nips it in the bud.',
      'They break early — no real danger yet if this is dealt with well.',
    ],
    late: [
      "They're clean through late on — this is a last-man situation, and it has to be won.",
      'Last defender back, attacker bearing down, deep into the game. Everything rests on this challenge.',
      "No cover, no second chance, this late — win this tackle or it's a straight look at goal.",
      'The whole back line is exposed at a crucial time. This challenge could be the difference.',
    ],
  },
  long_range: {
    early: [
      'An early sighter from distance — nothing to lose by trying your luck.',
      'A speculative effort early in the game. Worth a go.',
      "Room to strike it from range, early on — these don't come off often, but it's early enough to gamble.",
      'An ambitious effort from outside the box, early doors.',
    ],
    late: [
      'No time to work a better opening this late — it has to be tried from distance.',
      'A yard of space from outside the box, with the clock running down. Not the easiest sight of goal, but a real one.',
      "The angle isn't perfect, but hesitate now and the chance — maybe the last one — is gone.",
      "Room to strike it from range, deep into the game. When these come off this late, they're unforgettable.",
    ],
  },
  def_set_piece: {
    early: [
      "They've won an early set piece — get the shape right and see off this first test.",
      'A dangerous-looking delivery early in the game. Good organisation nips it in the bud.',
      'Early set piece for the opposition — nothing to fear with the right setup.',
      "The whistle's gone for a free kick in a dangerous area, early on. Time to get organised.",
    ],
    late: [
      "They've won a dangerous set piece with time running out. Get the defensive shape wrong here and it's costly.",
      'Bodies packing the box at the other end, deep into the game — this is about discipline, not heroics.',
      'A dangerous delivery is coming at a crucial time. Set the defence up right and you see this out.',
      "The whistle's gone for a free kick in a dangerous area, late on. Time to organise the wall and the box.",
    ],
  },
  counter_attack: {
    early: [
      'An early turnover — space opening up ahead, early enough to test them.',
      "The ball's won back early — a chance to catch them cold before they've settled.",
      "They're a little disorganised early on. Move quickly and you could make an early statement.",
      'Possession won in a promising area, early in the game.',
    ],
    late: [
      'Turnover, deep into the game! Space opening up ahead — this is exactly the moment counter-attacks are built for.',
      "The ball's won back late on — numbers forward, and a real chance to settle this on the break.",
      "They're stretched and disorganised with time running out. Move quickly now and this could be decisive.",
      'Possession won in a dangerous area, late in the game — the next few seconds could define the result.',
    ],
  },
}

const LATE_MINUTE_THRESHOLD = 60

function scoreStateFor(userGoals: number, oppGoals: number): ScoreState {
  if (userGoals === oppGoals) return 'level'
  return userGoals > oppGoals ? 'userLeads' : 'userTrails'
}

/**
 * Picks this event's commentary line for display, given the match minute it landed at and the
 * score AT THAT MOMENT — called at render time (not when the event was drawn into the queue),
 * since the score when an event actually fires depends on everything that happened before it
 * (ambient goals, earlier decisions), which isn't known until the match has played that far.
 * Deterministic per (event, minute) via a dedicated hash rather than the match's shared RNG, so
 * re-rendering never picks a different line and resolving other decisions never shifts this one.
 */
export function commentaryFor(event: PoolEvent, minute: number, userGoals: number, oppGoals: number): string {
  const bucket = COMMENTARY[event.id]
  if (!bucket) return event.label
  const timeBucket = minute >= LATE_MINUTE_THRESHOLD || bucket.early.length === 0 ? bucket.late : bucket.early
  const scoreState = scoreStateFor(userGoals, oppGoals)
  const eligible = timeBucket.filter((l) => typeof l === 'string' || l.only.includes(scoreState))
  const pool = eligible.length > 0 ? eligible : timeBucket
  const line = pool[new SeededRandom(`${event.id}|${minute}`).int(0, pool.length - 1)]
  return typeof line === 'string' ? line : line.text
}
