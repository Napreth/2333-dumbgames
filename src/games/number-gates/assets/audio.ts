import type { RunEvent } from '../simulation/run'

export function createAudio() {
  let audio: AudioContext | undefined
  let master: GainNode | undefined
  let muted = false
  let footAt = 0
  let hitAt = 0

  function activate() {
    try {
      if (!audio) {
        audio = new AudioContext()
        master = audio.createGain()
        master.gain.value = muted ? 0 : 0.22
        master.connect(audio.destination)
      }
      if (audio.state === 'suspended') void audio.resume().catch(() => {})
    } catch {
      // Playback is optional when a WebView has no Web Audio support.
    }
  }

  function note(from: number, to: number, duration: number, strength: number, delay = 0, shape: OscillatorType = 'triangle') {
    if (!audio || !master || audio.state !== 'running' || muted) return
    const at = audio.currentTime + delay
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = shape
    oscillator.frequency.setValueAtTime(from, at)
    oscillator.frequency.exponentialRampToValueAtTime(to, at + duration)
    gain.gain.setValueAtTime(0.001, at)
    gain.gain.exponentialRampToValueAtTime(strength, at + 0.014)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    oscillator.connect(gain).connect(master)
    oscillator.start(at)
    oscillator.stop(at + duration)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }

  return {
    activate,
    mute(value: boolean) {
      muted = value
      if (audio && master) master.gain.setTargetAtTime(value ? 0 : 0.22, audio.currentTime, 0.025)
    },
    step() {
      if (!audio || audio.currentTime < footAt) return
      footAt = audio.currentTime + 0.29
      note(94, 46, 0.08, 0.10, 0, 'sine')
    },
    react(event: RunEvent) {
      switch (event.kind) {
        case 'gate':
          if (event.delta >= 0n) {
            note(440, 660, 0.14, 0.34)
            if (event.tier !== undefined) {
              note(660, 880, 0.21, 0.34, 0.12)
              note(880, 1320, 0.27, 0.22, 0.22, 'sine')
            }
          } else note(210, 92, 0.22, 0.34, 0, 'sawtooth')
          break
        case 'battle':
          note(130, 210, 0.4, 0.37)
          note(175, 275, 0.35, 0.29, 0.25)
          break
        case 'hit':
          if (audio && audio.currentTime >= hitAt) {
            hitAt = audio.currentTime + 0.17
            note(98, 49, 0.13, 0.31, 0, 'square')
          }
          break
        case 'victory':
          note(392, 440, 0.18, 0.36)
          note(523, 659, 0.27, 0.29, 0.13)
          note(784, 1046, 0.38, 0.25, 0.24)
          break
        case 'failed':
          note(310, 130, 0.39, 0.36)
          note(156, 71, 0.34, 0.24, 0.17)
          break
      }
    },
    dispose() { if (audio) void audio.close().catch(() => {}) },
  }
}
