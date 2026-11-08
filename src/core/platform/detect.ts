import { createToyCapabilities } from './bilibili/adapter'
import { toyBoards } from './bilibili/config'
import type { PlatformCapabilities } from './types'

export async function detectPlatform(): Promise<PlatformCapabilities> {
  if (typeof window === 'undefined' || Object.keys(toyBoards).length === 0) return {}

  const host: Window & { toy?: unknown } = window
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      (async () => {
        if (!host.toy) await loadToySdk(controller.signal)
        if (controller.signal.aborted) return {}
        return createToyCapabilities(host.toy, toyBoards)
      })(),
      new Promise<PlatformCapabilities>((resolve) => {
        timer = setTimeout(() => resolve({}), 4000)
      }),
    ])
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

function loadToySdk(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js'
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true, signal })
    script.addEventListener('error', reject, { once: true, signal })
    signal.addEventListener('abort', () => script.remove(), { once: true })
    document.head.append(script)
  })
}
