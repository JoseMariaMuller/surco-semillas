import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { useGrowth } from '../growthState.js'
import { createRng } from '../../utils/random.js'

// Espiga: raquis recto con espiguillas alternadas a los dos lados.
const SPIKE_SPEC = {
  trigo: { spikelets: 18, grains: 3, awn: 0.014, grain: [0.0027, 0.0052, 0.0023], spread: 0.0027 },
  cebada: { spikelets: 22, grains: 1, awn: 0.11, grain: [0.0021, 0.0052, 0.0019], spread: 0.0024 },
  centeno: { spikelets: 30, grains: 2, awn: 0.035, grain: [0.0016, 0.0042, 0.0015], spread: 0.0026 },
}

const GREEN_HEAD = new Color('#8bb35a')

// Tamaño de cada grano según el llenado (0..1).
function setGrainFill(built, spec, grano, m, sc) {
  built.fill = grano
  const k = 0.62 + 0.38 * grano
  built.grains.forEach((gr, i) => {
    sc.set(spec.grain[0] * gr.size * k, spec.grain[1] * gr.size * (0.85 + 0.15 * grano), spec.grain[2] * gr.size * k)
    m.compose(gr.pos, gr.quat, sc)
    built.grainMesh.setMatrixAt(i, m)
  })
  built.grainMesh.instanceMatrix.needsUpdate = true
}
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function Spike({ cropId, length, palette, quality, azimuth = 0 }) {
  const g = useGrowth()
  const group = useRef()
  const spec = SPIKE_SPEC[cropId] ?? SPIKE_SPEC.trigo

  const built = useMemo(() => {
    const rng = createRng(`espiga-${cropId}`)
    const hi = quality === 'high'
    const grains = []
    const awns = []
    const n = spec.spikelets
    for (let j = 0; j < n; j++) {
      const s = j % 2 === 0 ? 1 : -1
      const u = (j + 0.5) / n
      const y = u * length * 0.96 + 0.002
      const taper = 0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, u * 1.1))
      for (let i = 0; i < spec.grains; i++) {
        const fan = spec.grains === 1 ? 0 : i / (spec.grains - 1) - 0.5 // -0.5..0.5
        const pos = new Vector3(s * spec.spread * taper, y + Math.abs(fan) * 0.002, fan * spec.spread * 1.6 * taper)
        const rot = new Euler(fan * 0.6, 0, -s * (0.32 + rng.range(-0.05, 0.05)))
        grains.push({ pos, quat: new Quaternion().setFromEuler(rot), size: taper })
        // arista desde la punta del grano, más abierta
        const tip = new Vector3(0, spec.grain[1] * taper, 0).applyQuaternion(grains.at(-1).quat).add(pos)
        const arot = new Euler(fan * 0.7 + rng.range(-0.06, 0.06), 0, -s * (0.18 + rng.range(0, 0.14)))
        awns.push({ pos: tip, quat: new Quaternion().setFromEuler(arot), len: spec.awn * (0.75 + 0.25 * taper) })
      }
    }

    const grainGeo = new SphereGeometry(1, hi ? 10 : 7, hi ? 8 : 5)
    const awnGeo = new CylinderGeometry(0.4, 1, 1, 3, 1)
    awnGeo.translate(0, 0.5, 0)
    const rachisGeo = new CylinderGeometry(0.0009, 0.0013, length, 6, 1)
    rachisGeo.translate(0, length / 2, 0)

    const grainMat = new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.55 })
    const awnMat = new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.7 })
    const rachisMat = new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.6 })

    const grainMesh = new InstancedMesh(grainGeo, grainMat, grains.length)
    const awnMesh = new InstancedMesh(awnGeo, awnMat, awns.length)
    grainMesh.castShadow = true
    awnMesh.frustumCulled = false
    grainMesh.frustumCulled = false

    const m = new Matrix4()
    awns.forEach((a, i) => {
      m.compose(a.pos, a.quat, new Vector3(0.00022, a.len, 0.00022))
      awnMesh.setMatrixAt(i, m)
    })
    awnMesh.instanceMatrix.needsUpdate = true

    const out = { grains, grainGeo, awnGeo, rachisGeo, grainMat, awnMat, rachisMat, grainMesh, awnMesh, fill: -1 }
    setGrainFill(out, spec, 0, m, new Vector3())
    return out
  }, [cropId, length, quality, spec])

  useEffect(
    () => () => {
      const b = built
      ;[b.grainGeo, b.awnGeo, b.rachisGeo, b.grainMat, b.awnMat, b.rachisMat].forEach((x) => x.dispose())
      b.grainMesh.dispose()
      b.awnMesh.dispose()
    },
    [built],
  )

  const ripe = useMemo(() => new Color(palette.maduro), [palette])
  const grainRipe = useMemo(() => new Color(palette.grano).lerp(new Color(palette.maduro), 0.6), [palette])
  const m = useMemo(() => new Matrix4(), [])
  const sc = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const { cabeza, grano, madurez } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.002
    if (!grp.visible) return
    // emerge de la vaina: crece desde la base
    grp.scale.set(0.6 + 0.4 * cabeza, Math.max(cabeza, 0.001), 0.6 + 0.4 * cabeza)

    if (Math.abs(grano - built.fill) > 1e-4) setGrainFill(built, spec, grano, m, sc)

    const r = clamp01(madurez)
    built.grainMat.color.copy(GREEN_HEAD).lerp(grainRipe, r)
    built.awnMat.color.copy(GREEN_HEAD).lerp(ripe, clamp01(r * 1.2))
    built.rachisMat.color.copy(GREEN_HEAD).lerp(ripe, r)
  })

  return (
    <group ref={group} rotation-y={azimuth}>
      <mesh geometry={built.rachisGeo} material={built.rachisMat} />
      <primitive object={built.grainMesh} />
      <primitive object={built.awnMesh} />
    </group>
  )
}
