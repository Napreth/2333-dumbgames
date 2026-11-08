<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { LeaderboardRateLimitError } from '../../core/platform/types'
import type { Leaderboard, LeaderboardEntry } from '../../core/platform/types'

const props = defineProps<{ board: Leaderboard; label?: string }>()
const entries = shallowRef<readonly LeaderboardEntry[]>()
const failure = ref<'failed' | 'rate-limited'>()

async function load() {
  failure.value = undefined
  try {
    entries.value = await props.board.list()
  } catch (error) {
    failure.value = error instanceof LeaderboardRateLimitError ? 'rate-limited' : 'failed'
  }
}

onMounted(load)
</script>

<template>
  <section id="game-leaderboard" class="leaderboard" aria-labelledby="leaderboard-title">
    <h2 id="leaderboard-title">成绩榜<span v-if="label"> · {{ label }}</span></h2>
    <template v-if="entries">
      <ol v-if="entries.length">
        <li v-for="entry in entries" :key="entry.rank">
          <span>{{ entry.rank }}</span><span>{{ entry.nickname }}</span><strong>{{ entry.score }}</strong>
        </li>
      </ol>
      <p v-else>暂无成绩</p>
    </template>
    <div v-else-if="failure">
      <p role="alert">{{ failure === 'rate-limited' ? '成绩榜暂时繁忙' : '成绩榜加载失败' }}</p>
      <button v-if="failure === 'failed'" class="control" type="button" @click="load">重试</button>
    </div>
    <p v-else role="status">加载成绩榜…</p>
  </section>
</template>

<style scoped>
.leaderboard {
  margin-block-start: var(--space-4);
  padding: var(--space-4);
  border: var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}
h2 { margin: 0; font-size: var(--size-md); }
p { margin: var(--space-2) 0 0; }
p + button { margin-top: var(--space-2); }
ol { margin: var(--space-2) 0 0; padding: 0; list-style: none; }
li { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; gap: var(--space-2); padding: var(--space-2) 0; border-top: var(--border); }
li span { overflow-wrap: anywhere; }
</style>
