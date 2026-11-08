import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { createRandom } from '../simulation/random'

export function texture(width: number, height: number, draw?: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  draw?.(ctx)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  return { map, ctx }
}

export function skyTexture() {
  return texture(960, 512, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#409fe4')
    sky.addColorStop(0.65, '#b1f0e8')
    sky.addColorStop(1, '#ecf7ca')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 960, 512)
    const sun = ctx.createRadialGradient(725, 108, 12, 725, 108, 132)
    sun.addColorStop(0, '#fff2b6')
    sun.addColorStop(0.24, '#fff6ca')
    sun.addColorStop(1, '#fff2b600')
    ctx.fillStyle = sun
    ctx.fillRect(570, 0, 310, 270)
    const random = createRandom(87)
    for (let cloud = 0; cloud < 14; cloud++) {
      const x = random() * 1000 - 30
      const y = 50 + random() * 205
      const size = 12 + random() * 46
      ctx.fillStyle = '#f1ffff8a'
      ctx.beginPath()
      ctx.ellipse(x, y, size * 2.2, size * 0.26, 0, 0, Math.PI * 2)
      ctx.ellipse(x - size * 0.3, y - size * 0.18, size * 0.97, size * 0.43, 0, 0, Math.PI * 2)
      ctx.ellipse(x + size * 0.48, y - size * 0.08, size * 0.67, size * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }).map
}

export function roadTexture() {
  const { map } = texture(512, 512, (ctx) => {
    ctx.fillStyle = '#435d85'
    ctx.fillRect(0, 0, 512, 512)
    const random = createRandom(112)
    for (let i = 0; i < 5100; i++) {
      ctx.fillStyle = random() > 0.48 ? '#94b4d538' : '#26355248'
      ctx.fillRect(random() * 512, random() * 512, 1 + random() * 4, 1 + random() * 3)
    }
    for (const x of [0, 489]) {
      ctx.fillStyle = '#263f67'
      ctx.fillRect(x, 0, 23, 512)
      ctx.fillStyle = '#b6ecf6'
      ctx.fillRect(x + 7, 0, 6, 512)
    }
    ctx.fillStyle = '#d0e9ff'
    for (const y of [38, 294]) ctx.fillRect(251, y, 10, 132)
    ctx.strokeStyle = '#22375170'
    ctx.lineWidth = 2
    for (const y of [8, 264]) {
      ctx.beginPath()
      ctx.moveTo(23, y)
      ctx.lineTo(489, y)
      ctx.stroke()
    }
    ctx.strokeStyle = '#9cc5df55'
    ctx.lineWidth = 5
    for (const x of [124, 388]) {
      ctx.beginPath()
      ctx.moveTo(x - 20, 444)
      ctx.lineTo(x, 417)
      ctx.lineTo(x + 20, 444)
      ctx.stroke()
    }
  })
  map.wrapT = RepeatWrapping
  map.repeat.set(1, 12)
  map.anisotropy = 4
  return map
}

export function groundTexture() {
  const { map } = texture(256, 256, (ctx) => {
    ctx.fillStyle = '#9fc889'
    ctx.fillRect(0, 0, 256, 256)
    const random = createRandom(35)
    for (let i = 0; i < 1250; i++) {
      const x = random() * 256
      const y = random() * 256
      ctx.fillStyle = random() > 0.5 ? '#e4f2b146' : '#548e7650'
      ctx.fillRect(x, y, 2 + random() * 4, 1 + random() * 5)
    }
  })
  map.wrapS = map.wrapT = RepeatWrapping
  map.repeat.set(14, 10)
  return map
}

export function shadowTexture() {
  return texture(64, 64, (ctx) => {
    const blur = ctx.createRadialGradient(32, 32, 5, 32, 32, 32)
    blur.addColorStop(0, '#172343a8')
    blur.addColorStop(1, '#17234300')
    ctx.fillStyle = blur
    ctx.fillRect(0, 0, 64, 64)
  }).map
}

export function gearTexture() {
  return texture(64, 64, (ctx) => {
    ctx.fillStyle = '#f3f6fa'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#dce2ec'
    ctx.fillRect(0, 0, 64, 5)
    ctx.fillRect(0, 59, 64, 5)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 5, 64, 2)
    for (let row = 10; row < 58; row += 4) {
      ctx.fillStyle = row % 8 === 2 ? '#e5edf5' : '#edf3f9'
      ctx.fillRect(0, row, 64, 1)
    }
  }).map
}

export function sparkTexture() {
  return texture(48, 48, (ctx) => {
    ctx.translate(24, 24)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let point = 0; point < 8; point++) {
      const angle = point * Math.PI / 4
      const radius = point % 2 ? 5 : 23
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    }
    ctx.closePath()
    ctx.fill()
  }).map
}
