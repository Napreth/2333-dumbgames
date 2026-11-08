import { LeaderboardRateLimitError } from '../types'
import type { Leaderboard, LeaderboardEntry, PlatformCapabilities } from '../types'
import type { ToyBoard, ToyBoards } from './config'

interface ToyLeaderboardSdk {
  isSupport(method: 'getRankList' | 'submitScore'): Promise<boolean>
  getRankList(request: { board: ToyBoard; limit: number }): Promise<(LeaderboardEntry & { avatar: string })[]>
  submitScore(request: { board: ToyBoard; score: number }): Promise<{ score: number }>
}

export function hasLeaderboardSdk(candidate: unknown): candidate is ToyLeaderboardSdk {
  return candidate !== null && typeof candidate === 'object'
    && 'isSupport' in candidate && typeof candidate.isSupport === 'function'
    && 'getRankList' in candidate && typeof candidate.getRankList === 'function'
    && 'submitScore' in candidate && typeof candidate.submitScore === 'function'
}

export async function createToyCapabilities(
  candidate: unknown,
  config: ToyBoards,
): Promise<PlatformCapabilities> {
  if (!hasLeaderboardSdk(candidate)) return {}

  const configured = new Map<string, Map<string, Leaderboard>>()
  const used = new Set<ToyBoard>()

  for (const [id, boards] of Object.entries(config)) {
    const gameBoards = new Map<string, Leaderboard>()
    for (const [key, board] of Object.entries(boards)) {
      if (!Number.isInteger(board) || board < 1 || board > 5 || used.has(board)) return {}
      used.add(board)
      gameBoards.set(key, createLeaderboard(candidate, board))
    }
    if (gameBoards.size) configured.set(id, gameBoards)
  }
  if (!configured.size) return {}

  try {
    const [canList, canSubmit] = await Promise.all([
      candidate.isSupport('getRankList'),
      candidate.isSupport('submitScore'),
    ])
    if (!canList || !canSubmit) return {}
  } catch {
    return {}
  }

  return {
    async leaderboard(gameId, boardKey) {
      const board = configured.get(gameId)?.get(boardKey)
      if (!board) return
      try {
        // isSupport reports method availability, even on ordinary web pages.
        await board.list()
        return board
      } catch {
        return undefined
      }
    },
  }
}

function createLeaderboard(sdk: ToyLeaderboardSdk, board: ToyBoard): Leaderboard {
  let pendingList: Promise<readonly LeaderboardEntry[]> | undefined

  return {
    list() {
      if (!pendingList) {
        const request = sdk.getRankList({ board, limit: 20 }).catch((error: unknown) => {
          if (pendingList === request) pendingList = undefined
          throw normalizeError(error)
        })
        pendingList = request
      }
      return pendingList
    },
    async submit(score) {
      if (!Number.isInteger(score) || score < -(2 ** 24) || score >= 2 ** 24) {
        throw new RangeError('Toy scores must fit in the SDK integer range')
      }
      try {
        await sdk.submitScore({ board, score })
      } catch (error) {
        throw normalizeError(error)
      }
      pendingList = undefined
    },
  }
}

function normalizeError(error: unknown): unknown {
  if (error && typeof error === 'object'
    && 'type' in error && error.type === 'http_error'
    && 'code' in error && error.code === 307044) {
    return new LeaderboardRateLimitError('Leaderboard request was rate limited')
  }
  return error
}
