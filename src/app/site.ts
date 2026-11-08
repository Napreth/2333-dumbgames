export const siteName = '2333沙雕小游戏'

export function siteTitle(page?: string) {
  return page ? `${page} - ${siteName}` : siteName
}

export function siteHref(gameId?: string) {
  if (import.meta.env.MODE === 'web') return gameId ? `/games/${encodeURIComponent(gameId)}/` : '/'
  return gameId ? `#/game/${encodeURIComponent(gameId)}` : '#/'
}
