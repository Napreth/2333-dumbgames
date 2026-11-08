import type { GameDefinition } from './types'

const modules = import.meta.glob<GameDefinition>('../../games/*/index.ts', {
  eager: true,
  import: 'default',
})

export const games: readonly GameDefinition[] = Object.keys(modules)
  .sort()
  .map((path) => modules[path])

const byId = new Map(games.map((game) => [game.id, game]))

if (byId.size !== games.length) {
  throw new Error('Duplicate game ID in the game registry')
}

export function getGame(id: string): GameDefinition | undefined {
  return byId.get(id)
}
