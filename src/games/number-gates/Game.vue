<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import Icon from '../../app/components/Icon.vue'
import { createAudio } from './assets/audio'
import { RUN } from './config'
import game, { edition, title } from './index'
import { createControls } from './input/controls'
import { createScene } from './rendering/scene'
import { formatPower } from './simulation/army'
import { advance, createRun } from './simulation/run'
import type { Run, RunEvent } from './simulation/run'

const canvas = ref<HTMLCanvasElement>()
const startButton = ref<HTMLButtonElement>()
const retryButton = ref<HTMLButtonElement>()
const createSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]
let run: Run | undefined
let scene: ReturnType<typeof createScene> | undefined
let controls: ReturnType<typeof createControls> | undefined
let observer: ResizeObserver | undefined
let frame = 0
let lastTime = 0
let accumulated = 0
let failureAge = 0
const listeners = new AbortController()
const audio = createAudio()
type GameState = 'title' | 'playing' | 'paused' | 'gameover'
const state = ref<GameState>('title')
const paused = computed(() => state.value === 'paused')
const muted = ref(false)
const unavailable = ref(false)
const lostContext = ref(false)
function readHud(run: Run) {
  return {
    passed: run.passed,
    power: run.power, enemy: run.enemy, battle: run.battle?.entity.battleType, failed: run.failed,
    nextGate: run.track.entities.find((entity) => entity.kind === 'gate'),
  }
}
const hud = shallowRef<ReturnType<typeof readHud>>({ passed: 0, power: 0n, enemy: 0n, failed: false, battle: undefined, nextGate: undefined })
const nextGates = computed(() => state.value === 'playing' || paused.value ? hud.value.nextGate : undefined)
const powerPosition = shallowRef({ left: 50, top: 65 })
const enemyPosition = shallowRef<{ left: number; top: number }>()

watch(() => hud.value.failed, (failed) => {
  if (failed) retryButton.value?.focus({ preventScroll: true })
}, { flush: 'post' })

function onEvent(event: RunEvent) {
  if (!run) return
  scene?.react(event, run)
  audio.react(event)
  hud.value = readHud(run)
  if (event.kind === 'failed') {
    state.value = 'gameover'
    failureAge = 0
    controls?.clear()
  }
}

function render(dt: number) {
  if (!scene || lostContext.value) return
  if (state.value === 'title') {
    scene.drawTitle()
    return
  }
  if (run) {
    const { player, enemy } = scene.draw(run, dt, paused.value)
    if (player.left !== powerPosition.value.left || player.top !== powerPosition.value.top) powerPosition.value = player
    if (enemy?.left !== enemyPosition.value?.left || enemy?.top !== enemyPosition.value?.top) enemyPosition.value = enemy
  }
}

function loop(time: number) {
  frame = 0
  if (!run || document.hidden || state.value === 'title' || paused.value || lostContext.value) return
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.5) : 0
  lastTime = time
  accumulated += dt
  while (accumulated >= RUN.step) {
    const target = controls?.step(RUN.step) ?? 0
    advance(run, RUN.step, target, onEvent)
    accumulated -= RUN.step
  }
  if (!run.battle && !run.failed) audio.step()
  render(dt)
  if (run.failed) failureAge += dt
  if (!run.failed || failureAge < 0.8) frame = requestAnimationFrame(loop)
}

function stopLoop() {
  cancelAnimationFrame(frame)
  frame = lastTime = accumulated = 0
  controls?.clear()
}

function resumeLoop() {
  if (scene && !frame && !document.hidden && state.value === 'playing' && !lostContext.value) frame = requestAnimationFrame(loop)
}

function togglePause() {
  if (state.value !== 'playing' && state.value !== 'paused') return
  state.value = paused.value ? 'playing' : 'paused'
  if (paused.value) {
    stopLoop()
    render(0)
  } else {
    canvas.value?.focus({ preventScroll: true })
    resumeLoop()
  }
}

function toggleSound() {
  muted.value = !muted.value
  audio.mute(muted.value)
  if (!muted.value) audio.activate()
}

function start() {
  if (state.value !== 'title' || !scene || lostContext.value) return
  audio.activate()
  run = createRun(createSeed())
  hud.value = readHud(run)
  state.value = 'playing'
  render(0)
  canvas.value?.focus({ preventScroll: true })
  resumeLoop()
}

function startWithKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey
    || (event.key.length !== 1 && event.key !== 'Enter' && !event.key.startsWith('Arrow'))) return
  event.preventDefault()
  event.stopPropagation()
  start()
}

function restart() {
  stopLoop()
  run = undefined
  hud.value = { passed: 0, power: 0n, enemy: 0n, failed: false, battle: undefined, nextGate: undefined }
  failureAge = 0
  state.value = 'title'
  controls?.reset()
  scene?.reset()
  render(0)
  void nextTick(() => startButton.value?.focus({ preventScroll: true }))
}

function reload() { window.location.reload() }

onMounted(() => {
  const surface = canvas.value!
  try {
    scene = createScene(surface)
    controls = createControls(surface, scene.trackX, () => {
      audio.activate()
    }, () => state.value === 'playing')
    const resize = () => { scene?.resize(); render(0) }
    observer = new ResizeObserver(resize)
    observer.observe(surface)
    resize()
    const options = { signal: listeners.signal }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop()
      else resumeLoop()
    }, options)
    surface.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      lostContext.value = true
      stopLoop()
    }, options)
    surface.addEventListener('webglcontextrestored', () => {
      lostContext.value = false
      if (state.value === 'playing') state.value = 'paused'
      resize()
    }, options)
    if (document.activeElement === document.body || document.activeElement?.tagName === 'MAIN') {
      startButton.value?.focus({ preventScroll: true })
    }
  } catch {
    unavailable.value = true
  }
})

onBeforeUnmount(() => {
  stopLoop()
  listeners.abort()
  observer?.disconnect()
  controls?.dispose()
  scene?.dispose()
  audio.dispose()
})
</script>

<template>
  <section class="wrap runner" aria-labelledby="game-title">
    <div class="viewport" :data-state="state" :data-passed="hud.passed" :data-combat="hud.battle && !hud.failed ? hud.battle : undefined">
      <canvas ref="canvas" :aria-label="`${game.name} 3D 跑道`" :tabindex="state === 'playing' ? 0 : -1" />
      <div v-if="state === 'title' && !unavailable && !lostContext" class="title-screen">
        <h2>{{ title }}<span class="title-edition">{{ edition }}</span></h2>
        <button ref="startButton" type="button" class="title-start" @click="start" @keydown="startWithKey">
          <span class="desktop-hint">按任意键开始游戏</span><span class="touch-hint">点击开始游戏</span>
        </button>
      </div>
      <div v-if="nextGates" class="sr-only" aria-live="polite" :data-gate-id="nextGates.id" :data-gate-distance="nextGates.distance">
        <span data-testid="gate-left">左门 {{ nextGates.gates[0].operation }}{{ nextGates.gates[0].amount }}</span>
        <span data-testid="gate-right">右门 {{ nextGates.gates[1].operation }}{{ nextGates.gates[1].amount }}</span>
      </div>
      <strong v-if="state !== 'title' && !unavailable && !lostContext && !hud.failed" class="army-power"
        data-testid="power" aria-label="当前战力" :title="hud.power.toString()"
        :style="{ left: powerPosition.left + '%', top: powerPosition.top + '%' }">{{ formatPower(hud.power) }}</strong>
      <div v-if="state !== 'title' && !unavailable" class="hud">
        <div class="actions">
          <button type="button" class="icon" :aria-label="muted ? '开启声音' : '静音'" :title="muted ? '开启声音' : '静音'"
            :aria-pressed="muted" @click="toggleSound">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" />
              <path :d="muted ? 'm16 9 5 6m0-6-5 6' : 'M17 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12'" />
            </svg>
          </button>
          <button type="button" class="icon" :disabled="hud.failed || lostContext"
            :aria-label="paused ? '继续' : '暂停'" :title="paused ? '继续' : '暂停'" @click="togglePause">
            <Icon :name="paused ? 'play' : 'pause'" />
          </button>
          <button type="button" class="icon" aria-label="重新开始" title="重新开始" :disabled="lostContext" @click="restart">
            <Icon name="restart" />
          </button>
        </div>
      </div>
      <strong v-if="enemyPosition && hud.battle && !lostContext && !hud.failed" class="army-power enemy-power"
        :class="{ boss: hud.battle === 'boss' }" data-testid="enemy-power" aria-label="敌军战力" :title="hud.enemy.toString()"
        :style="{ left: enemyPosition.left + '%', top: enemyPosition.top + '%' }">{{ formatPower(hud.enemy) }}</strong>
      <div v-if="unavailable || lostContext || paused || hud.failed" class="overlay">
        <div class="panel">
          <template v-if="unavailable || lostContext">
            <p role="alert">{{ unavailable ? '无法启动 WebGL 2' : '3D 画面已断开' }}</p>
            <button type="button" class="control control--primary" @click="reload">重试</button>
          </template>
          <template v-else-if="hud.failed">
            <h2>队伍全灭</h2>
            <p>通过 {{ hud.passed }} 组数字门</p>
            <button ref="retryButton" type="button" class="control control--primary" @click="restart">再玩一次</button>
          </template>
          <template v-else>
            <h2>已暂停</h2>
            <button type="button" class="control control--primary" @click="togglePause">继续游戏</button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.runner { --page-width: 75rem; padding-block: clamp(.5rem, 2vw, 1.25rem) max(.65rem, env(safe-area-inset-bottom)); }
.viewport {
  position: relative;
  height: clamp(22rem, calc(100svh - 6.2rem), 45rem);
  isolation: isolate;
  overflow: hidden;
  border: 1px solid #436b8b;
  border-radius: var(--radius-lg);
  background: #85cadc;
  color: #effbff;
}
canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
canvas:active { cursor: grabbing; }
.title-screen {
  position: absolute; inset: 0; display: grid; align-content: start; padding: clamp(1.35rem, 5vw, 4.5rem);
  background: linear-gradient(112deg, #0a233de6, #15314e38 57%, transparent 76%), linear-gradient(0deg, #10283ebd, transparent 31%);
  color: #f6fbff;
}
.title-screen h2 {
  width: fit-content; margin: 0; padding-block-end: .14em; border-bottom: .045em solid #bdeaff;
  font-size: clamp(3.25rem, 11vw, 8.2rem); font-weight: 950; line-height: 1; letter-spacing: .035em;
  text-shadow: 0 .045em #226fa4, 0 .095em #102b44;
}
.title-edition { font-size: .31em; white-space: nowrap; }
.title-start {
  position: absolute; inset: 0; display: flex; align-items: end; justify-content: start; padding: clamp(1.35rem, 5vw, 4.5rem);
  border: 0; border-radius: inherit; background: transparent; color: #effaff; cursor: pointer; touch-action: manipulation;
  font-weight: 780; font-size: clamp(.94rem, 2.5vw, 1.3rem); letter-spacing: .11em;
  text-shadow: 0 2px 7px #071b32, 0 1px 2px #071b32;
}
.title-start:focus-visible { outline: none; }
.title-start:focus-visible span { text-decoration: underline; text-underline-offset: .32em; }
.title-start:hover span { color: #bdeaff; }
@media (max-aspect-ratio: 4/5) {
  .title-screen { justify-items: center; background: linear-gradient(180deg, #0a233de6, transparent 47%, transparent 69%, #10283ee8); }
  .title-start { justify-content: center; }
}
.hud { position: absolute; z-index: 1; inset: .75rem .75rem auto; display: flex; align-items: start; justify-content: end; gap: .35rem; pointer-events: none; }
.army-power {
  position: absolute; z-index: 1; transform: translate(-50%, -100%); pointer-events: none;
  border: 1px solid #a0dafe; border-radius: .35rem; padding: .12em .45em;
  background: #102c48ee; color: #f0fcff; white-space: nowrap;
  font: 900 clamp(1rem, 3vw, 1.4rem)/1.15 var(--font-number);
}
.actions { display: flex; justify-content: end; gap: .28rem; flex-wrap: wrap; pointer-events: auto; }
.icon {
  display: grid; place-items: center; width: 2.65rem; height: 2.65rem; padding: 0;
  background: #172d4bec; color: #effbff; border: 1px solid #8dcbd2; border-radius: .55rem; --focus: #e7ffb0;
}
.icon:hover:not(:disabled) { background: #274e74; }
.icon:disabled { opacity: .62; }
.enemy-power { border-color: #e5a978; background: #442b34ee; color: #ffdfbe; }
.enemy-power.boss { border-color: #f0a0c3; color: #ffc8dd; }
.touch-hint { display: none; }
.overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: .75rem; background: #17294671; }
.panel { background: #f7f9f0; color: #152d49; text-align: center; border-radius: .7rem; padding: clamp(.75rem, 3vw, 1.35rem); border-top: 4px solid #adf481; box-shadow: 0 .45rem 1.5rem #14273955; }
.panel h2, .panel p { margin: 0 0 .55rem; }
.panel h2 { font-size: 1.35rem; }

@media (pointer: coarse) {
  .touch-hint { display: inline; }
  .desktop-hint { display: none; }
}
@media (max-width: 37rem) {
  .runner { --page-gutter: .5rem; }
  .viewport { height: max(19rem, calc(100svh - 5rem)); }
  .hud { inset: .4rem .4rem auto; }
  .icon { width: 2.5rem; height: 2.5rem; }
}
@media (orientation: landscape) and (max-height: 29rem) {
  .viewport { height: max(13.75rem, calc(100svh - 4.5rem)); }
}
</style>
