import { RUN } from '../config'
import { applyGate, resolveCombat } from './army'
import type { TrackEntity, TrackGate } from './entities'
import { contactDistance } from './entities'

export type Side = 0 | 1
export type Position = { power: bigint; x: number; distance: number }
type Lanes = readonly (Position | undefined)[]
export const laneX = (side: Side) => side === 0 ? -RUN.laneX : RUN.laneX
export const sideAt = (x: number): Side => x < 0 ? 0 : 1

export function canReach(from: number, to: number, distance: number): boolean {
  return distance / RUN.forwardSpeed >= Math.abs(to - from) / RUN.lateralSpeed + 0.38
}

export function landing(from: number, side: Side, gap: number) {
  const center = laneX(side)
  if (canReach(from, center, gap)) return center
  if (side === sideAt(from)) return from
}

export function advanceRoute(lanes: Lanes, entity: TrackEntity): Lanes {
  if (entity.kind === 'enemy') {
    return lanes.map((lane) => {
      if (!lane) return
      const power = resolveCombat(lane.power, entity.power).player
      if (power > 0n) return { power, x: lane.x * (1 - RUN.battleCenterWeight), distance: contactDistance(entity) }
    })
  }
  const next: (Position | undefined)[] = [undefined, undefined]
  for (const lane of lanes) {
    if (!lane) continue
    for (const side of [0, 1] as const) {
      const x = landing(lane.x, side, entity.distance - lane.distance)
      if (x === undefined) continue
      const power = applyGate(lane.power, entity.gates[side])
      if (power > (next[side]?.power ?? 0n)) next[side] = { power, x, distance: entity.distance }
    }
  }
  return next
}

export function bestPosition(lanes: Lanes) {
  return lanes.reduce<Position | undefined>((best, lane) => lane && (!best || lane.power > best.power) ? lane : best, undefined)
}

export function bestRoute(entities: readonly TrackEntity[], start: Position) {
  return bestPosition(entities.reduce<Lanes>(advanceRoute, [start]))
}

export const strategies = {
  optimal: { mistake: 0, steeringMistake: 0 },
  strong: { mistake: 0.04, steeringMistake: 0.015 },
  ordinary: { mistake: 0.11, steeringMistake: 0.04 },
  random: { mistake: 0.5, steeringMistake: 0 },
} as const
export type Policy = keyof typeof strategies

export function chooseSide(pair: TrackGate, start: Position, policy: Policy, random: () => number): Side | undefined {
  const gap = pair.distance - start.distance
  const left = landing(start.x, 0, gap) !== undefined
  const right = landing(start.x, 1, gap) !== undefined
  if (!left) return right ? 1 : undefined
  if (!right) return 0
  const better = applyGate(start.power, pair.gates[0]) >= applyGate(start.power, pair.gates[1]) ? 0 : 1
  const strategy = strategies[policy]
  const picked = random() < strategy.mistake ? (1 - better) as Side : better
  if (random() < strategy.steeringMistake && start.x * laneX(picked) < 0) return (1 - picked) as Side
  return picked
}
