import { RUN } from '../config'
import type { Gate } from './army'
import type { CombatType } from './economy'

export interface TrackGate {
  readonly kind: 'gate'
  readonly id: number
  readonly distance: number
  readonly referencePower: bigint
  readonly gates: readonly [Gate, Gate]
}

export interface TrackEnemy {
  readonly kind: 'enemy'
  readonly id: number
  readonly distance: number
  readonly afterGate: number
  readonly power: bigint
  readonly battleType: CombatType
  readonly ordinal: number
}

export type TrackEntity = TrackGate | TrackEnemy

export const contactDistance = (entity: TrackEntity) => entity.kind === 'enemy' ? entity.distance - RUN.contactRange : entity.distance
