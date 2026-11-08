import * as T from 'three'
import { characterMeshes } from '../assets/characters'
import { gearTexture, shadowTexture } from '../assets/textures'
import { RUN, tiers } from '../config'
import { decompose } from '../simulation/army'
import type { CombatType } from '../simulation/economy'

type Pose = 'idle' | 'run' | 'attack' | 'hit' | 'fall'
type Part = keyof ReturnType<typeof characterMeshes>

export function createArmies(scene: T.Scene, budget: number) {
  const surfaces = characterMeshes()
  const armor = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.56, flatShading: true })
  const gear = new T.MeshStandardMaterial({ map: gearTexture(), roughness: 0.59, flatShading: true })
  const shadow = new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
  const capacities: Record<Part, number> = { joint: 6, plate: 9, block: 5, head: 1, helmet: 1, shield: 1, crest: 1, shadow: 1 }
  const keys = Object.keys(surfaces) as Part[]
  const batches = {} as Record<Part, T.InstancedMesh>
  const used = { ...capacities }
  for (const key of keys) {
    const material = key === 'shadow' ? shadow : key === 'plate' || key === 'helmet' ? gear : armor
    const batch = new T.InstancedMesh(surfaces[key], material, budget * capacities[key])
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage)
    batch.frustumCulled = false
    batch.count = 0
    scene.add(batch)
    batches[key] = batch
  }

  const root = new T.Object3D()
  const joint = new T.Object3D()
  const color = new T.Color()
  const flat = -Math.PI / 2
  let playerPower = -1n
  let enemyPower = -1n
  let playerUnits: number[] = []
  let enemyUnits: number[] = []

  function draw(key: Part, tint: number, x: number, y: number, z: number, w: number, h: number, d: number, tilt = 0, roll = 0) {
    joint.position.set(x, y, z)
    joint.rotation.set(tilt, 0, roll)
    joint.scale.set(w, h, d)
    joint.updateMatrix()
    joint.matrix.premultiply(root.matrix)
    const index = used[key]++
    batches[key].setMatrixAt(index, joint.matrix)
    if (key !== 'shadow') batches[key].setColorAt(index, color.setHex(tint))
  }

  function character(x: number, z: number, tier: number, time: number, seed: number, opponent: boolean, pose: Pose, life = 0) {
    const style = tiers[tier % tiers.length]
    const advanced = tier >= tiers.length
    const scale = advanced ? 1.36 : style.size
    const suit = opponent ? 0xd54b69 : style.color
    const trim = opponent ? 0xffc47a : style.trim
    const accent = opponent ? 0x5a234d : 0x223954
    const skin = tier === 6 ? 0x95dcf4 : 0xffcf9d
    const wave = time * (pose === 'attack' ? 14 : 17) + seed * 1.63
    const running = pose === 'run'
    const motion = running ? Math.sin(wave) : 0
    const stride = motion * 0.81
    const bodyBob = running ? Math.abs(Math.sin(wave)) * 0.12 : Math.sin(time * 4 + seed) * 0.024
    const strike = pose === 'attack' ? Math.max(0, Math.sin(wave)) : 0
    const recoil = pose === 'hit' ? 0.2 : 0

    root.position.set(x, 0.062, z)
    root.rotation.set(0, 0, 0)
    root.scale.setScalar(scale)
    root.updateMatrix()
    draw('shadow', 0xffffff, 0, 0, 0, 1.16, 1.12, 1, flat)

    root.rotation.set(pose === 'fall' ? -Math.min(1.45, life * 4) : (running ? -0.12 : recoil), opponent ? Math.PI : 0, pose === 'hit' ? 0.14 : 0)
    root.position.y += pose === 'fall' ? -life * 0.31 : bodyBob * scale
    root.position.z += (opponent ? 1 : -1) * strike * 0.24
    root.updateMatrix()

    draw('plate', suit, 0, 0.79, 0.012, tier === 1 ? 0.59 : 0.53, 0.52, 0.38)
    draw('plate', accent, 0, 0.555, 0.018, 0.55, 0.14, 0.41)
    draw('block', trim, 0, 0.556, 0.224, 0.135, 0.10, 0.025)
    draw('head', skin, 0, 1.25, -0.012, 0.52, 0.54, 0.50)
    draw('helmet', tier >= 2 ? suit : accent, 0, 1.31, -0.01, 0.57, 0.57, 0.55)
    draw('plate', trim, 0, 1.31, 0.23, 0.44, 0.08, 0.16)
    draw('block', 0x172843, -0.087, 1.22, -0.253, 0.055, 0.055, 0.021)
    draw('block', 0x172843, 0.087, 1.22, -0.253, 0.055, 0.055, 0.021)
    draw('plate', tier >= 2 ? trim : suit, 0, 0.84, 0.248, tier === 6 ? 0.52 : 0.34, 0.36, 0.14)
    if (tier >= 3) draw('plate', trim, 0, 0.84, -0.20, 0.43, 0.29, 0.12)
    if (tier >= 5 || advanced) draw('crest', trim, 0, 1.62, 0, 0.17, tier === 7 ? 0.38 : 0.26, 0.38)

    for (const side of [-1, 1]) {
      const leg = side * stride
      const arm = -leg - (side === 1 ? strike : 0)
      draw('joint', accent, side * 0.16, 0.35 + Math.max(0, -leg) * 0.06, -Math.sin(leg) * 0.13, 0.205, 0.217, 0.205, leg)
      draw('plate', tier >= 2 ? trim : accent, side * 0.16, 0.125 + Math.abs(leg) * 0.11, -0.06 - Math.sin(leg) * 0.26, 0.24, 0.20, 0.34, leg * 0.23)
      draw('joint', tier >= 2 ? suit : skin, side * 0.36, 0.75 + Math.abs(arm) * 0.06, -Math.sin(arm) * 0.14, 0.18, 0.225, 0.18, arm, side * 0.12)
      draw('joint', skin, side * 0.36, 0.58 + Math.abs(arm) * 0.1, -Math.sin(arm) * 0.24, 0.16, 0.105, 0.16, arm)
      if (tier >= 3) draw('plate', trim, side * 0.32, 0.95, 0.018, 0.22, 0.18, 0.27, 0, side * 0.25)
    }
    if (tier === 4 || tier === 7) draw('shield', trim, -0.43, 0.67, -0.17, 0.48, 0.4, 0.61, Math.PI / 2)
    if (tier === 5 || tier === 6) draw('block', trim, 0.43, 0.72, -0.17 - strike * 0.28, 0.085, 0.52, 0.09, -0.8 - strike)
  }

  function units(power: bigint) {
    const visible: number[] = []
    for (const { count, tier } of decompose(power).reverse()) {
      for (let index = 0; index < count && visible.length < budget; index++) visible.push(tier)
    }
    return visible
  }

  function formation(group: number[], limit: number, x: number, z: number, time: number, enemy: boolean, pose: Pose, fold: number, hideTier?: number) {
    const count = Math.min(group.length, limit)
    const cols = Math.min(7, Math.ceil(Math.sqrt(count * 1.85)))
    const spread = Math.min(0.66, (RUN.trackWidth / 2 - Math.abs(x) - 0.62) / Math.max(1, (cols - 1) / 2))
    for (let index = 0; index < count; index++) {
      if (group[index] === hideTier) {
        hideTier = undefined
        continue
      }
      const row = Math.floor(index / cols)
      const rowCount = Math.min(count - row * cols, cols)
      const column = index % cols - (rowCount - 1) / 2
      const packedX = column * spread * (1 - fold)
      const packedZ = row * 0.69 * (1 - fold)
      character(x + packedX, z + packedZ * (enemy ? -1 : 1), group[index], time, index, enemy, pose)
    }
  }

  function update(options: {
    power: bigint; enemy: bigint; x: number; playerZ: number; enemyZ: number; time: number;
    battle?: CombatType; approaching?: CombatType; playerPose: Pose; enemyPose: Pose; merge: number; tier?: number; hit: number; fallen: boolean;
  }) {
    for (const key of keys) used[key] = 0
    if (options.power !== playerPower) {
      playerPower = options.power
      playerUnits = units(playerPower)
    }
    if (options.enemy !== enemyPower) {
      enemyPower = options.enemy
      enemyUnits = units(enemyPower)
    }

    const teamBudget = Math.floor((budget - 8) / (options.approaching ? 2 : 1))
    const enemyBudget = options.approaching === 'boss' ? teamBudget : Math.floor(teamBudget * 0.65)
    const fold = options.merge > 0 ? Math.sin(options.merge * Math.PI) * 0.62 : 0
    const converging = options.merge > 0.42
    formation(playerUnits, teamBudget, options.x, options.playerZ, options.time, false, options.playerPose, fold,
      converging ? options.tier : undefined)
    formation(enemyUnits, enemyBudget, 0, options.enemyZ, options.time, true, options.enemyPose, 0)
    if (converging && options.tier !== undefined) {
      const contraction = (options.merge - 0.42) / 0.58
      for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4
        const radius = 0.27 + contraction * 1.9
        const x = Math.max(-3.62, Math.min(3.62, options.x + Math.cos(angle) * radius))
        character(x, options.playerZ + Math.sin(angle) * radius,
          Math.max(0, options.tier - 1), options.time, index + 9, false, 'run')
      }
    } else if (options.hit > 0 || options.fallen) {
      const age = options.fallen ? 0.7 : 0.57 - options.hit
      for (let index = 0; index < 4; index++) {
        const opponent = options.battle && index > 1
        character((opponent ? 0 : options.x) + (index % 2 ? -1 : 1) * (0.6 + age),
          (opponent ? options.enemyZ : options.playerZ) + age * 0.55, 0, options.time, index, Boolean(opponent), 'fall', age)
      }
    }
    for (const key of keys) {
      batches[key].count = used[key]
      batches[key].instanceMatrix.needsUpdate = true
      if (batches[key].instanceColor) batches[key].instanceColor!.needsUpdate = true
    }
    return { player: Math.min(playerUnits.length, teamBudget), enemy: Math.min(enemyUnits.length, enemyBudget) }
  }

  return { update }
}
