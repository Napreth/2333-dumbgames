<script setup lang="ts">
const paths = {
  search: 'm21 21-4.3-4.3M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  down: 'm6 9 6 6 6-6',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  restart: 'M4 4v6h6M4.5 10a8 8 0 1 1 .8 7.2',
  pause: 'M9 5v14m6-14v14',
  play: 'm9 5 10 7-10 7z',
  trophy: 'M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0zm0 2H4v2a4 4 0 0 0 3 4m10-6h3v2a4 4 0 0 1-3 4',
  close: 'm6 6 12 12M18 6 6 18',
}

defineProps<{ name: keyof typeof paths; size?: number }>()
</script>

<template>
  <svg aria-hidden="true" :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path :d="paths[name]" />
  </svg>
</template>
