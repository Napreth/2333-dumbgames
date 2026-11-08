import * as T from 'three'
import { sparkTexture } from '../assets/textures'

export function createEffects(scene: T.Scene, budget: number) {
  const map = sparkTexture()
  const bursts = Array.from({ length: budget }, () => {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map, depthWrite: false, toneMapped: false }))
    sprite.visible = false
    scene.add(sprite)
    return { sprite, life: 0, duration: 1, x: 0, z: 0, vx: 0, vy: 0, vz: 0 }
  })
  const ring = new T.Mesh(new T.RingGeometry(0.84, 1, 40), new T.MeshBasicMaterial({
    color: 0xe8ffa0, side: T.DoubleSide, transparent: true, depthWrite: false,
  }))
  ring.rotation.x = -Math.PI / 2
  ring.visible = false
  scene.add(ring)
  let cursor = 0
  let ringLife = 0

  function burst(x: number, z: number, tint: number, count: number, pulse = false) {
    for (let i = 0; i < count; i++) {
      const entry = bursts[cursor++ % bursts.length]
      const angle = i * 2.4
      entry.x = x
      entry.z = z
      entry.vx = Math.cos(angle) * (0.7 + i % 4 * 0.46)
      entry.vz = Math.sin(angle) * 1.6
      entry.vy = 1.45 + i % 5 * 0.43
      entry.duration = entry.life = 0.38 + i % 6 * 0.045
      entry.sprite.material.color.setHex(tint)
      entry.sprite.visible = true
    }
    if (pulse) {
      ringLife = 0.72
      ring.material.color.setHex(tint)
      ring.position.set(x, 0.075, z)
    }
  }

  function update(dt: number) {
    for (const entry of bursts) {
      if (!entry.sprite.visible) continue
      entry.life -= dt
      if (entry.life <= 0) {
        entry.sprite.visible = false
        continue
      }
      const age = entry.duration - entry.life
      entry.sprite.position.set(entry.x + age * entry.vx, 0.47 + entry.vy * age - 2.3 * age * age, entry.z + age * entry.vz)
      entry.sprite.scale.setScalar(0.28 * entry.life / entry.duration + 0.06)
      entry.sprite.material.opacity = entry.life / entry.duration
    }
    ringLife -= dt
    ring.visible = ringLife > 0
    if (ring.visible) {
      ring.scale.setScalar(0.75 + (0.72 - ringLife) * 4)
      ring.material.opacity = ringLife / 0.86
    }
  }

  function clear() {
    for (const { sprite } of bursts) sprite.visible = false
    ringLife = 0
  }
  return { burst, update, clear }
}
