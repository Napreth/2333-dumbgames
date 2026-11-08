<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Component } from 'vue'
import type { GameDefinition } from '../../core/game/types'

const props = defineProps<{ game: GameDefinition }>()
const component = shallowRef<Component>()
const loadFailed = ref(false)
let unmounted = false

function reloadGame() {
  window.location.reload()
}

onMounted(async () => {
  try {
    const module = await props.game.load()
    if (!unmounted) component.value = module.default
  } catch {
    if (!unmounted) loadFailed.value = true
  }
})
onBeforeUnmount(() => { unmounted = true })
</script>

<template>
  <component :is="component" v-if="component" />
  <div v-else class="wrap feedback">
    <template v-if="loadFailed">
      <p role="alert">游戏加载失败</p>
      <button type="button" class="control control--primary" @click="reloadGame">重试</button>
    </template>
    <p v-else role="status">加载中…</p>
  </div>
</template>

<style scoped>
.feedback { padding-block: var(--space-4); }
.feedback p { margin: 0 0 var(--space-2); }
</style>
