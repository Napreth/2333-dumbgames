<script setup lang="ts">
import { siteHref } from '../site'
import brand from '../../assets/brand.svg'
</script>

<template>
  <a class="brand" :href="siteHref()" aria-label="2333沙雕小游戏大厅">
    <img :src="brand" alt="" width="38" height="38" />
    <span class="number" aria-hidden="true">2<span class="threes">333</span></span>
    <span class="label" aria-hidden="true">沙雕小游戏</span>
  </a>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.75rem;
  width: max-content;
  max-width: 100%;
  color: var(--portal-ink);
  text-decoration: none;
  white-space: nowrap;
}

.number {
  font: italic 900 2.125rem/1 var(--font-number);
  letter-spacing: -.045em;
}

.threes { font-size: 1.14em; }

.label {
  padding-inline-start: var(--space-1);
  color: var(--portal-title);
  font-size: var(--size-md);
  font-weight: 800;
  line-height: 1.25;
  translate: 0 .1875rem;
}

@media (max-width: 35rem), (orientation: landscape) and (max-height: 29rem) {
  .brand img { width: 32px; height: 32px; }
  .number { font-size: 1.8rem; }
  .label { font-size: var(--size-sm); }
}
</style>
