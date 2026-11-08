import * as T from 'three'
import { RUN } from '../config'
import { groundTexture, roadTexture, skyTexture } from '../assets/textures'
import { createRandom } from '../simulation/random'

export function createWorld(scene: T.Scene) {
  scene.background = skyTexture()
  scene.fog = new T.Fog(0xb8e8df, 29, 105)
  scene.add(new T.HemisphereLight(0xcceeff, 0xd5b691, 2.05))
  const sun = new T.DirectionalLight(0xfff0cb, 2.45)
  sun.position.set(-9, 15, 6)
  scene.add(sun)
  const rim = new T.DirectionalLight(0x8bd9ff, 0.78)
  rim.position.set(8, 4, -10)
  scene.add(rim)

  const roadMap = roadTexture()
  const groundMap = groundTexture()
  function surface(width: number, y: number, map: T.Texture) {
    const mesh = new T.Mesh(new T.PlaneGeometry(width, 120), new T.MeshStandardMaterial({ map, roughness: 0.96 }))
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, y, -45)
    scene.add(mesh)
  }
  surface(RUN.trackWidth, 0.045, roadMap)
  surface(168, -0.34, groundMap)

  const palette = [0x75bc9b, 0x59ad91, 0xa0cc9a, 0xd0c88e, 0x80bfba]
  const hill = new T.IcosahedronGeometry(1, 1)
  const box = new T.BoxGeometry(1, 1, 1)
  const trunk = new T.CylinderGeometry(0.075, 0.13, 1, 5)
  const leaves = new T.ConeGeometry(0.71, 1.48, 5)
  const rock = new T.DodecahedronGeometry(1, 0)
  const material = (color: number) => new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 })
  const hillMaterials = palette.map(material)
  const stone = material(0xe3c4a5)
  const coral = material(0xf9aa74)
  const pale = material(0xffe7c0)
  const dark = material(0x315378)
  const bark = material(0xbd9065)
  const foliage = [material(0x39a875), material(0x79cc77)]

  function add(group: T.Object3D, geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new T.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.scale.set(w, h, d)
    group.add(mesh)
    return mesh
  }

  const random = createRandom(2333)
  for (const sign of [-1, 1]) {
    for (let index = 0; index < 11; index++) {
      add(scene, hill, hillMaterials[index % palette.length], sign * (17 + random() * 38), -0.5, -18 - index * 8,
        4 + random() * 9, 2 + random() * 8, 5 + random() * 9).rotation.y = random() * Math.PI
    }
  }

  const strips = Array.from({ length: 10 }, (_, index) => {
    const group = new T.Group()
    for (const side of [-1, 1]) {
      const edge = side * (RUN.trackWidth / 2 + 0.11)
      add(group, box, dark, edge, -0.06, 0, 0.25, 0.26, 12)
      for (let panel = 0; panel < 6; panel++) {
        add(group, box, panel % 2 ? coral : pale, edge, 0.095, -5 + panel * 2, 0.24, 0.13, 1.97)
      }
      if ((index + side) % 3 !== 0) {
        const x = side * (5.8 + random() * 3.8)
        const height = 1.3 + random() * 1.15
        const z = random() * 8 - 4
        add(group, trunk, bark, x, height / 2 - 0.23, z, 1, height, 1)
        add(group, leaves, foliage[0], x, height - 0.05, z, 1.27, 1.18, 1.27)
        add(group, leaves, foliage[1], x, height + 0.46, z, 0.93, 0.96, 0.93)
      }
      add(group, rock, stone, side * (5.2 + random() * 5), -0.22, random() * 8 - 4, 0.6, 0.44, 0.66).rotation.y = index
      if (index % 3 === 0) {
        const x = side * 5.12
        add(group, box, pale, x, 0.3, 1.8, 0.22, 1.22, 0.24)
        add(group, box, coral, x + side * 0.17, 0.88, 1.8, 0.55, 0.22, 0.25)
      }
    }
    return group
  })

  const pieces = new Map<T.BufferGeometry, Map<T.Material, { index: number; local: T.Matrix4 }[]>>()
  strips.forEach((strip, index) => {
    for (const item of strip.children as T.Mesh<T.BufferGeometry, T.Material>[]) {
      item.updateMatrix()
      if (!pieces.has(item.geometry)) pieces.set(item.geometry, new Map())
      const byMaterial = pieces.get(item.geometry)!
      if (!byMaterial.has(item.material)) byMaterial.set(item.material, [])
      byMaterial.get(item.material)!.push({ index, local: item.matrix })
    }
  })
  const roadside = [...pieces].flatMap(([geometry, materials]) => [...materials].map(([material, items]) => {
    const mesh = new T.InstancedMesh(geometry, material, items.length)
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    mesh.frustumCulled = false
    scene.add(mesh)
    return { mesh, items }
  }))
  const placement = new T.Matrix4()
  const positions = new Float32Array(strips.length)

  return function updateWorld(travel: number) {
    roadMap.offset.y = travel / 10
    groundMap.offset.y = travel / 12
    for (let i = 0; i < positions.length; i++) positions[i] = 12 - ((i * 12 - travel + 120) % 120)
    for (const { mesh, items } of roadside) {
      for (let i = 0; i < items.length; i++) {
        placement.copy(items[i].local)
        placement.elements[14] += positions[items[i].index]
        mesh.setMatrixAt(i, placement)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }
}
