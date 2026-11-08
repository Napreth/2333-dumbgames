import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { applyGate } from '../../src/games/number-gates/simulation/army'
import type { Operation } from '../../src/games/number-gates/simulation/army'
import { createRun } from '../../src/games/number-gates/simulation/run'
import { bestRoute } from '../../src/games/number-gates/simulation/routes'
import type { TrackGate } from '../../src/games/number-gates/simulation/entities'

const gamePath = '/games/number-gates/'
const toyHome = '/toy/2333/index.html'
const toyGame = toyHome + '#/game/number-gates'
const canvas = (page: Page) => page.locator('canvas')
const power = (page: Page) => page.getByTestId('power')
const progress = (page: Page) => page.locator('[data-passed]')
const titleStart = (page: Page) => page.getByRole('button', { name: /开始游戏/ })

async function expectBrandAligned(page: Page, selectors: string[]) {
  const inkCenters = await page.evaluate((selectors) => {
    const context = document.createElement('canvas').getContext('2d')!
    return selectors.map((selector) => {
      const text = document.querySelector(selector)!
      const probe = document.createElement('span')
      probe.style.cssText = 'display:inline-block;width:0;height:0'
      text.append(probe)
      const baseline = probe.getBoundingClientRect().top
      probe.remove()
      const style = getComputedStyle(text)
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(text.textContent ?? '')
      return baseline + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2
    })
  }, selectors)
  const [numberCenter, ...titleCenters] = inkCenters
  for (const center of titleCenters) {
    expect(center - numberCenter).toBeGreaterThan(0)
    expect(center - numberCenter).toBeLessThan(5)
  }
}

test('renders a separate title before any run is created and starts exactly once', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto)
    let seeds = 0
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) document.documentElement.dataset.runSeeds = String(++seeds)
      return original(array)
    }
  })
  await page.goto(gamePath)
  const start = page.getByRole('button', { name: isMobile ? '点击开始游戏' : '按任意键开始游戏' })
  await expect(start).toBeVisible()
  await expect(page.getByRole('heading', { name: '数字门（测试版）', level: 2 })).toBeVisible()
  const still = await canvas(page).screenshot()
  await page.waitForTimeout(3800)
  expect(await canvas(page).screenshot()).toEqual(still)
  await expect(page.locator('html')).not.toHaveAttribute('data-run-seeds', /.+/)
  await expect(power(page)).toHaveCount(0)
  await expect(page.getByTestId('gate-left')).toHaveCount(0)
  if (isMobile) await start.tap()
  else {
    await start.focus()
    await page.keyboard.press('Shift')
    await expect(start).toBeVisible()
    await page.keyboard.press('k')
    await page.keyboard.press('k')
  }
  await expect(start).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-run-seeds', '1')
  await expect(power(page)).toHaveText('8')
  await expect(progress(page)).toHaveAttribute('data-passed', '1', { timeout: 8000 })
})

async function gatePower(page: Page, side: 'left' | 'right', current: bigint) {
  const text = (await page.getByTestId(`gate-${side}`).textContent())!.split(' ').at(-1)!
  return applyGate(current, { operation: text[0] as Operation, amount: BigInt(text.slice(1)) })
}

function weakerPositive(left: bigint, right: bigint) {
  if (left === 0n || right === 0n) return left > right ? 'left' : 'right'
  return left <= right ? 'left' : 'right'
}

test('filters the lobby and downloads the game only after navigating', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  const card = page.getByRole('link', { name: '数字门（测试版）', exact: true })
  const search = page.getByRole('searchbox', { name: '搜索游戏' })
  await expect(page.getByRole('list', { name: '游戏列表' }).getByRole('link', { name: '数字门（测试版）', exact: true })).toBeVisible()
  await expectBrandAligned(page, ['.lobby-header .threes', '.lobby-header .label'])
  await expect(card.locator('img')).toHaveJSProperty('complete', true)
  expect(await card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  expect(requests.some((url) => /\/assets\/Game-[\w-]+\.js$/.test(url))).toBe(false)

  await page.getByRole('button', { name: '跑酷' }).click()
  await expect(page.getByRole('button', { name: '跑酷' })).toHaveAttribute('aria-pressed', 'true')
  await search.fill('不存在')
  await expect(page.getByRole('status')).toHaveText('没有找到游戏')
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: '清空搜索' }).click()
  await search.fill(' 数字 ')
  await expect(card).toBeVisible()
  await page.getByRole('button', { name: '全部' }).click()
  await card.click()
  await expect(page).toHaveURL(/\/games\/number-gates\/$/)
  await expect(page.getByRole('banner').getByRole('heading', { name: '数字门（测试版）', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('数字门（测试版） - 2333沙雕小游戏')
  await expect(canvas(page)).toBeVisible()
  await expect(titleStart(page)).toBeVisible()
  expect(requests.some((url) => /\/assets\/Game-[\w-]+\.js$/.test(url))).toBe(true)
})

test('renders WebGL, steers by drag, and releases the context on exit', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(toyGame)
  await titleStart(page).click()
  expect(await page.evaluate(() => 'toy' in window)).toBe(false)
  await expect(page.getByRole('button', { name: '成绩榜' })).toHaveCount(0)
  await expect(power(page)).toHaveText('8')
  const surface = await canvas(page).elementHandle()
  expect(await surface.evaluate((element) => Boolean((element as HTMLCanvasElement).getContext('webgl2')))).toBe(true)
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await expect(page.getByRole('heading', { name: '已暂停' })).toBeVisible()
  const frozen = await progress(page).getAttribute('data-passed')
  await page.waitForTimeout(160)
  await expect(progress(page)).toHaveAttribute('data-passed', frozen!)
  await page.getByRole('button', { name: '静音' }).click()
  await expect(page.getByRole('button', { name: '开启声音' })).toHaveAttribute('aria-pressed', 'true')
  const expected = await gatePower(page, 'left', 8n)
  const centered = (await power(page).boundingBox())!.x
  const box = (await canvas(page).boundingBox())!
  const height = ((await power(page).boundingBox())!.y - box.y) / box.height
  expect(height).toBeGreaterThan(0.45)
  expect(height).toBeLessThan(0.85)
  await page.getByRole('button', { name: '继续游戏' }).click()
  const start = { x: box.x + box.width * 0.57, y: box.y + box.height * 0.73 }
  const end = { x: box.x + box.width * 0.24, y: start.y }
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 5 })
    await page.mouse.up()
  }
  await expect.poll(async () => (await power(page).boundingBox())!.x).toBeLessThan(centered - 10)
  await expect(power(page)).toHaveText(expected.toString(), { timeout: 13000 })
  await expect(progress(page)).toHaveAttribute('data-passed', '1')
  await page.getByRole('link', { name: '2333沙雕小游戏大厅', exact: true }).click()
  await expect(canvas(page)).toHaveCount(0)
  await expect.poll(async () => surface.evaluate((element) => (element as HTMLCanvasElement).getContext('webgl2')?.isContextLost())).toBe(true)
  expect(errors).toEqual([])
})

test('continuous keyboard play wins a scheduled fight, loses on an unsafe route, and restarts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard route is covered on desktop')
  test.setTimeout(100000)
  let seed = 0
  let initial = createRun(seed)
  let enemy = initial.track.entities.find((entity) => entity.kind === 'enemy')!
  const weakest = () => initial.track.entities.filter((entity): entity is TrackGate => entity.kind === 'gate' && entity.distance < enemy.distance)
    .reduce((power, { gates: [left, right] }) => {
      if (!power) return 0n
      const a = applyGate(power, left)
      const b = applyGate(power, right)
      return weakerPositive(a, b) === 'left' ? a : b
    }, initial.power)
  while ((weakest() === 0n || weakest() > enemy.power) && seed < 64) {
    initial = createRun(++seed)
    enemy = initial.track.entities.find((entity) => entity.kind === 'enemy')!
  }
  expect(weakest()).toBeGreaterThan(0n)
  expect(weakest()).toBeLessThanOrEqual(enemy.power)
  const expectedWin = bestRoute(initial.track.entities.filter((entity) => entity.distance <= enemy.distance), initial)!.power
  const startTime = new Date('2026-01-01T00:00:00Z').getTime()
  await page.clock.install({ time: startTime })
  await page.clock.pauseAt(startTime + 1000)
  await page.addInitScript((fixedSeed) => {
    const random = crypto.getRandomValues.bind(crypto)
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = fixedSeed
        return array
      }
      return random(array)
    }
  }, seed)
  await page.goto(gamePath)
  await titleStart(page).click()
  await page.getByRole('button', { name: '静音' }).click()
  await canvas(page).focus()
  const advanceUntil = async (ready: () => Promise<boolean>) => {
    for (let step = 0; step < 16; step++) {
      if (await ready()) return
      await page.clock.fastForward(400)
    }
  }
  const combat = page.locator('[data-combat="normal"]')
  const gateCount = progress(page)
  const choose = async (better: boolean, number: number) => {
    const current = BigInt((await power(page).getAttribute('title'))!)
    const left = await gatePower(page, 'left', current)
    const right = await gatePower(page, 'right', current)
    const side = better ? (left >= right ? 'left' : 'right') : weakerPositive(left, right)
    const key = better ? (side === 'left' ? 'ArrowLeft' : 'ArrowRight') : (side === 'left' ? 'a' : 'd')
    const expectedCount = String(number)
    await page.keyboard.down(key)
    await advanceUntil(async () => (await gateCount.getAttribute('data-passed')) === expectedCount)
    await page.keyboard.up(key)
    await expect(gateCount).toHaveAttribute('data-passed', expectedCount)
    await expect(power(page)).toHaveAttribute('title', (side === 'left' ? left : right).toString())
  }

  expect(enemy.afterGate).toBeGreaterThanOrEqual(12)
  expect(enemy.afterGate).toBeLessThanOrEqual(16)
  for (let i = 1; i <= enemy.afterGate; i++) await choose(true, i)
  const upcoming = page.locator('[data-gate-id]')
  const locked = await upcoming.evaluate((gate) => ({ id: gate.dataset.gateId, distance: gate.dataset.gateDistance, label: gate.textContent }))
  await advanceUntil(() => combat.isVisible())
  await expect(combat).toBeVisible()
  const enemyLabel = page.getByTestId('enemy-power')
  await expect(enemyLabel).toHaveAttribute('title', enemy.power.toString())
  const enemyY = (await enemyLabel.boundingBox())!.y
  const surface = (await canvas(page).boundingBox())!
  expect(enemyY - surface.y).toBeGreaterThan(surface.height * 0.25)
  expect(enemyY).toBeLessThan((await power(page).boundingBox())!.y)
  await advanceUntil(async () => ((await enemyLabel.boundingBox())?.y ?? 0) > enemyY + 2)
  expect((await enemyLabel.boundingBox())!.y).toBeGreaterThan(enemyY + 2)
  expect(await upcoming.evaluate((gate) => ({ id: gate.dataset.gateId, distance: gate.dataset.gateDistance, label: gate.textContent }))).toEqual(locked)
  await advanceUntil(async () => !(await combat.isVisible()))
  await expect(combat).toHaveCount(0)
  await expect(enemyLabel).toHaveCount(0)
  await expect(power(page)).toHaveAttribute('title', expectedWin.toString())
  expect(await upcoming.evaluate((gate) => ({ id: gate.dataset.gateId, distance: gate.dataset.gateDistance, label: gate.textContent }))).toEqual(locked)
  await choose(true, enemy.afterGate + 1)
  await page.getByRole('button', { name: '重新开始' }).click()
  await expect(titleStart(page)).toBeVisible()
  await titleStart(page).click()
  for (let i = 1; i <= enemy.afterGate; i++) await choose(false, i)
  await expect(power(page)).toHaveAttribute('title', weakest().toString())
  await advanceUntil(() => combat.isVisible())
  await expect(combat).toBeVisible()
  const defeat = page.getByRole('heading', { name: '队伍全灭' })
  await advanceUntil(() => defeat.isVisible())
  await expect(defeat).toBeVisible()
  await expect(page.getByRole('link', { name: '返回大厅' })).toHaveCount(0)
  await page.getByRole('button', { name: '再玩一次' }).click()
  await expect(titleStart(page)).toBeVisible()
  await expect(power(page)).toHaveCount(0)
  await expect(progress(page)).toHaveAttribute('data-passed', '0')
})

test('opens and refreshes both published formats and returns real 404s', async ({ page, request }) => {
  for (const [home, game] of [['/', gamePath], [toyHome, toyGame]]) {
    await page.goto(home)
    await expect(page.getByRole('link', { name: '数字门（测试版）', exact: true })).toBeVisible()
    await page.goto('about:blank')
    expect((await page.goto(game))?.status()).toBe(200)
    await expect(titleStart(page)).toBeVisible()
    expect((await page.reload())?.status()).toBe(200)
    await expect(titleStart(page)).toBeVisible()
    await expect(canvas(page)).toBeVisible()
    await expect(power(page)).toHaveCount(0)
    await expectBrandAligned(page, ['.masthead .threes', '.masthead .label', '#game-title'])
  }
  expect((await request.get('/games/number-gates')).url()).toMatch(/\/games\/number-gates\/$/)
  expect((await request.get('/games/missing/')).status()).toBe(404)
  expect((await request.get('/assets/missing.js')).status()).toBe(404)
})

test('keeps the canvas and controls visible after rotation', async ({ page }) => {
  await page.goto(gamePath)
  for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport)
    await expect(canvas(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    await expect(canvas(page)).toBeInViewport({ ratio: 0.96 })
    await expect(titleStart(page)).toBeVisible()
  }
})

test('recovers after the lazy game module fails to download', async ({ page }) => {
  const module = /\/assets\/Game-[\w-]+\.js$/
  await page.route(module, (route) => route.abort())
  await page.goto(gamePath)
  await expect(page.getByRole('alert')).toHaveText('游戏加载失败')
  await page.unroute(module)
  await page.getByRole('button', { name: '重试' }).click()
  await expect(titleStart(page)).toBeVisible()
})

test('can leave the game before its lazy module finishes loading', async ({ page }) => {
  const module = /\/assets\/Game-[\w-]+\.js$/
  let allowDownload = () => {}
  const pending = new Promise<void>((resolve) => { allowDownload = resolve })
  await page.route(module, async (route) => {
    await pending
    await route.continue()
  })
  await page.goto(toyHome)
  const card = page.getByRole('link', { name: '数字门（测试版）', exact: true })

  try {
    const downloading = page.waitForRequest(module)
    await card.click()
    await downloading
    await expect(page.getByRole('status')).toHaveText('加载中…')
    await page.getByRole('link', { name: '2333沙雕小游戏大厅', exact: true }).click()
    await expect(card).toBeVisible()
  } finally {
    allowDownload()
  }

  await card.click()
  await expect(titleStart(page)).toBeVisible()
})
