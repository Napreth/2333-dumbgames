<script setup lang="ts">
import { siteHref } from '../site'
import type { GameDefinition } from '../../core/game/types'

defineProps<{ game: GameDefinition }>()
</script>

<template>
  <a class="card" :href="siteHref(game.id)">
    <img :src="game.cover" alt="" width="96" height="96" decoding="async" loading="lazy" />
    <span class="name">{{ game.name }}</span>
  </a>
</template>

<style scoped>
.card {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: var(--space-1);
  padding: var(--space-1);
  text-decoration: none;
  text-align: center;
  border-radius: var(--radius-sm);
}

img {
  display: block;
  width: min(100%, 6rem);
  height: auto;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--portal-strip);
}

.name {
  font-size: var(--size-sm);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.card:hover,
.card:focus-visible {
  background: var(--portal-strip);
  color: var(--portal-title);
  text-decoration: underline;
}
</style>
