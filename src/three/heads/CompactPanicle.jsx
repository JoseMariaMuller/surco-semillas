import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { useGrowth } from '../growthState.js'
import { createRng } from '../../utils/random.js'
import { applyWind } from '../wind.js'

const GREEN = new Color('#8fae5c')
const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Panoja compacta (sorgo): racimo ovalado y denso de granos esféricos.
 * Los granos se reparten sobre un ovoide con una espiral de Fibonacci.
 */
export default function CompactPanicle({ cropId, length, palette, quality, azimuth = 0 }) {
  const g = useGrowth()
  const group = useRef()

  const built = useMemo(() => {
    const rng = createRng(`racimo-${cropId}`)
    const hi = quality === 'high'
    const count = hi ? 250 : 170
    const halfH = length / 2
    const radius = length * 0.19
    const grains = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const yN = 1 - 2 * t // de arriba (1) a abajo (-1)
      // ovoide: más ancho abajo del medio, punta redondeada arriba
      const shape = Math.sqrt(Math.max(0, 1 - yN * yN)) * (1 - 0.18 * yN)
      const a = i * golden
      const r = radius * shape * rng.range(0.86, 1.04)
      grains.push({
        pos: new Vector3(Math.cos(a) * r, halfH + yN * halfH * 0.96, Math.sin(a) * r),
        size: rng.range(0.85, 1.1),
      })
    }

    const grainGeo = new SphereGeometry(1, hi ? 8 : 6, hi ? 6 : 4)
    const coreGeo = new SphereGeometry(1, hi ? 16 : 10, hi ? 12 : 8)
    const grainMat = applyWind(new MeshStandardMaterial({ color: GREEN.clone(), roughness: 0.45 }))
    const coreMat = applyWind(new MeshStandardMaterial({ color: '#4d5a2c', roughness: 0.8 }))
    const grainMesh = new InstancedMesh(grainGeo, grainMat, count)
    grainMesh.castShadow = true
    grainMesh.frustumCulled = false
    return { grains, grainGeo, coreGeo, grainMat, coreMat, grainMesh, radius, halfH, fill: -1 }
  }, [cropId, length, quality])

  useEffect(
    () => () => {
      const b = built
      ;[b.grainGeo, b.coreGeo, b.grainMat, b.coreMat].forEach((x) => x.dispose())
      b.grainMesh.dispose()
    },
    [built],
  )

  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), s: new Vector3() }), [])
  const brick = useMemo(() => new Color(palette.grano), [palette])
  const dark = useMemo(() => new Color(palette.grano).multiplyScalar(0.55), [palette])

  useFrame(() => {
    const { cabeza, grano, madurez } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.002
    if (!grp.visible) return
    grp.scale.set(0.55 + 0.45 * cabeza, Math.max(cabeza, 0.001), 0.55 + 0.45 * cabeza)

    if (Math.abs(grano - built.fill) > 1e-4) {
      built.fill = grano
      const { m, q, s } = tmp
      const k = 0.0046 + 0.0022 * grano
      built.grains.forEach((gr, i) => {
        s.setScalar(k * gr.size)
        m.compose(gr.pos, q, s)
        built.grainMesh.setMatrixAt(i, m)
      })
      built.grainMesh.instanceMatrix.needsUpdate = true
    }

    // verde → ladrillo con el llenado → más oscuro al madurar
    built.grainMat.color.copy(GREEN).lerp(brick, clamp01(grano * 1.1)).lerp(dark, clamp01(madurez))
    // el núcleo acompaña el color para que no se vean huecos
    built.coreMat.color.copy(built.grainMat.color).multiplyScalar(0.62)
  })

  return (
    <group rotation-y={azimuth}>
      <group ref={group}>
        <mesh
          geometry={built.coreGeo}
          material={built.coreMat}
          position={[0, built.halfH, 0]}
          scale={[built.radius * 0.82, built.halfH * 0.95, built.radius * 0.82]}
        />
        <primitive object={built.grainMesh} />
      </group>
    </group>
  )
}
