import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  CylinderGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import { useGrowth } from '../growthState.js'
import { createRng } from '../../utils/random.js'
import { applyWind } from '../wind.js'

const GREEN = new Color('#93b766')
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const UP = new Vector3(0, 1, 0)
const DOWN = new Vector3(0, -1, 0)

// Espiguilla en forma de lágrima, con la punta hacia abajo (eje -Y).
function teardropGeometry(hi) {
  const pts = []
  const n = hi ? 10 : 6
  for (let i = 0; i <= n; i++) {
    const t = i / n
    // radio: 0 arriba, máximo cerca de 1/3, punta fina abajo
    const r = Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - t * 0.55)
    pts.push(new Vector2(r * 0.5, -t))
  }
  return new LatheGeometry(pts, hi ? 8 : 5)
}

/**
 * Panoja abierta (avena): eje central con verticilos de ramas finas que se abren
 * y espiguillas en lágrima que cuelgan de las puntas.
 */
export default function OpenPanicle({ cropId, length, palette, quality, azimuth = 0 }) {
  const g = useGrowth()
  const group = useRef()

  const built = useMemo(() => {
    const rng = createRng(`panoja-${cropId}`)
    const hi = quality === 'high'
    const whorls = rng.int(5, 7)
    const branches = []
    for (let w = 0; w < whorls; w++) {
      const u = w / (whorls - 1) // 0 abajo, 1 arriba
      const y = (0.08 + 0.84 * u) * length
      const count = w === whorls - 1 ? 2 : rng.int(3, 5)
      const base = rng.range(0, Math.PI * 2)
      for (let b = 0; b < count; b++) {
        branches.push({
          y,
          az: base + (b / count) * Math.PI * 2 + rng.range(-0.3, 0.3),
          len: length * (0.42 - 0.3 * u) * rng.range(0.85, 1.1),
          angle: rng.range(0.85, 1.25) * (1 - 0.35 * u), // apertura máxima desde el eje
          spikelets: u > 0.8 ? 1 : 2,
        })
      }
    }
    const spikeletCount = branches.reduce((a, b) => a + b.spikelets, 0)

    const axisGeo = new CylinderGeometry(0.0008, 0.0014, length, 6, 1)
    axisGeo.translate(0, length / 2, 0)
    const branchGeo = new CylinderGeometry(0.4, 1, 1, 4, 1)
    branchGeo.translate(0, 0.5, 0)
    const spikeletGeo = teardropGeometry(hi)

    const axisMat = applyWind(new MeshStandardMaterial({ color: GREEN.clone(), roughness: 0.6 }))
    const branchMat = applyWind(new MeshStandardMaterial({ color: GREEN.clone(), roughness: 0.6 }))
    const spikeletMat = applyWind(new MeshStandardMaterial({ color: GREEN.clone(), roughness: 0.5 }))

    const branchMesh = new InstancedMesh(branchGeo, branchMat, branches.length)
    const spikeletMesh = new InstancedMesh(spikeletGeo, spikeletMat, spikeletCount)
    spikeletMesh.castShadow = true
    branchMesh.frustumCulled = false
    spikeletMesh.frustumCulled = false

    return { branches, axisGeo, branchGeo, spikeletGeo, axisMat, branchMat, spikeletMat, branchMesh, spikeletMesh, key: -1 }
  }, [cropId, length, quality])

  useEffect(
    () => () => {
      const b = built
      ;[b.axisGeo, b.branchGeo, b.spikeletGeo, b.axisMat, b.branchMat, b.spikeletMat].forEach((x) => x.dispose())
      b.branchMesh.dispose()
      b.spikeletMesh.dispose()
    },
    [built],
  )

  const tmp = useMemo(
    () => ({ m: new Matrix4(), q: new Quaternion(), s: new Vector3(), p: new Vector3(), d: new Vector3(), qd: new Quaternion() }),
    [],
  )
  const ripe = useMemo(() => new Color(palette.maduro), [palette])

  useFrame(() => {
    const { cabeza, grano, madurez } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.002
    if (!grp.visible) return
    grp.scale.setScalar(0.4 + 0.6 * cabeza)

    // Las ramas se abren a medida que la panoja sale; con el grano pesan y caen un poco.
    const open = clamp01((cabeza - 0.2) / 0.8)
    const key = open * 1000 + grano
    if (key !== built.key) {
      built.key = key
      const { m, q, s, p, d, qd } = tmp
      let si = 0
      built.branches.forEach((br, i) => {
        const ang = 0.12 + (br.angle + 0.15 * grano) * open
        d.set(Math.sin(ang) * Math.cos(br.az), Math.cos(ang), -Math.sin(ang) * Math.sin(br.az))
        q.setFromUnitVectors(UP, d)
        p.set(0, br.y, 0)
        s.set(0.00045, br.len, 0.00045)
        m.compose(p, q, s)
        built.branchMesh.setMatrixAt(i, m)
        // Espiguillas colgando de la punta (y una a mitad de rama)
        for (let k = 0; k < br.spikelets; k++) {
          const along = k === 0 ? 1 : 0.62
          const pos = p.clone().addScaledVector(d, br.len * along)
          // cuelgan hacia abajo, apenas inclinadas en la dirección de la rama
          const hang = d.clone().multiplyScalar(0.25).add(DOWN).normalize()
          qd.setFromUnitVectors(DOWN, hang)
          const size = 0.006 + 0.003 * grano
          s.set(size * 0.55, size * 1.9, size * 0.55)
          m.compose(pos, qd, s)
          built.spikeletMesh.setMatrixAt(si++, m)
        }
      })
      built.branchMesh.instanceMatrix.needsUpdate = true
      built.spikeletMesh.instanceMatrix.needsUpdate = true
    }

    const r = clamp01(madurez)
    built.spikeletMat.color.copy(GREEN).lerp(ripe, r)
    built.branchMat.color.copy(GREEN).lerp(ripe, r)
    built.axisMat.color.copy(GREEN).lerp(ripe, r)
  })

  return (
    <group rotation-y={azimuth}>
      <group ref={group}>
        <mesh geometry={built.axisGeo} material={built.axisMat} />
        <primitive object={built.branchMesh} />
        <primitive object={built.spikeletMesh} />
      </group>
    </group>
  )
}
