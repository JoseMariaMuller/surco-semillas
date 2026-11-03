import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { useGrowth } from '../growthState.js'
import { applyWind } from '../wind.js'
import { nodePosition } from './stalkGrowth.js'
import { createRng } from '../../utils/random.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const POD_GREEN = new Color('#7aa045')
const POD_YELLOW = new Color('#d6c46a')
const POD_LEN = 0.045
const POD_W = 0.009

// Vaina achatada y apenas curva, con los granos marcados (2 o 3 abultamientos).
function podGeometry(hi) {
  const g = new SphereGeometry(1, hi ? 20 : 12, hi ? 8 : 6)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    const bulge = 1 + 0.16 * Math.cos(x * Math.PI * 1.5) ** 2
    y *= bulge
    z *= bulge
    // curva de banana y base en el origen
    p.setXYZ(i, (x + 1) * (POD_LEN / 2), y * (POD_W / 2) - 0.12 * POD_LEN * ((x + 1) / 2) ** 2, z * POD_W * 0.38)
  }
  g.computeVertexNormals()
  return g
}

/**
 * Flores y vainas de la soja en las axilas del tallo y de las ramas.
 * Las flores aparecen desde los nudos de abajo y del medio (R1) y están todas en R2;
 * después caen y en su lugar crecen las vainas, que se llenan, amarillean y quedan tostadas.
 */
export default function SoyNodes({ crop, layout, quality }) {
  const g = useGrowth()
  const hi = quality === 'high'
  const sites = layout.podSites

  const built = useMemo(() => {
    const rng = createRng(`flores-${crop.id}`)
    const flor = new Color(crop.paleta.flor)
    const flowerGeo = new SphereGeometry(1, hi ? 8 : 5, hi ? 6 : 4)
    flowerGeo.scale(0.0032, 0.0036, 0.0016)
    const flowerMat = applyWind(new MeshStandardMaterial({ color: flor, roughness: 0.5, emissive: flor.clone().multiplyScalar(0.2) }))
    const podGeo = podGeometry(hi)
    const podMat = applyWind(new MeshStandardMaterial({ color: POD_GREEN.clone(), roughness: 0.9 }))
    // Cada flor y cada vaina con su ángulo dentro del racimo
    const flowers = []
    const pods = []
    sites.forEach((s, si) => {
      for (let k = 0; k < s.flowers; k++) {
        flowers.push({ si, spread: rng.range(-0.6, 0.6), out: rng.range(0.004, 0.009), dy: rng.range(-0.004, 0.004) })
      }
      for (let k = 0; k < s.pods; k++) {
        pods.push({ si, spread: (k - (s.pods - 1) / 2) * 0.45 + rng.range(-0.15, 0.15), down: rng.range(0.9, 1.5), s: rng.range(0.85, 1.1) })
      }
    })
    const fMesh = new InstancedMesh(flowerGeo, flowerMat, flowers.length)
    const pMesh = new InstancedMesh(podGeo, podMat, pods.length)
    fMesh.frustumCulled = false
    pMesh.frustumCulled = false
    return {
      flowerGeo, flowerMat, podGeo, podMat, flowers, pods, fMesh, pMesh, ripe: new Color(crop.paleta.maduro),
      tmp: { p: new Vector3(), m: new Matrix4(), q: new Quaternion(), e: new Euler(), s: new Vector3(), off: new Vector3() },
      last: '',
    }
  }, [crop, sites, hi])

  useEffect(
    () => () => {
      built.flowerGeo.dispose()
      built.flowerMat.dispose()
      built.podGeo.dispose()
      built.podMat.dispose()
      built.fMesh.dispose()
      built.pMesh.dispose()
    },
    [built],
  )

  useFrame(() => {
    const { cabeza, polen, grano, madurez, hojas, tallo } = g.g
    const key = `${cabeza}|${polen}|${grano}|${madurez}|${hojas}|${tallo}`
    if (key === built.last) return
    built.last = key
    const t = built.tmp
    // Floración: arranca en los nudos de abajo y del medio (R1) y llega a todos en R2
    const bloom = cabeza * 0.35 + polen * 0.65
    const podStart = (s) => 0.2 + 0.3 * s.order

    built.flowers.forEach((f, i) => {
      const s = sites[f.si]
      const open = clamp01((bloom - s.order) / 0.15)
      const gone = clamp01((grano - podStart(s) - 0.05) / 0.1)
      const k = open * (1 - gone)
      nodePosition(layout, s, g, t.p)
      const a = s.azimuth + f.spread
      t.p.x += Math.cos(a) * f.out
      t.p.z -= Math.sin(a) * f.out
      t.p.y += f.dy
      t.e.set(0, a, -0.4)
      t.q.setFromEuler(t.e)
      t.s.setScalar(Math.max(k, 1e-4))
      t.m.compose(t.p, t.q, t.s)
      built.fMesh.setMatrixAt(i, t.m)
    })
    built.fMesh.instanceMatrix.needsUpdate = true

    built.pods.forEach((p, i) => {
      const s = sites[p.si]
      const st = podStart(s)
      const len = clamp01((grano - st) / 0.4)
      const fill = 0.5 + 0.5 * clamp01((grano - st - 0.2) / 0.4)
      nodePosition(layout, s, g, t.p)
      // las vainas cuelgan hacia afuera y abajo desde la axila
      t.e.set(0, s.azimuth + p.spread, -p.down, 'YXZ')
      t.q.setFromEuler(t.e)
      const k = Math.max(len * p.s, 1e-4)
      t.s.set(k, k * fill, k * fill)
      t.m.compose(t.p, t.q, t.s)
      built.pMesh.setMatrixAt(i, t.m)
    })
    built.pMesh.instanceMatrix.needsUpdate = true

    // Color: verdes en el llenado, amarillas y al final tostadas
    // verdes hasta R6 (madurez 0,3), amarillas en R7 y tostadas en R8
    built.podMat.color.copy(POD_GREEN).lerp(POD_YELLOW, clamp01((madurez - 0.35) / 0.35)).lerp(built.ripe, clamp01((madurez - 0.7) / 0.3))
  })

  return (
    <group>
      <primitive object={built.fMesh} />
      <primitive object={built.pMesh} />
    </group>
  )
}
