import * as T from 'three'
import { COMBAT, RUN } from '../config'
import type { Run, RunEvent } from '../simulation/run'
import type { TrackGate } from '../simulation/entities'
import { createArmies } from './army'
import { createEffects } from './effects'
import { createGates } from './gates'
import { createWorld } from './world'

const titleGates: TrackGate[] = [
  { kind: 'gate', id: 0, distance: 14, referencePower: 95n, gates: [{ operation: '+', amount: 28n }, { operation: '×', amount: 2n }] },
  { kind: 'gate', id: 1, distance: 34, referencePower: 95n, gates: [{ operation: '÷', amount: 2n }, { operation: '−', amount: 15n }] },
]

export function createScene(canvas: HTMLCanvasElement) {
  const mobile = matchMedia('(pointer: coarse)').matches
  const compact = mobile || (navigator.hardwareConcurrency || 4) <= 4
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new T.WebGLRenderer({ canvas, antialias: !compact, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.6))
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.11

  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(52, 1, 0.13, 145)
  const updateWorld = createWorld(scene)
  const updateGates = createGates(scene)
  const army = createArmies(scene, compact ? RUN.mobileUnits : RUN.visibleUnits)
  const effects = createEffects(scene, compact ? 24 : 46)
  const ray = new T.Raycaster()
  const playerPlane = new T.Plane(new T.Vector3(0, 0, 1))
  const cursor = new T.Vector2()
  const projected = new T.Vector3()
  const contact = new T.Vector3()
  let time = 0
  let merging = 0
  let tier: number | undefined
  let hit = 0
  let mergeSpark = false

  function resize() {
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    camera.aspect = width / height
    camera.fov = camera.aspect < 0.85 ? 64 : 52
    if (scene.background instanceof T.Texture) {
      const visibleWidth = Math.min(1, camera.aspect / 1.875)
      scene.background.repeat.x = visibleWidth
      scene.background.offset.x = (1 - visibleWidth) * 0.7
    }
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function trackX(clientX: number) {
    const rect = canvas.getBoundingClientRect()
    camera.updateMatrixWorld()
    projected.set(0, 0, 0).project(camera)
    cursor.set((clientX - rect.left) / rect.width * 2 - 1, projected.y)
    ray.setFromCamera(cursor, camera)
    return ray.ray.intersectPlane(playerPlane, contact)?.x ?? 0
  }

  function react(event: RunEvent, run: Run) {
    switch (event.kind) {
      case 'gate':
        effects.burst(run.x, -0.18, event.delta >= 0n ? 0xb4fc74 : 0xff9a83, reducedMotion ? 4 : 13, true)
        if (event.tier !== undefined) {
          merging = 0.74
          tier = event.tier
          mergeSpark = true
        }
        if (event.delta < 0n) hit = 0.48
        break
      case 'battle':
        effects.burst(0, -8, event.type === 'boss' ? 0xff79ac : 0xffc179, event.type === 'boss' && !reducedMotion ? 27 : 12, true)
        break
      case 'hit':
        hit = 0.57
        effects.burst(run.x * 0.14, -2.8, 0xffcb7d, reducedMotion ? 3 : 9)
        break
      case 'victory':
        effects.burst(run.x, -1.2, 0xfcf99e, reducedMotion ? 6 : 27, true)
        break
      case 'failed':
        effects.burst(run.x, run.battle ? -1.6 : 0, 0xff8b90, 10)
        break
    }
  }

  function projectArmy(x: number, z: number, count: number, rowDirection: 1 | -1) {
    const columns = Math.max(1, Math.min(7, Math.ceil(Math.sqrt(count * 1.85))))
    const rows = Math.ceil(count / columns)
    projected.set(x, 2.3, z + rowDirection * Math.max(0, rows - 1) * 0.38).project(camera)
    return { left: (1 + projected.x) * 50, top: (1 - projected.y) * 50 }
  }

  function draw(run: Run, dt: number, paused = false) {
    time += dt
    merging = Math.max(0, merging - dt)
    hit = Math.max(0, hit - dt)
    if (mergeSpark && merging <= 0.31) {
      effects.burst(run.x, 0, 0xfff286, reducedMotion ? 5 : 19, true)
      mergeSpark = false
    }
    const battle = run.battle
    const upcoming = run.track.entities.find((entity) => entity.kind === 'enemy')
    const enemy = battle?.entity ?? (upcoming && upcoming.distance - run.distance <= RUN.renderAhead ? upcoming : undefined)
    const timing = COMBAT.timing[battle?.entity.battleType ?? 'normal']
    const charge = battle ? T.MathUtils.smoothstep(battle.elapsed, 0.3, timing.approach) : 0
    const x = run.x * (1 - charge * RUN.battleCenterWeight)
    camera.position.set(0, 7.4, camera.aspect < 0.85 ? 13.2 : 11.8)
    camera.lookAt(0, 0.85, -8.7)

    updateWorld(run.travel)
    updateGates(run)
    const marching = battle ? battle.elapsed > 0.3 && battle.elapsed < timing.approach : !run.failed
    const fighting = battle && battle.elapsed >= timing.approach && battle.elapsed < timing.contact
    const pose = paused ? 'idle' : marching ? 'run' : fighting ? 'attack' : 'idle'
    const recoil = fighting && hit > 0.46
    const playerPose = recoil && battle.tick % 2 === 0 || !battle && hit > 0.36 ? 'hit' : pose
    const enemyPose = recoil && battle.tick % 2 !== 0 ? 'hit' : pose
    const playerZ = -charge * 1.58
    const enemyZ = enemy ? run.distance - enemy.distance + charge * 4.86 : 0
    const count = army.update({
      power: run.power, enemy: battle ? run.enemy : enemy?.power ?? 0n, x, time,
      battle: battle?.entity.battleType, approaching: enemy?.battleType,
      playerZ, enemyZ,
      playerPose, enemyPose: battle ? enemyPose : 'idle', merge: merging / 0.74, tier, hit, fallen: run.failed,
    })
    effects.update(dt)
    renderer.render(scene, camera)
    return {
      player: projectArmy(x, playerZ, count.player, 1),
      enemy: battle && count.enemy > 0 ? projectArmy(0, enemyZ, count.enemy, -1) : undefined,
    }
  }

  function drawTitle() {
    const portrait = camera.aspect < 0.85
    camera.position.set(portrait ? 2.2 : -3.4, portrait ? 5.2 : 5.9, portrait ? 9.8 : 10.2)
    camera.lookAt(portrait ? 0 : -1.1, portrait ? 2.5 : 2.4, -8)
    updateWorld(0)
    updateGates({ distance: 0, track: { seed: -1, entities: titleGates } })
    army.update({
      power: 95n, enemy: 0n, x: portrait ? 0 : 0.9, playerZ: 0, enemyZ: 0, time: 0,
      playerPose: 'idle', enemyPose: 'idle', merge: 0, hit: 0, fallen: false,
    })
    renderer.render(scene, camera)
  }

  function reset() {
    merging = hit = time = 0
    mergeSpark = false
    effects.clear()
  }

  function dispose() {
    const geometries = new Set<T.BufferGeometry>()
    const materials = new Set<T.Material>()
    const textures = new Set<T.Texture>()
    if (scene.background instanceof T.Texture) textures.add(scene.background)
    scene.traverse((object) => {
      if (object instanceof T.InstancedMesh) object.dispose()
      if (object instanceof T.Mesh) geometries.add(object.geometry)
      if (object instanceof T.Mesh || object instanceof T.Sprite) {
        const entries: T.Material[] = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of entries) {
          materials.add(material)
          if ('map' in material && material.map instanceof T.Texture) textures.add(material.map)
        }
      }
    })
    for (const resource of [...geometries, ...materials, ...textures]) resource.dispose()
    scene.clear()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return { resize, trackX, draw, drawTitle, react, reset, dispose }
}
