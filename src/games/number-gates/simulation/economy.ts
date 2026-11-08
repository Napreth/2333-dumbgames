import { COMBAT, ECONOMY } from '../config'
import { integer } from './random'
import type { Gate } from './army'

export type CombatType = 'normal' | 'boss'

export interface CombatSchedule {
  passedGateGroups: number
  completedBattles: number
  nextCombatAt: number
  nextCombatType: CombatType
}

const precision = 1_000_000_000_000

function scaledPower(power: bigint, ratio: number, round: boolean) {
  const denominator = BigInt(precision)
  const rounding = round ? denominator / 2n : 0n
  const amount = (power * BigInt(Math.round(ratio * precision)) + rounding) / denominator
  return amount > 0n ? amount : 1n
}

export function randomMultiplier(sample: number, range: number) {
  if (sample <= 0) return 1 / range
  if (sample >= 1) return range
  const logOdds = Math.log(sample) - Math.log1p(-sample)
  return range ** Math.tanh(ECONOMY.randomShape * logOdds)
}

export function additiveAmount(reference: bigint, sample: number, rare: boolean) {
  const rate = rare ? ECONOMY.rareAdditiveRate : ECONOMY.normalAdditiveRate
  const range = rare ? ECONOMY.rareRandomRange : ECONOMY.normalRandomRange
  return scaledPower(reference, rate * randomMultiplier(sample, range), true)
}

function factor(weights: readonly (readonly [number, number])[], sample: number) {
  let remaining = sample * 100
  for (const [value, weight] of weights) {
    if (remaining < weight) return BigInt(value)
    remaining -= weight
  }
  return BigInt(weights.at(-1)![0])
}

export function generateGate(reference: bigint, random: () => number): Gate {
  if (random() < ECONOMY.additiveFamilyProbability) {
    const positive = random() < ECONOMY.positiveAdditiveProbability
    const rare = positive && random() < ECONOMY.rareAdditiveProbability
    const amount = additiveAmount(reference, random(), rare)
    if (rare) return { operation: '+', amount, rareAdditive: true }
    return { operation: positive ? '+' : '−', amount }
  }
  const multiply = random() < ECONOMY.positiveMultiplicativeProbability
  const weights = multiply ? ECONOMY.multiplyWeights : ECONOMY.divideWeights
  return { operation: multiply ? '×' : '÷', amount: factor(weights, random()) }
}

export function enemyPower(reference: bigint, first: number, second: number) {
  const { enemyMinRatio, enemyMaxRatio } = ECONOMY
  const ratio = enemyMinRatio + (enemyMaxRatio - enemyMinRatio) / 2 * (first + second)
  // Round down so quantization cannot turn a winnable fight into a tie.
  return scaledPower(reference, ratio, false)
}

export function scheduleCombat(passed: number, completed: number, random: () => number): CombatSchedule {
  const band = COMBAT.bands.find(({ through }) => passed <= through)!
  return {
    passedGateGroups: passed,
    completedBattles: completed,
    nextCombatAt: passed + integer(random, band.min, band.max),
    nextCombatType: (completed + 1) % COMBAT.bossEvery === 0 ? 'boss' : 'normal',
  }
}
