import type { GameDefinition } from '../../core/game/types'
import cover from './assets/cover.svg?no-inline'

export const title = '数字门'
export const edition = '（测试版）'

export default {
  id: 'number-gates',
  name: title + edition,
  category: '跑酷',
  cover,
  load: () => import('./Game.vue'),
} satisfies GameDefinition
