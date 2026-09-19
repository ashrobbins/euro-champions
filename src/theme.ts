import type { Player } from './types'

export type PosColorKey = 'gk' | 'def' | 'mid' | 'att'

/** FLEX (wildcard) players show as whichever real role they play — MID or ATT. */
export function posColorKey(player: Player): PosColorKey {
  if (player.position === 'FLEX') return player.flexRole === 'ATT' ? 'att' : 'mid'
  return player.position.toLowerCase() as PosColorKey
}

export const POS_HEX: Record<PosColorKey, string> = {
  gk: '#22b573',
  def: '#3e6fe0',
  mid: '#8266e0',
  att: '#e0527a',
}

export const POS_LABEL: Record<string, string> = {
  GK: 'GOALKEEPER',
  DEF: 'DEFENDER',
  MID: 'MIDFIELDER',
  ATT: 'ATTACKER',
  FLEX: 'WILDCARD',
}

export const DEFAULT_TEAM_COLOR = '#e8b93f'

/** Predefined kit-colour palette for the user's squad identity marker (Match/Results/League). Optional, defaults to gold. */
export const TEAM_COLORS: string[] = [
  '#e8b93f', // gold (default)
  '#e05252', // red
  '#e07a3f', // orange
  '#a3c93f', // olive
  '#4fbf6b', // green
  '#2fbfa0', // teal
  '#3ea9e0', // sky blue
  '#4c6fe0', // blue
  '#6b4ce0', // indigo
  '#9b4ce0', // purple
  '#c94ce0', // magenta
  '#e04c9b', // pink
  '#b03040', // crimson
  '#8a8a8a', // silver
  '#f5f5f0', // white
]

export function initials(name: string): string {
  const parts = name.replace('.', '').split(' ')
  return parts.map((p) => p[0]).join('').slice(-2).toUpperCase()
}

/** FLEX (wildcard) players show their actual role (MID/ATT), not the literal "FLEX" slot name. */
export function posAbbr(player: Player): string {
  return player.position === 'FLEX' ? (player.flexRole ?? 'MID') : player.position
}
