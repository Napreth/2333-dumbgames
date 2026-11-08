import { COMBAT, INITIAL_POWER, RUN } from '../config'
import { applyGate, mergedTier, resolveCombat } from './army'
import { contactDistance } from './entities'
import type { TrackEnemy, TrackGate } from './entities'
import { sideAt } from './routes'
import type { Side } from './routes'
import { appendGroup, createTrack } from './track'
import type { OnGroup, Track } from './track'

interface Battle {
  entity: TrackEnemy
  elapsed: number
  player: bigint
  loss: bigint
  tick: number
}

export interface Run {
  track: Track
  distance: number
  travel: number
  x: number
  passed: number
  completed: number
  power: bigint
  enemy: bigint
  lastGate?: TrackGate
  battle?: Battle
  failed: boolean
}

export type RunEvent =
  | { kind: 'gate'; delta: bigint; side: number; tier?: number }
  | { kind: 'battle'; type: TrackEnemy['battleType'] }
  | { kind: 'hit' | 'victory' | 'failed' }

type Emit = (event: RunEvent) => void

export function createRun(seed: number, onGroup?: OnGroup): Run {
  const run: Run = {
    track: createTrack(seed), distance: 0, travel: 0, x: 0,
    passed: 0, completed: 0, power: INITIAL_POWER, enemy: 0n, failed: false,
  }
  appendGroup(run.track, run, onGroup)
  appendGroup(run.track, run, onGroup)
  return run
}

export function moveTo(run: Run, distance: number) {
  run.travel = (run.travel + distance - run.distance) % 120
  run.distance = distance
}

export function steerX(from: number, target: number, dt: number) {
  const dx = Math.max(-RUN.maxX, Math.min(RUN.maxX, target)) - from
  const gap = Math.abs(dx)
  const threshold = RUN.lateralSpeed / RUN.steering
  const linearTime = Math.max(0, (gap - threshold) / RUN.lateralSpeed)
  const remainder = dt < linearTime ? gap - RUN.lateralSpeed * dt
    : Math.min(gap, threshold) * Math.exp(-RUN.steering * (dt - linearTime))
  return from + Math.sign(dx) * (gap - remainder)
}

export function meetNext(run: Run, side: Side, emit: Emit) {
  const entity = run.track.entities.shift()!
  if (entity.kind === 'enemy') {
    run.enemy = entity.power
    run.battle = { entity, elapsed: 0, player: run.power, loss: resolveCombat(run.power, entity.power).loss, tick: 0 }
    emit({ kind: 'battle', type: entity.battleType })
    return
  }
  const before = run.power
  run.lastGate = entity
  run.power = applyGate(before, entity.gates[side])
  run.passed++
  emit({ kind: 'gate', delta: run.power - before, side, tier: mergedTier(before, run.power) })
  if (run.power === 0n) {
    run.failed = true
    emit({ kind: 'failed' })
  }
}

export function advance(run: Run, dt: number, targetX: number, emit: Emit, onGroup?: OnGroup) {
  if (run.failed) return
  if (run.battle) {
    const battle = run.battle
    const timing = COMBAT.timing[battle.entity.battleType]
    battle.elapsed += dt
    const fraction = (battle.elapsed - timing.approach) / (timing.contact - timing.approach)
    const tick = Math.max(0, Math.min(RUN.battleTicks, Math.floor(fraction * RUN.battleTicks)))
    if (tick !== battle.tick) {
      battle.tick = tick
      const loss = battle.loss * BigInt(tick) / BigInt(RUN.battleTicks)
      if (run.power !== battle.player - loss) {
        run.power = battle.player - loss
        run.enemy = battle.entity.power - loss
        emit({ kind: 'hit' })
      }
    }
    if (battle.elapsed >= timing.duration) {
      run.completed++
      if (run.power === 0n) {
        run.failed = true
        emit({ kind: 'failed' })
      } else {
        run.x *= 1 - RUN.battleCenterWeight
        run.battle = undefined
        appendGroup(run.track, run, onGroup)
        emit({ kind: 'victory' })
      }
    }
    return
  }

  const beforeX = run.x
  const beforeDistance = run.distance
  const motion = RUN.forwardSpeed * dt
  const endDistance = beforeDistance + motion
  for (let entity = run.track.entities[0]; entity && contactDistance(entity) <= endDistance; entity = run.track.entities[0]) {
    const contact = contactDistance(entity)
    run.x = steerX(beforeX, targetX, (contact - beforeDistance) / RUN.forwardSpeed)
    moveTo(run, contact)
    meetNext(run, sideAt(run.x), emit)
    if (run.battle || run.failed) return
  }
  run.x = steerX(beforeX, targetX, dt)
  moveTo(run, endDistance)
}
