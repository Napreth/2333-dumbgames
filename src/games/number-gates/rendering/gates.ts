import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { texture } from '../assets/textures'
import { RUN } from '../config'
import type { Gate } from '../simulation/army'
import type { TrackGate } from '../simulation/entities'
import type { Run } from '../simulation/run'

export function createGates(scene: T.Scene) {
  const block = new RoundedBoxGeometry(1, 1, 1, 1, 0.13)
  const plane = new T.PlaneGeometry(1, 1)
  const dark = new T.MeshStandardMaterial({ color: 0x273959, roughness: 0.7 })
  function piece(group: T.Group, material: T.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new T.Mesh(block, material)
    mesh.position.set(x, y, z)
    mesh.scale.set(w, h, d)
    group.add(mesh)
  }

  function doorway(parent: T.Group, center: number) {
    const group = new T.Group()
    group.position.x = center
    parent.add(group)
    const frame = new T.MeshStandardMaterial({ roughness: 0.48, metalness: 0.08 })
    const light = new T.MeshBasicMaterial()
    const glass = new T.MeshBasicMaterial({ opacity: 0.16, transparent: true, depthWrite: false, side: T.DoubleSide })
    for (const side of [-1, 1]) {
      const x = side * 1.8
      piece(group, dark, x, 0.26, 0, 0.47, 0.44, 0.62)
      piece(group, frame, x, 1.53, 0, 0.29, 2.72, 0.35)
      piece(group, light, x, 1.58, 0.19, 0.075, 2.3, 0.025)
    }
    piece(group, frame, 0, 3.03, 0, 3.95, 0.98, 0.5)
    piece(group, light, 0, 0.066, 0, 3.55, 0.04, 0.42)
    const pane = new T.Mesh(plane, glass)
    pane.scale.set(3.35, 2.56, 1)
    pane.position.set(0, 1.33, -0.025)
    group.add(pane)
    const { map, ctx } = texture(512, 144)
    const sign = new T.Mesh(plane, new T.MeshBasicMaterial({ map, toneMapped: false }))
    sign.scale.set(3.72, 0.86, 1)
    sign.position.set(0, 3.04, 0.257)
    group.add(sign)

    return function label(gate: Gate) {
      frame.color.setHex(0x236caa)
      light.color.setHex(0x91ddff)
      glass.color.copy(light.color)
      ctx.fillStyle = '#143453'
      ctx.fillRect(0, 0, 512, 144)
      ctx.strokeStyle = '#8fd8ff'
      ctx.lineWidth = 7
      ctx.strokeRect(5, 5, 502, 134)
      ctx.fillStyle = '#f0faff'
      const text = gate.operation + gate.amount.toString()
      ctx.font = `900 ${text.length > 7 ? 77 : 105}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 256, 73, 460)
      map.needsUpdate = true
    }
  }

  const groups = Array.from({ length: Math.ceil(RUN.renderAhead / RUN.minGap) + 1 }, () => {
    const group = new T.Group()
    scene.add(group)
    return { group, left: doorway(group, -RUN.laneX), right: doorway(group, RUN.laneX), key: '' }
  })

  return function updateGates(run: Pick<Run, 'distance' | 'lastGate'> & { track: Pick<Run['track'], 'entities' | 'seed'> }) {
    let used = 0
    function draw(pair: TrackGate) {
      const slot = groups[used++]
      slot.group.visible = true
      const key = `${run.track.seed}:${pair.id}`
      if (slot.key !== key) {
        slot.left(pair.gates[0])
        slot.right(pair.gates[1])
        slot.key = key
      }
      slot.group.position.z = run.distance - pair.distance
    }
    if (run.lastGate && run.distance - run.lastGate.distance < 5) draw(run.lastGate)
    for (const pair of run.track.entities) {
      if (pair.distance - run.distance > RUN.renderAhead) break
      if (pair.kind === 'gate') draw(pair)
    }
    for (; used < groups.length; used++) groups[used].group.visible = false
  }
}
