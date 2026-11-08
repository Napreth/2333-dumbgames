import type { Component } from 'vue'

export interface GameDefinition {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly cover: string
  readonly load: () => Promise<{ default: Component }>
}
