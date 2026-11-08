<script setup lang="ts">
import { computed, ref } from 'vue'
import { games } from '../../core/game/registry'
import GameCard from '../components/GameCard.vue'
import Icon from '../components/Icon.vue'
import SiteBrand from '../components/SiteBrand.vue'

const categories = [...new Set(games.map((game) => game.category))]
const category = ref<string>()
const query = ref('')
const search = ref<HTMLInputElement>()

const matching = computed(() => {
  const term = query.value.trim().toLowerCase()
  return games.filter((game) =>
    (!category.value || game.category === category.value)
    && game.name.toLowerCase().includes(term),
  )
})

function clearSearch() {
  query.value = ''
  search.value?.focus()
}
</script>

<template>
  <div class="lobby">
    <div class="lobby-header">
      <SiteBrand />
      <div class="search" role="search">
        <Icon name="search" :size="17" />
        <input ref="search" v-model="query" type="search" aria-label="搜索游戏" placeholder="搜索游戏" />
        <button v-if="query" type="button" aria-label="清空搜索" @click="clearSearch">
          <Icon name="close" :size="17" />
        </button>
      </div>
    </div>
    <nav v-if="categories.length" class="categories" aria-label="游戏分类">
      <button type="button" :aria-pressed="category === undefined" @click="category = undefined">全部</button>
      <button v-for="item in categories" :key="item" type="button" :aria-pressed="category === item"
        @click="category = item">{{ item }}</button>
    </nav>
    <section class="catalog" aria-labelledby="lobby-title">
      <h1 id="lobby-title"><Icon name="grid" :size="16" /> {{ category ?? '游戏列表' }}</h1>
      <ul v-if="matching.length" class="game-grid" aria-label="游戏列表">
        <li v-for="game in matching" :key="game.id"><GameCard :game="game" /></li>
      </ul>
      <p v-else class="empty" role="status">没有找到游戏</p>
    </section>
  </div>
</template>

<style scoped>
.lobby {
  max-width: 61rem;
  margin-inline: auto;
  padding-block-start: env(safe-area-inset-top);
}

.lobby-header {
  display: flex;
  align-items: center;
  gap: clamp(1.25rem, 5vw, 4rem);
  padding-inline: var(--space-2);
  min-height: 4.5rem;
}

.search {
  display: flex;
  align-items: center;
  flex: 0 1 19rem;
  min-width: 0;
  min-height: 2.75rem;
  padding-inline: var(--space-2) var(--space-1);
  gap: var(--space-1);
  border: 1px solid var(--portal-line);
  border-radius: .25rem;
  background: var(--portal-surface);
  color: var(--muted);
}

.search:focus-within { border-color: var(--focus); }
.search > svg { flex: none; color: var(--portal-title); }

.search input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: var(--space-2) var(--space-1);
  font-size: var(--size-sm);
}

.search input::placeholder { color: var(--muted); }
.search input::-webkit-search-cancel-button { display: none; }

.search button {
  display: grid;
  place-items: center;
  flex: none;
  width: 2rem;
  height: 2rem;
  border: 0;
  background: transparent;
  color: var(--muted);
}

.search button:hover { color: var(--ink); }

.categories {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--portal-nav);
  border-bottom: 2px solid var(--portal-title);
}

.categories button {
  min-height: 2.125rem;
  padding-inline: var(--space-4);
  border: 0;
  border-radius: .1875rem;
  background: transparent;
  color: var(--portal-ink);
  font-size: var(--size-sm);
  font-weight: 750;
}

.categories button:hover { background: var(--portal-strip); }
.categories button[aria-pressed="true"] { background: var(--portal-surface); }
.categories button:focus-visible { outline-offset: 0; outline-color: var(--portal-ink); }

.catalog {
  margin-block-start: var(--space-2);
  border: 1px solid var(--portal-line);
  background: var(--portal-surface);
}

h1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-1) var(--space-3);
  min-height: 2.125rem;
  border-bottom: 1px solid var(--portal-line);
  color: var(--portal-title);
  background: var(--portal-strip);
  font-size: var(--size-md);
  font-weight: 750;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: var(--space-2) var(--space-1);
  margin: 0;
  padding: var(--space-3) var(--space-2);
  list-style: none;
}

.empty {
  margin: 0;
  padding: var(--space-3);
  color: var(--muted);
  font-size: var(--size-sm);
}

@media (max-width: 56rem) { .game-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@media (max-width: 39rem) {
  .lobby-header {
    gap: var(--space-3);
    padding-inline: 0;
    min-height: 3.75rem;
  }
  .search { flex: 1; }
  .categories button { min-height: 2.75rem; }
  .game-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 22.5rem) {
  .lobby-header { flex-wrap: wrap; gap: 0; padding-block: var(--space-1) var(--space-2); }
  .search { flex-basis: 100%; }
  .game-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
