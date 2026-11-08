import { RUN } from '../config'

const steeringKeys = new Set(['a', 'arrowleft', 'd', 'arrowright'])

export function createControls(
  canvas: HTMLCanvasElement, trackX: (x: number) => number, onInput: () => void, isPlaying: () => boolean,
) {
  const held = new Set<string>()
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  let target = 0
  let drag: { id: number; origin: number; start: number } | undefined
  const clamp = (x: number) => Math.max(-RUN.maxX, Math.min(RUN.maxX, x))

  canvas.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if (!isPlaying() || !steeringKeys.has(key) || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    if (event.repeat && !held.has(key)) return
    held.add(key)
    if (!event.repeat) onInput()
  }, options)
  canvas.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()), options)

  canvas.addEventListener('pointerdown', (event) => {
    if (!isPlaying() || drag || event.button !== 0) return
    canvas.focus({ preventScroll: true })
    drag = { id: event.pointerId, origin: trackX(event.clientX), start: target }
    canvas.setPointerCapture(event.pointerId)
    onInput()
  }, options)
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id === event.pointerId) target = clamp(drag.start + (trackX(event.clientX) - drag.origin) * 1.2)
  }, options)
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    canvas.addEventListener(type, (event) => {
      if (drag?.id === event.pointerId) drag = undefined
    }, options)
  }
  window.addEventListener('blur', clear, options)
  canvas.addEventListener('blur', clear, options)

  function clear() {
    held.clear()
    const id = drag?.id
    drag = undefined
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
  }

  return {
    step(dt: number) {
      const left = held.has('a') || held.has('arrowleft')
      const right = held.has('d') || held.has('arrowright')
      target = clamp(target + (Number(right) - Number(left)) * RUN.lateralSpeed * dt)
      return target
    },
    clear,
    reset() { clear(); target = 0 },
    dispose() { clear(); listeners.abort() },
  }
}
