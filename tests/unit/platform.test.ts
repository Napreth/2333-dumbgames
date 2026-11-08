import { describe, expect, it, vi } from 'vitest'
import { createToyCapabilities } from '../../src/core/platform/bilibili/adapter'
import type { ToyBoards } from '../../src/core/platform/bilibili/config'
import { detectPlatform } from '../../src/core/platform/detect'
import { LeaderboardRateLimitError } from '../../src/core/platform/types'

const config = { 'number-gates': { easy: 1, 'second-stage': 5 } } satisfies ToyBoards

function mockSdk() {
  return {
    isSupport: vi.fn(async () => true),
    getRankList: vi.fn(async () => [{ rank: 1, score: 45, nickname: '测试玩家', avatar: '' }]),
    submitScore: vi.fn(async () => ({ score: 50 })),
  }
}

describe('optional Toy leaderboard', () => {
  it('returns no capabilities without a configured SDK', async () => {
    expect(await detectPlatform()).toEqual({})
    expect(await createToyCapabilities(undefined, config)).toEqual({})
    expect(await createToyCapabilities(mockSdk(), {})).toEqual({})
  })

  it('hides the leaderboard when capability detection or a real read fails', async () => {
    const sdk = mockSdk()
    sdk.isSupport.mockResolvedValueOnce(false)
    expect(await createToyCapabilities(sdk, config)).toEqual({})
    sdk.isSupport.mockRejectedValueOnce(new Error('SDK initialization failed'))
    expect(await createToyCapabilities(sdk, config)).toEqual({})
    sdk.getRankList.mockRejectedValueOnce(new Error('No Toy host'))
    const capabilities = await createToyCapabilities(sdk, config)
    expect(await capabilities.leaderboard?.('number-gates', 'easy')).toBeUndefined()
    expect(await capabilities.leaderboard?.('number-gates', 'normal')).toBeUndefined()
  })

  it('rejects assigning the same slot across multiple games', async () => {
    expect(await createToyCapabilities(mockSdk(), { ...config, other: { 'personal-best': 5 } })).toEqual({})
  })

  it('accepts a game-defined board key without a difficulty', async () => {
    const sdk = mockSdk()
    const { leaderboard } = await createToyCapabilities(sdk, { other: { 'personal-best': 3 } })
    expect(await leaderboard?.('other', 'personal-best')).toBeDefined()
    expect(sdk.getRankList).toHaveBeenCalledExactlyOnceWith({ board: 3, limit: 20 })
  })

  it('isolates scores by board, caches reads, and invalidates the cache on submission', async () => {
    const sdk = mockSdk()
    const { leaderboard } = await createToyCapabilities(sdk, config)
    const first = (await leaderboard?.('number-gates', 'easy'))!
    const highest = (await leaderboard?.('number-gates', 'second-stage'))!
    expect(sdk.getRankList.mock.calls).toEqual([[{ board: 1, limit: 20 }], [{ board: 5, limit: 20 }]])
    expect(await first.list()).toHaveLength(1)
    await expect(highest.submit(2 ** 24)).rejects.toThrow(RangeError)
    await highest.submit(50)
    expect(sdk.submitScore).toHaveBeenCalledExactlyOnceWith({ board: 5, score: 50 })
    await highest.list()
    expect(sdk.getRankList).toHaveBeenCalledTimes(3)
  })

  it('surfaces a rate-limit failure without retrying submission', async () => {
    const sdk = mockSdk()
    sdk.submitScore.mockRejectedValueOnce({ type: 'http_error', code: 307044 })
    const { leaderboard } = await createToyCapabilities(sdk, config)
    const board = (await leaderboard?.('number-gates', 'easy'))!
    await expect(board.submit(50)).rejects.toBeInstanceOf(LeaderboardRateLimitError)
    expect(sdk.submitScore).toHaveBeenCalledTimes(1)
  })
})
