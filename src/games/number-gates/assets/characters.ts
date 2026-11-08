import { BoxGeometry, CapsuleGeometry, CylinderGeometry, IcosahedronGeometry, PlaneGeometry, SphereGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function characterMeshes() {
  return {
    joint: new CapsuleGeometry(0.5, 0.65, 2, 6),
    plate: new RoundedBoxGeometry(1, 1, 1, 1, 0.18),
    block: new BoxGeometry(1, 1, 1),
    head: new SphereGeometry(0.5, 10, 7),
    helmet: new SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.62),
    shield: new CylinderGeometry(0.5, 0.36, 0.25, 6),
    crest: new IcosahedronGeometry(0.5, 0),
    shadow: new PlaneGeometry(1, 1),
  }
}
