import { ECONOMY, INITIAL_POWER, RUN } from '../config'
import { additiveAmount, enemyPower, generateGate, scheduleCombat } from './economy'
import type { CombatSchedule } from './economy'
import type { TrackEnemy, TrackEntity, TrackGate } from './entities'
import { createRandom, integer } from './random'
import { advanceRoute, bestPosition, bestRoute } from './routes'
import type { Position } from './routes'

export interface GroupResult {
  readonly best: bigint
  readonly rejectedPairs: number
  readonly repairedPairs: number
  readonly doomedPrefix: boolean
}

export type OnGroup = (result: GroupResult, entities: readonly TrackEntity[]) => void

export interface Track {
  readonly seed: number
  readonly entities: TrackEntity[]
  tail: number
  schedule: CombatSchedule
  frontier: Position
}

export function createTrack(seed: number): Track {
  return {
    seed, entities: [], tail: 0,
    schedule: scheduleCombat(0, 0, createRandom(seed ^ 0x4127cc19)),
    frontier: { power: INITIAL_POWER, x: 0, distance: 0 },
  }
}

export function appendGroup(track: Track, live: Position, onGroup?: OnGroup) {
  const { passedGateGroups, completedBattles, nextCombatAt, nextCombatType } = track.schedule
  const random = createRandom(track.seed ^ Math.imul(passedGateGroups + 1, 0x9e3779b1))
  const predicted = bestRoute(track.entities, live)
  // A mistake may already have made the next locked group unwinnable.
  // Extend the map from its certified route without changing that group.
  let best = predicted ?? track.frontier
  let lanes: ReturnType<typeof advanceRoute> = [best]
  let distance = track.tail
  let rejectedPairs = 0
  let repairedPairs = 0
  const entities: TrackEntity[] = []
  for (let gateNumber = passedGateGroups + 1; gateNumber <= nextCombatAt; gateNumber++) {
    if (gateNumber === 1) distance += RUN.firstGate
    else if (gateNumber === passedGateGroups + 1) distance += RUN.afterCombatGap
    else distance += integer(random, RUN.minGap, RUN.maxGap)
    const referencePower = best.power
    const minimum = gateNumber === nextCombatAt ? 2n : 1n
    const slot = { kind: 'gate', id: gateNumber * 2, distance, referencePower } as const
    let gate: TrackGate = { ...slot, gates: [generateGate(referencePower, random), generateGate(referencePower, random)] }
    let next = advanceRoute(lanes, gate)
    let landing = bestPosition(next)
    let attempts = 0
    while ((landing?.power ?? 0n) < minimum && attempts < ECONOMY.pairAttempts) {
      rejectedPairs++
      attempts++
      gate = { ...slot, gates: [generateGate(referencePower, random), generateGate(referencePower, random)] }
      next = advanceRoute(lanes, gate)
      landing = bestPosition(next)
    }
    if ((landing?.power ?? 0n) < minimum) {
      // The next gate is at least a full lane-change away. Repair just one
      // side if every roll would block the only surviving route.
      const add = { operation: '+', amount: additiveAmount(referencePower, random(), false) } as const
      gate = { ...slot, gates: random() < 0.5 ? [add, gate.gates[1]] : [gate.gates[0], add] }
      next = advanceRoute(lanes, gate)
      landing = bestPosition(next)
      repairedPairs++
    }
    entities.push(gate)
    lanes = next
    best = landing!
  }

  distance += RUN.combatGap
  const ordinal = completedBattles + 1
  const enemy: TrackEnemy = {
    kind: 'enemy', id: nextCombatAt * 2 + 1, distance, afterGate: nextCombatAt,
    battleType: nextCombatType, ordinal, power: enemyPower(best.power, random(), random()),
  }
  entities.push(enemy)
  track.frontier = bestPosition(advanceRoute(lanes, enemy))!
  track.tail = distance
  track.schedule = scheduleCombat(nextCombatAt, ordinal, createRandom(track.seed ^ Math.imul(ordinal + 1, 0x4127cc19)))
  track.entities.push(...entities)
  const result = { best: track.frontier.power, rejectedPairs, repairedPairs, doomedPrefix: !predicted }
  onGroup?.(result, entities)
  return result
}
