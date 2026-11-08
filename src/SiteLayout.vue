<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GameDefinition } from './core/game/types'
import SiteBrand from './app/components/SiteBrand.vue'

const props = defineProps<{ home: boolean; game?: GameDefinition; pageKey?: string }>()
const main = ref<HTMLElement>()

watch(() => props.pageKey, () => {
  main.value?.focus({ preventScroll: true })
}, { flush: 'post' })
</script>

<template>
  <header v-if="!home" class="masthead">
    <div class="wrap masthead-inner">
      <div class="masthead-brand">
        <SiteBrand />
        <h1 v-if="game" id="game-title" class="game-title"><span aria-hidden="true">：</span>{{ game.name }}</h1>
      </div>
    </div>
  </header>
  <main ref="main" :class="{ wrap: home }" tabindex="-1">
    <slot />
  </main>
</template>
<style scoped>
.masthead {
  background: var(--portal-surface);
  border-bottom: 2px solid var(--portal-nav);
  padding-top: env(safe-area-inset-top);
}

.masthead-inner {
  display: flex;
  align-items: center;
  min-height: 3.75rem;
}

.masthead-brand {
  display: flex;
  align-items: center;
  min-width: 0;
}

.game-title {
  min-width: 0;
  margin: 0;
  font-size: clamp(1rem, 3vw, 1.25rem);
  line-height: 1.25;
  overflow-wrap: anywhere;
  translate: 0 .1875rem;
}

main { outline: none; }
main.wrap { padding-block-end: max(var(--space-6), env(safe-area-inset-bottom)); }

@media (max-width: 36rem) {
  .masthead-inner { min-height: 3.5rem; }
}

@media (orientation: landscape) and (max-height: 29rem) {
  .masthead-inner { min-height: 3rem; }
}
</style>
