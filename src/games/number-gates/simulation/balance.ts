import { COMBAT, RUN } from '../config'
import type { Gate } from './army'
import { contactDistance } from './entities'
import { createRandom } from './random'
import { chooseSide, laneX, sideAt } from './routes'
import type { Policy } from './routes'
import { advance, createRun, meetNext, moveTo, steerX } from './run'
import type { OnGroup } from './track'

export const policies = ['optimal', 'strong', 'ordinary', 'random'] as const

function distribution(values: bigint[]) {
  values.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  if (!values.length) return null
  const at = (fraction: number) => values[Math.floor((values.length - 1) * fraction)].toString()
  return { min: at(0), p10: at(0.1), p50: at(0.5), p90: at(0.9), max: at(1) }
}

function isPositive(gate: Gate) {
  return gate.operation === '+' || gate.operation === '×'
}

function tally() {
  return { count: 0, amount: 0n, relativeBasisPoints: 0n }
}

function recordChange(stats: ReturnType<typeof tally>, change: bigint, before: bigint) {
  stats.count++
  stats.amount += change
  stats.relativeBasisPoints += change * 10_000n / before
}

function summarizeChange(stats: ReturnType<typeof tally>) {
  const count = BigInt(stats.count)
  return {
    count: stats.count, total: stats.amount.toString(),
    average: count ? (stats.amount / count).toString() : null,
    averageBasisPoints: count ? (stats.relativeBasisPoints / count).toString() : null,
  }
}

export function simulateBalance(seeds: number, goal: number, policy: Policy, seedStart = 0) {
  const marks = [...new Set([10, 20, 50, 100, 200, 300, 500, 1000, goal].filter((gate) => gate <= goal))]
  const points = new Map(marks.map((mark) => [mark, [] as bigint[]]))
  const operands = new Map([0, 20, 100, 200, 500, 1000].map((gate) =>
    [gate, { normal: [] as bigint[], rare: [] as bigint[] }]))
  const multiplicationBands = [100, 200, 500, 1000, Infinity].flatMap((through, index, marks) => {
    const from = (marks[index - 1] ?? 0) + 1
    return from <= goal ? [{ from, through: Math.min(through, goal), passed: 0, available: 0, taken: 0 }] : []
  })
  const combat = {
    normal: { count: 0, loss: 0n, ratio: 0, survival: 0, entry: [] as bigint[] },
    boss: { count: 0, loss: 0n, ratio: 0, survival: 0, entry: [] as bigint[] },
  }
  const factors: Record<string, number> = {}
  const operations = { '+': 0, '−': 0, '×': 0, '÷': 0 }
  const differences = { '+': { pairs: 0, wide: 0 }, '−': { pairs: 0, wide: 0 } }
  const pairSigns = { positive: 0, mixed: 0, negative: 0 }
  const additiveGains = { normal: tally(), rare: tally() }
  const dualLoss = tally()
  const deaths = { gate: 0, normal: 0, boss: 0 }
  const bands = COMBAT.bands.map(({ min, max }) => ({ min, max, encounters: 0, sum: 0 }))
  const survivalLengths: bigint[] = []
  let publishedDoors = 0
  let multiplicative = 0
  let rareAdditions = 0
  let groups = 0
  let rejectedPairs = 0
  let repairedPairs = 0
  let doomedPrefixes = 0
  let publishedPairs = 0
  let publishedMultipliers = 0
  let reachedMultipliers = 0
  let takenMultipliers = 0
  let takenPositive = 0
  let laneMismatches = 0
  let gates = 0
  let firstCombatCount = 0
  let firstCombatSum = 0
  let violations = 0
  let highestTier = 0
  let maxBuffered = 0

  const recordGroup: OnGroup = (group, entities) => {
    groups++
    rejectedPairs += group.rejectedPairs
    repairedPairs += group.repairedPairs
    doomedPrefixes += Number(group.doomedPrefix)
    if (group.best <= 0n) violations++
    for (const entity of entities) {
      if (entity.kind !== 'gate') {
        if (entity.power <= 0n) violations++
        continue
      }
      publishedPairs++
      if (entity.gates.some(({ operation }) => operation === '×')) publishedMultipliers++
      const [left, right] = entity.gates
      const positiveCount = Number(isPositive(left)) + Number(isPositive(right))
      pairSigns[positiveCount === 2 ? 'positive' : positiveCount === 1 ? 'mixed' : 'negative']++
      if ((left.operation === '+' || left.operation === '−') && left.operation === right.operation) {
        const stats = differences[left.operation]
        stats.pairs++
        if (2n * left.amount >= 3n * right.amount || 2n * right.amount >= 3n * left.amount) stats.wide++
      }
      const at = entity.id / 2 - 1
      const sample = operands.get(at)
      for (const gate of entity.gates) {
        publishedDoors++
        operations[gate.operation]++
        rareAdditions += Number(Boolean(gate.rareAdditive))
        if (gate.operation === '×' || gate.operation === '÷') {
          multiplicative++
          const key = gate.operation + gate.amount
          factors[key] = (factors[key] ?? 0) + 1
        } else if (sample) {
          sample[gate.rareAdditive ? 'rare' : 'normal'].push(gate.amount * 1_000_000n / entity.referencePower)
        }
      }
    }
  }

  for (let seed = seedStart; seed < seedStart + seeds; seed++) {
    const random = createRandom(seed ^ 0x6ac7c08b)
    const run = createRun(seed, recordGroup)
    const emit = () => {}
    let previousCombat = 0

    while (!run.failed) {
      maxBuffered = Math.max(maxBuffered, run.track.entities.length)
      const entity = run.track.entities[0]
      if (run.passed >= goal && entity.kind === 'gate') break
      const distance = contactDistance(entity)
      const side = entity.kind === 'gate' ? chooseSide(entity, run, policy, random) : sideAt(run.x)
      if (side === undefined) {
        violations++
        break
      }
      const target = entity.kind === 'gate' ? laneX(side) : run.x
      run.x = steerX(run.x, target, (distance - run.distance) / RUN.forwardSpeed)
      moveTo(run, distance)
      const before = run.power
      const chosen = sideAt(run.x)
      meetNext(run, chosen, emit)
      if (entity.kind === 'enemy') {
        if (!previousCombat) {
          firstCombatCount++
          firstCombatSum += run.passed
        }
        const band = bands[COMBAT.bands.findIndex(({ through }) => previousCombat <= through)]
        band.sum += run.passed - previousCombat
        band.encounters++
        previousCombat = run.passed
        const stats = combat[entity.battleType]
        advance(run, COMBAT.timing[entity.battleType].duration, run.x, emit, recordGroup)
        const loss = before - run.power
        stats.count++
        stats.entry.push(before)
        stats.loss += loss
        stats.ratio += Number(loss * 10000n / before)
        stats.survival += Number(!run.failed)
        if (run.failed) deaths[entity.battleType]++
      } else {
        gates++
        if (chosen !== side) laneMismatches++
        if (run.failed) deaths.gate++
        const picked = entity.gates[chosen]
        takenPositive += Number(isPositive(picked))
        if (picked.operation === '+') recordChange(additiveGains[picked.rareAdditive ? 'rare' : 'normal'], run.power - before, before)
        if (!entity.gates.some(isPositive)) recordChange(dualLoss, before - run.power, before)
        const available = entity.gates.some(({ operation }) => operation === '×')
        const taken = picked.operation === '×'
        reachedMultipliers += Number(available)
        takenMultipliers += Number(taken)
        const band = multiplicationBands.find(({ through }) => run.passed <= through)!
        band.passed++
        band.available += Number(available)
        band.taken += Number(taken)
      }
      if (run.power > 0n) highestTier = Math.max(highestTier, run.power.toString(8).length - 1)
      if (!run.failed && (entity.kind === 'enemy' || run.track.entities[0]?.kind !== 'enemy')) {
        points.get(run.passed)?.push(run.power)
      }
    }
    survivalLengths.push(BigInt(run.passed))
  }

  return {
    policy, seeds, gateLimit: goal, gates, groups, rejectedPairs, repairedPairs, doomedPrefixes, violations, laneMismatches, highestTier, maxBuffered,
    publishedDoors, multiplicative, multiplicativePercent: 100 * multiplicative / publishedDoors,
    operations, operationPercent: Object.fromEntries(Object.entries(operations).map(([op, count]) => [op, 100 * count / publishedDoors])),
    pairSigns, pairSignPercent: Object.fromEntries(Object.entries(pairSigns).map(([sign, count]) => [sign, 100 * count / publishedPairs])),
    factors, rareAdditions, rareAdditionPercent: operations['+'] ? 100 * rareAdditions / operations['+'] : null,
    additiveOperands: [...operands].map(([at, { normal, rare }]) => ({
      at, normalSamples: normal.length, rareSamples: rare.length,
      normalRatioInMillionths: distribution(normal), rareRatioInMillionths: distribution(rare),
    })),
    additiveGains: { normal: summarizeChange(additiveGains.normal), rare: summarizeChange(additiveGains.rare) },
    dualLoss: summarizeChange(dualLoss),
    takenPositivePercent: gates ? 100 * takenPositive / gates : null,
    deaths,
    sideDifferences: Object.fromEntries(Object.entries(differences).map(([sign, { pairs, wide }]) =>
      [sign, { pairs, ratioAtLeast1_5: wide, percent: pairs ? 100 * wide / pairs : null }])),
    multiplication: {
      publishedPairs, publishedMultipliers, publishedPercent: 100 * publishedMultipliers / publishedPairs,
      reachedMultipliers, takenMultipliers, takenPercent: gates ? 100 * takenMultipliers / gates : null,
      byProgress: multiplicationBands.map((band) => ({
        ...band, availablePercent: band.passed ? 100 * band.available / band.passed : null,
        takenPercent: band.passed ? 100 * band.taken / band.passed : null,
      })),
    },
    finalGateCount: distribution(survivalLengths),
    firstCombat: { count: firstCombatCount, average: firstCombatCount ? firstCombatSum / firstCombatCount : null },
    bands: bands.map(({ min, max, encounters, sum }) => ({ min, max, encounters, average: encounters ? sum / encounters : null })),
    battles: Object.fromEntries(Object.entries(combat).map(([type, { count, loss, ratio, survival, entry }]) => [
      type, { count, totalLoss: loss.toString(), averageLoss: count ? (loss / BigInt(count)).toString() : null,
        averageLossPercent: count ? ratio / count / 100 : null, survivalPercent: count ? 100 * survival / count : null,
        entryPower: distribution(entry) },
    ])),
    snapshots: [...points].map(([mark, values]) => ({
      mark, survivors: values.length, survivalPercent: 100 * values.length / seeds, deathPercent: 100 * (seeds - values.length) / seeds,
      power: distribution(values), orderOfMagnitude: distribution(values.map((power) => BigInt(power.toString().length - 1))),
    })),
  }
}
