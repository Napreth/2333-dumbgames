import type { InjectionKey, ShallowRef } from 'vue'

export interface LeaderboardEntry {
  rank: number
  score: number
  nickname: string
}

export interface Leaderboard {
  list(): Promise<readonly LeaderboardEntry[]>
  submit(score: number): Promise<void>
}

export class LeaderboardRateLimitError extends Error {}

export interface PlatformCapabilities {
  leaderboard?(gameId: string, boardKey: string): Promise<Leaderboard | undefined>
}

export const platformKey: InjectionKey<Readonly<ShallowRef<PlatformCapabilities>>> = Symbol('platform')
