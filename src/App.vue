<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { getGame } from './core/game/registry'
import SiteLayout from './SiteLayout.vue'
import { siteTitle } from './app/site'

const route = useRoute()
const game = computed(() =>
  route.name === 'game' && typeof route.params.id === 'string' ? getGame(route.params.id) : undefined,
)

watchEffect(() => {
  document.title = siteTitle(game.value?.name ?? (route.name === 'home' ? undefined : '游戏不存在'))
})
</script>

<template>
  <SiteLayout :home="route.name === 'home'" :game="game" :page-key="route.path">
    <RouterView />
  </SiteLayout>
</template>
