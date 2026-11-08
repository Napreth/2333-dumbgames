import { describe, expect, it } from 'vitest'
import { COMBAT, RUN } from '../../src/games/number-gates/config'
import { applyGate, combine, decompose, formatPower, mergedTier, resolveCombat } from '../../src/games/number-gates/simulation/army'
import { contactDistance } from '../../src/games/number-gates/simulation/entities'
import { additiveAmount, enemyPower, randomMultiplier, scheduleCombat } from '../../src/games/number-gates/simulation/economy'
import { createRandom } from '../../src/games/number-gates/simulation/random'
import { bestRoute, canReach, laneX } from '../../src/games/number-gates/simulation/routes'
import { advance, createRun } from '../../src/games/number-gates/simulation/run'
import type { Run, RunEvent } from '../../src/games/number-gates/simulation/run'
import type { TrackEnemy, TrackGate } from '../../src/games/number-gates/simulation/entities'
import { appendGroup, createTrack } from '../../src/games/number-gates/simulation/track'

describe('army arithmetic', () => {
  it('carries every eight units and allows tiers above the initial eight', () => {
    expect(decompose(8n)).toEqual([{ tier: 1, count: 1 }])
    expect(mergedTier(7n, 8n)).toBe(1)
    expect(decompose(64n)).toEqual([{ tier: 2, count: 1 }])
    expect(mergedTier(63n, 64n)).toBe(2)
    expect(decompose(8n ** 12n)).toEqual([{ tier: 12, count: 1 }])
    expect(decompose(0n)).toEqual([])
    const power = 8n ** 140n + 4n * 8n ** 54n + 73n
    expect(combine(decompose(power))).toBe(power)
  })

  it('uses exact BigInt operations, clamps losses and truncates division', () => {
    const huge = 2n ** 128n
    expect(applyGate(huge, { operation: '+', amount: 13n })).toBe(huge + 13n)
    expect(applyGate(huge, { operation: '×', amount: 3n })).toBe(huge * 3n)
    expect(applyGate(64n, { operation: '−', amount: 20n })).toBe(44n)
    expect(decompose(44n)).toEqual([{ tier: 0, count: 4 }, { tier: 1, count: 5 }])
    expect(applyGate(4n, { operation: '−', amount: 8n })).toBe(0n)
    expect(applyGate(17n, { operation: '÷', amount: 3n })).toBe(5n)
    expect(applyGate(1n, { operation: '÷', amount: 2n })).toBe(0n)
  })

  it('trades equal power on both sides, including ties and very large armies', () => {
    expect(resolveCombat(173n, 120n)).toEqual({ player: 53n, enemy: 0n, loss: 120n })
    expect(resolveCombat(90n, 120n)).toEqual({ player: 0n, enemy: 30n, loss: 90n })
    expect(resolveCombat(120n, 120n)).toEqual({ player: 0n, enemy: 0n, loss: 120n })
    const huge = 8n ** 150n
    expect(resolveCombat(huge + 1n, huge)).toEqual({ player: 1n, enemy: 0n, loss: huge })
  })

  it('formats exact big integers through 载, then uses scientific notation', () => {
    expect([0n, 9999n, 12345n, 123456789n, 10_000_000_000n, 1_234_567_890_000n].map(formatPower))
      .toEqual(['0', '9999', '1.23万', '1.23亿', '100亿', '1.23兆'])
    expect(['万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载'].map((unit, index) =>
      formatPower(10n ** BigInt((index + 1) * 4)) === `1${unit}`)).not.toContain(false)
    expect(formatPower(9999n * 10n ** 44n)).toBe('9999载')
    expect(formatPower(123n * 10n ** 46n)).toBe('1.23e48')
    expect(formatPower(-(10n ** 320n))).toBe('-1e320')
  })
})

describe('track economy', () => {
  it('uses the specified symmetric multiplier and exact BigInt operand ranges', () => {
    expect([0, 0.5, 1].map((sample) => additiveAmount(10_000n, sample, false))).toEqual([38n, 300n, 2400n])
    expect([0, 0.5, 1].map((sample) => additiveAmount(10_000n, sample, true))).toEqual([875n, 3500n, 14000n])
    expect(additiveAmount(1n, 0, false)).toBe(1n)
    for (const range of [8, 4]) {
      for (const sample of [0, Number.MIN_VALUE, 0.1, 0.2, 0.5, 0.8, 1 - Number.EPSILON, 1]) {
        const value = randomMultiplier(sample, range)
        expect(value).toBeGreaterThanOrEqual(1 / range)
        expect(value).toBeLessThanOrEqual(range)
        expect(value * randomMultiplier(1 - sample, range)).toBeCloseTo(1, 10)
      }
      expect(randomMultiplier(0.2, range)).toBeCloseTo(range ** Math.tanh(0.7 * Math.log(0.25)), 12)
      const random = createRandom(range)
      const values = Array.from({ length: 32768 }, () => randomMultiplier(random(), range)).sort((a, b) => a - b)
      expect(values[16384]).toBeCloseTo(1, 1)
      expect(values.reduce((sum, value) => sum + value, 0) / values.length).toBeGreaterThan(1)
    }
    const huge = 10n ** 320n
    expect(additiveAmount(huge, 0.5, false)).toBe(huge * 3n / 100n)
    expect(additiveAmount(huge, 1, true)).toBe(huge * 14n / 10n)
  })

  it('uses a triangular combat ratio and keeps small-army fights winnable', () => {
    expect([[0, 0], [0.1, 0.1], [0, 1], [1, 1]].map(([a, b]) => enemyPower(10000n, a, b)))
      .toEqual([2000n, 2600n, 5000n, 8000n])
    expect(enemyPower(2n, 1, 1)).toBe(1n)
    expect(enemyPower(10n ** 320n, 0.5, 0.5)).toBe(5n * 10n ** 319n)
    const random = createRandom(53)
    const samples = Array.from({ length: 4096 }, () => Number(enemyPower(10_000n, random(), random())))
    expect(samples.filter((value) => value >= 3500 && value < 6500).length / samples.length).toBeCloseTo(0.75, 1)
    expect(samples.reduce((sum, value) => sum + value, 0) / samples.length / 10_000).toBeCloseTo(0.5, 2)
  })

  it('schedules the configured bands and every fifth battle as a boss', () => {
    for (const [passed, min, max] of [[0, 12, 16], [60, 12, 16], [61, 10, 13], [150, 10, 13], [151, 8, 11], [300, 8, 11], [301, 7, 9]]) {
      expect(scheduleCombat(passed, 4, () => 0)).toMatchObject({ nextCombatAt: passed + min, nextCombatType: 'boss' })
      expect(scheduleCombat(passed, 5, () => 0.999)).toMatchObject({ nextCombatAt: passed + max, nextCombatType: 'normal' })
    }
  })

  it('uses the best physically reachable power at each gate and locks both groups', () => {
    for (let seed = 0; seed < 44; seed++) {
      const track = createTrack(seed)
      const start = { power: 8n, distance: 0, x: 0 }
      appendGroup(track, start)
      const locked = structuredClone(track.entities)
      const result = appendGroup(track, start)
      expect(track.entities.slice(0, locked.length)).toEqual(locked)
      expect(createRun(seed).track.entities).toEqual(track.entities)
      expect(bestRoute(track.entities, start)?.power).toBe(result.best)
      for (const [index, entity] of track.entities.entries()) {
        const power = bestRoute(track.entities.slice(0, index), start)!.power
        if (entity.kind === 'enemy') {
          expect(entity.power).toBeGreaterThanOrEqual(enemyPower(power, 0, 0))
          expect(entity.power).toBeLessThanOrEqual(enemyPower(power, 1, 1))
        } else {
          expect(entity.referencePower).toBe(power)
          for (const gate of entity.gates) {
            if (gate.operation !== '+' && gate.operation !== '−') continue
            const rare = Boolean(gate.rareAdditive)
            expect(gate.amount).toBeGreaterThanOrEqual(additiveAmount(power, 0, rare))
            expect(gate.amount).toBeLessThanOrEqual(additiveAmount(power, 1, rare))
          }
        }
      }
    }
  })

  it('publishes the specified independent probabilities and all real multipliers', () => {
    const operations = { '+': 0, '−': 0, '×': 0, '÷': 0 }
    const pairSigns = [0, 0, 0]
    const factors = new Map<bigint, number>()
    let pairs = 0
    let rareAdds = 0
    let positiveLeft = 0
    let rejected = 0
    const army = 10n ** 90n
    for (let seed = 0; seed < 2200; seed++) {
      const run = createRun(seed, (group) => { rejected += group.rejectedPairs })
      for (const entity of run.track.entities) {
        if (entity.kind !== 'gate') continue
        pairs++
        const [left, right] = entity.gates
        const leftPositive = left.operation === '+' || left.operation === '×'
        const rightPositive = right.operation === '+' || right.operation === '×'
        positiveLeft += Number(leftPositive)
        pairSigns[Number(leftPositive) + Number(rightPositive)]++
        for (const gate of entity.gates) {
          operations[gate.operation]++
          rareAdds += Number(Boolean(gate.rareAdditive))
          if (gate.operation !== '×') continue
          factors.set(gate.amount, (factors.get(gate.amount) ?? 0) + 1)
          expect(applyGate(army, gate)).toBe(army * gate.amount)
        }
      }
    }
    for (const [count, expected] of Object.values(operations).map((count, index) =>
      [count, [0.45, 0.3, 0.05, 0.2][index]])) {
      expect(Math.abs(count / (2 * pairs) - expected)).toBeLessThan(0.012)
    }
    expect(positiveLeft / pairs).toBeCloseTo(0.5, 2)
    for (const [index, expected] of [0.25, 0.5, 0.25].entries()) {
      expect(Math.abs(pairSigns[index] / pairs - expected)).toBeLessThan(0.015)
    }
    expect(Math.abs(rareAdds / operations['+'] - 0.03)).toBeLessThan(0.004)
    for (const [factor, weight] of [[2n, 0.8], [3n, 0.12], [4n, 0.05]] as const) {
      expect(Math.abs(factors.get(factor)! / operations['×'] - weight)).toBeLessThan(0.025)
    }
    expect([...factors.keys()].sort((a, b) => Number(a - b))).toEqual([2n, 3n, 4n, 5n, 6n, 8n, 10n, 20n])
    expect(rejected).toBeGreaterThan(0)
  })

  it('keeps the predicted distribution of differences between independently drawn operands', () => {
    const differ = (left: bigint, right: bigint) => 2n * left >= 3n * right || 2n * right >= 3n * left
    const amounts = Array.from({ length: 96 }, (_, i) => additiveAmount(10_000n, (i + 0.5) / 96, false))
    const expected = amounts.flatMap((left) => amounts.map((right) => differ(left, right)))
      .filter(Boolean).length / amounts.length ** 2
    let pairs = 0
    let wide = 0
    for (let seed = 0; seed < 800; seed++) {
      const track = createTrack(seed)
      appendGroup(track, { x: 0, distance: 0, power: 10_000n })
      for (const entity of track.entities) {
        if (entity.kind !== 'gate' || entity.referencePower < 1000n) continue
        const [left, right] = entity.gates
        if ((left.operation !== '+' && left.operation !== '−') || left.operation !== right.operation) continue
        if (left.rareAdditive || right.rareAdditive) continue
        pairs++
        wide += Number(differ(left.amount, right.amount))
      }
    }
    expect(pairs).toBeGreaterThan(1000)
    expect(Math.abs(wide / pairs - expected)).toBeLessThan(0.035)
  })

  it('includes enemies in path search and rejects a physically impossible lane switch', () => {
    const lose = { operation: '−', amount: 9n } as const
    const gain = { operation: '+', amount: 1n } as const
    const gate = (id: number, distance: number, gates: readonly [typeof gain | typeof lose, typeof gain | typeof lose]): TrackGate =>
      ({ kind: 'gate', id, distance, gates, referencePower: 5n })
    const start = { power: 5n, x: 0, distance: 0 }
    expect(bestRoute([gate(2, 28, [gain, lose]), gate(4, 28.1, [lose, gain])], start)).toBeUndefined()
    const enemy: TrackEnemy = { kind: 'enemy', id: 3, distance: 44, afterGate: 1, ordinal: 1, power: 6n, battleType: 'normal' }
    expect(bestRoute([gate(2, 28, [gain, lose]), enemy, gate(4, 64, [gain, gain])], start)).toBeUndefined()
    expect(canReach(-RUN.laneX, RUN.laneX, RUN.minGap)).toBe(true)
  })
})

function bestTarget(run: Run) {
  const pair = run.track.entities[0]
  return pair.kind === 'gate' ? laneX(applyGate(run.power, pair.gates[0]) >= applyGate(run.power, pair.gates[1]) ? 0 : 1) : run.x
}

describe('runner simulation', () => {
  it('uses the center at the gate plane and consumes each event once', () => {
    const run = createRun(12)
    const pair = run.track.entities[0] as TrackGate
    run.x = -RUN.laneX
    run.distance = pair.distance - 0.08
    const events: RunEvent[] = []
    advance(run, 0.12, RUN.laneX, (event) => events.push(event))
    advance(run, 0.12, RUN.laneX, (event) => events.push(event))
    expect(events.filter((event) => event.kind === 'gate')).toEqual([expect.objectContaining({ side: 0 })])
    expect(run.power).toBe(applyGate(8n, pair.gates[0]))
    expect(run.passed).toBe(1)
  })

  it('keeps the original gates beyond an enemy during and after combat', () => {
    const run = createRun(991)
    const encounters = () => run.track.entities.filter((entity) => entity.kind === 'enemy')
    const [enemy, nextEnemy] = encounters()
    expect(encounters().map(({ ordinal }) => ordinal)).toEqual([1, 2])
    const future = run.track.entities.filter((entity) => entity.distance > enemy.distance)
    expect(future.length).toBeGreaterThanOrEqual(4)
    const recorded = structuredClone(future)
    while (run.distance < enemy.distance - RUN.renderAhead + 2 && !run.failed) {
      advance(run, 0.1, bestTarget(run), () => {})
    }
    expect(encounters()).toEqual([enemy, nextEnemy])
    const contact = contactDistance(enemy)
    while (run.distance < contact && !run.failed) advance(run, 0.1, bestTarget(run), () => {})
    expect(run.battle?.entity).toBe(enemy)
    expect(run.distance).toBe(contactDistance(enemy))
    expect(run.track.entities).toEqual(recorded)
    expect(encounters()).toEqual([nextEnemy])
    const position = run.distance
    const before = run.power
    advance(run, COMBAT.timing.normal.duration, 0, () => {})
    expect(run.power).toBe(before - enemy.power)
    expect(run.distance).toBe(position)
    expect(run.track.entities.slice(0, future.length)).toEqual(recorded)
    expect(run.track.entities[0]).toBe(future[0])
    expect(encounters()[0]).toBe(nextEnemy)
    expect(encounters().map(({ ordinal }) => ordinal)).toEqual([2, 3])
    const passed = run.passed
    while (run.passed === passed && !run.failed) advance(run, 0.1, bestTarget(run), () => {})
    expect(run.distance).toBeGreaterThanOrEqual(future[0].distance)
    expect(run.track.entities.includes(future[0])).toBe(false)
  })

  it('continues through forty combats with bounded buffers and increasing distance', () => {
    const run = createRun(934)
    const types: string[] = []
    let steps = 0
    while (run.completed < 40 && !run.failed && steps++ < 20000) {
      const previous = run.distance
      advance(run, 0.1, bestTarget(run), (event) => { if (event.kind === 'battle') types.push(event.type) })
      if (run.distance < previous || run.track.entities.length > 34) throw new Error('Unbounded or reset track')
    }
    expect(run.failed).toBe(false)
    expect(run.completed).toBe(40)
    expect(types.filter((type) => type === 'boss')).toHaveLength(8)
    expect(types[4]).toBe('boss')
    expect(run.distance).toBeGreaterThan(5000)
    expect(run.travel).toBeLessThan(120)
    expect(run.power).toBeGreaterThan(0n)
  })

  it('animates equal losses and treats a tie as failure', () => {
    const run = createRun(1)
    const enemy: TrackEnemy = { kind: 'enemy', id: 1, distance: RUN.contactRange, afterGate: 0, ordinal: 1, power: 8n, battleType: 'normal' }
    run.track.entities.unshift(enemy)
    advance(run, 0.1, 0, () => {})
    expect(run.power).toBe(8n)
    expect(run.enemy).toBe(8n)
    const timing = COMBAT.timing.normal
    advance(run, (timing.approach + timing.contact) / 2, 0, () => {})
    expect(run.power).toBeGreaterThan(0n)
    expect(run.power).toBeLessThan(8n)
    expect(run.enemy).toBe(run.power)
    advance(run, timing.duration, 0, () => {})
    expect(run.power).toBe(0n)
    expect(run.enemy).toBe(0n)
    expect(run.failed).toBe(true)
  })
})
