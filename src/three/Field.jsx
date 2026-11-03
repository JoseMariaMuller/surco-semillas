import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { createRng } from '../utils/random.js'
import { useGrowth } from './growthState.js'
import { neighborDistance } from './plantLayout.js'
import { patchGeometry } from './fieldPatch.js'
import { applyWind } from './wind.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * La hectárea: parcelas instanciadas alrededor del rizotrón, por fuera del cultivo
 * vecino detallado. Aparecen de adentro hacia afuera cuando `campo` sube.
 */
export default function Field({ crop, layout, quality, neighborReach }) {
  const g = useGrowth()

  const built = useMemo(() => {
    const { patch, width, len } = patchGeometry(crop, layout, quality)
    const k = Math.max(crop.H, 1)
    // Centro del lote entre la cámara de la etapa 10 y su punto de mira
    const target = new Vector3(1.5 * k, 0, -1 * k)
    const cands = []
    for (let x = -26 * k; x <= 26 * k; x += width) {
      for (let z = -40 * k; z <= 16 * k; z += len) {
        // fuera del foso y del cultivo vecino (que ya está detallado)
        if (Math.abs(x) < 0.9 && z > -0.4 && z < 1.4) continue
        if (neighborDistance(x, z) < neighborReach * 0.92) continue
        cands.push({ x, z, d: Math.hypot(x - target.x, z - target.z) })
      }
    }
    cands.sort((a, b) => a.d - b.d)
    const count = Math.min(cands.length, quality === 'high' ? 520 : 240)
    const picked = cands.slice(0, count)
    // orden de aparición: de la planta hacia afuera
    const dmax = Math.max(...picked.map((c) => Math.hypot(c.x, c.z)))
    const rng = createRng(`campo-${crop.id}`)
    const items = picked.map((c) => ({
      pos: new Vector3(c.x + rng.range(-0.05, 0.05), 0, c.z + rng.range(-0.1, 0.1)),
      quat: new Quaternion().setFromEuler(new Euler(0, rng.next() < 0.5 ? 0 : Math.PI, 0)),
      rank: Math.hypot(c.x, c.z) / dmax,
    }))
    const material = applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: DoubleSide }))
    const mesh = new InstancedMesh(patch, material, items.length)
    mesh.frustumCulled = false
    mesh.visible = false
    return { patch, material, mesh, items, last: -1, m: new Matrix4(), s: new Vector3() }
  }, [crop, layout, quality, neighborReach])

  useEffect(
    () => () => {
      built.patch.dispose()
      built.material.dispose()
      built.mesh.dispose()
    },
    [built],
  )

  useFrame(() => {
    const campo = g.g.campo * g.swap
    built.mesh.visible = campo > 0.001
    if (!built.mesh.visible || campo === built.last) return
    built.last = campo
    const { m, s } = built
    built.items.forEach((it, i) => {
      const a = clamp01((campo - it.rank * 0.55) / 0.45)
      const e = 1 - Math.pow(1 - a, 3)
      s.set(Math.max(e, 1e-4), Math.max(e, 1e-4), Math.max(e, 1e-4))
      m.compose(it.pos, it.quat, s)
      built.mesh.setMatrixAt(i, m)
    })
    built.mesh.instanceMatrix.needsUpdate = true
  })

  return <primitive object={built.mesh} />
}
