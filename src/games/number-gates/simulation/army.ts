import { RUN } from '../config'

export interface UnitGroup {
  tier: number
  count: number
}

export function decompose(power: bigint): UnitGroup[] {
  const groups: UnitGroup[] = []
  for (let tier = 0; power > 0n; tier++, power /= RUN.mergeBase) {
    const count = Number(power % RUN.mergeBase)
    if (count) groups.push({ tier, count })
  }
  return groups
}

export function combine(groups: readonly UnitGroup[]): bigint {
  return groups.reduce((power, group) => power + BigInt(group.count) * RUN.mergeBase ** BigInt(group.tier), 0n)
}

export function mergedTier(before: bigint, after: bigint): number | undefined {
  // Crossing an octal carry can happen at several tiers in one operation.
  let merged: number | undefined
  for (let tier = 1; after >= RUN.mergeBase && after > before; tier++) {
    before /= RUN.mergeBase
    after /= RUN.mergeBase
    if (after > before) merged = tier
  }
  return merged
}

export type Operation = '+' | '−' | '×' | '÷'
export interface Gate {
  readonly operation: Operation
  readonly amount: bigint
  readonly rareAdditive?: true
}

export function applyGate(power: bigint, gate: Gate): bigint {
  switch (gate.operation) {
    case '+': return power + gate.amount
    case '−': return power > gate.amount ? power - gate.amount : 0n
    case '×': return power * gate.amount
    case '÷': return power / gate.amount
  }
}

export function resolveCombat(player: bigint, enemy: bigint) {
  const loss = player < enemy ? player : enemy
  return { player: player - loss, enemy: enemy - loss, loss }
}

const powerUnits = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载']

export function formatPower(power: bigint): string {
  const raw = power.toString()
  const negative = power < 0n
  const digits = negative ? raw.slice(1) : raw
  const unit = Math.floor((digits.length - 1) / 4)
  if (unit === 0) return raw
  const scientific = unit >= powerUnits.length
  const split = scientific ? 1 : digits.length - unit * 4
  const fraction = digits.slice(split, 3).replace(/0+$/, '')
  const suffix = scientific ? `e${digits.length - 1}` : powerUnits[unit]
  return (negative ? '-' : '') + digits.slice(0, split) + (fraction ? '.' + fraction : '') + suffix
}
