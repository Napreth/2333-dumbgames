import { describe, expect, it } from 'vitest'
import { games, getGame } from '../../src/core/game/registry'

describe('game registry', () => {
  it('discovers the game metadata and indexes it by ID', () => {
    const game = games.find(({ id }) => id === 'number-gates')
    expect(game).toBeDefined()
    expect(getGame('number-gates')).toBe(game)
    expect(getGame('missing')).toBeUndefined()
    expect(game?.cover).toMatch(/\.svg(?:\?.*)?$/)
    expect(game?.load).toBeTypeOf('function')
  })
})
