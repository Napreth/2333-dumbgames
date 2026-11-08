<script setup lang="ts">
import { computed } from 'vue'
import { siteHref } from '../site'
import { getGame } from '../../core/game/registry'
import GamePlayer from '../components/GamePlayer.vue'

const props = defineProps<{ id: string }>()
const game = computed(() => getGame(props.id))
</script>

<template>
  <GamePlayer v-if="game" :key="game.id" :game="game" />
  <div v-else class="wrap missing">
    <h1>游戏不存在</h1>
    <a class="control" :href="siteHref()">返回大厅</a>
  </div>
</template>

<style scoped>
.missing { padding-block: var(--space-5); }
h1 { margin: 0 0 var(--space-4); font-size: var(--size-lg); }
</style>
