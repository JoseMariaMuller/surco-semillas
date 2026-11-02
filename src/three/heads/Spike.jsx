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
import { applyWind } from '../wind.js'

// Espiga: raquis recto con espiguillas alternadas a los dos lados.
// awnOpen: cuánto se abren las aristas respecto del raquis (rad).
// bend: cuánto se dobla hacia abajo al madurar (cebada).
const SPIKE_SPEC = {
  trigo: { spikelets: 18, grains: 3, awn: 0.014, awnOpen: 0.26, grain: [0.0027, 0.0052, 0.0023], spread: 0.0027, bend: 0.15 },
  cebada: { spikelets: 22, grains: 1, awn: 0.1, awnOpen: 0.08, grain: [0.0024, 0.0058, 0.002], spread: 0.0022, bend: 1.3 },
  centeno: { spikelets: 30, grains: 2, awn: 0.032, awnOpen: 0.14, grain: [0.0018, 0.0046, 0.0016], spread: 0.0021, bend: 0.35 },
}

const GREEN_HEAD = new Color('#8bb35a')
const ANTHER = new Color('#f2d35b')
const clamp01 = (v) => Math.min(1, Math.max(0, v))

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

// Anteras: asoman y cuelgan de las espiguillas durante la floración.
function setAnthers(built, polen, m, sc) {
  built.pollen = polen
  const k = clamp01(polen * 1.4)
  built.anthers.forEach((a, i) => {
    sc.set(0.0007 * k + 1e-6, 0.0024 * k + 1e-6, 0.0007 * k + 1e-6)
    m.compose(a.pos, a.quat, sc)
    built.antherMesh.setMatrixAt(i, m)
  })
  built.antherMesh.instanceMatrix.needsUpdate = true
}

export default function Spike({ cropId, length, palette, quality, azimuth = 0 }) {
  const g = useGrowth()
  const group = useRef()
  const spec = SPIKE_SPEC[cropId] ?? SPIKE_SPEC.trigo

  const built = useMemo(() => {
    const rng = createRng(`espiga-${cropId}`)
    const hi = quality === 'high'
    const grains = []
    const awns = []
    const anthers = []
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
        const quat = new Quaternion().setFromEuler(rot)
        grains.push({ pos, quat, size: taper })
        // arista desde la punta del grano
        const tip = new Vector3(0, spec.grain[1] * taper, 0).applyQuaternion(quat).add(pos)
        const arot = new Euler(fan * 0.5 + rng.range(-0.05, 0.05), 0, -s * (spec.awnOpen + rng.range(0, 0.1)))
        awns.push({ pos: tip, quat: new Quaternion().setFromEuler(arot), len: spec.awn * (0.75 + 0.25 * taper) })
      }
      // dos anteras por espiguilla, colgando hacia afuera
      for (let a = 0; a < 2; a++) {
        const pos = new Vector3(
          s * (spec.spread * taper + spec.grain[0] * 1.2),
          y - 0.0015 + a * 0.0012,
          (a - 0.5) * spec.spread * 1.4,
        )
        const quat = new Quaternion().setFromEuler(new Euler(rng.range(-0.3, 0.3), 0, s * rng.range(0.1, 0.4)))
        anthers.push({ pos, quat })
      }
    }

    const grainGeo = new SphereGeometry(1, hi ? 10 : 7, hi ? 8 : 5)
    const antherGeo = new SphereGeometry(1, 6, 4)
    const awnGeo = new CylinderGeometry(0.4, 1, 1, 3, 1)
    awnGeo.translate(0, 0.5, 0)
    const rachisGeo = new CylinderGeometry(0.0009, 0.0013, length, 6, 1)
    rachisGeo.translate(0, length / 2, 0)

    const grainMat = applyWind(new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.55 }))
    const awnMat = applyWind(new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.7 }))
    const rachisMat = applyWind(new MeshStandardMaterial({ color: GREEN_HEAD.clone(), roughness: 0.6 }))
    const antherMat = applyWind(new MeshStandardMaterial({ color: ANTHER, roughness: 0.5, emissive: '#5a4a10', emissiveIntensity: 0.3 }))

    const grainMesh = new InstancedMesh(grainGeo, grainMat, grains.length)
    const awnMesh = new InstancedMesh(awnGeo, awnMat, awns.length)
    const antherMesh = new InstancedMesh(antherGeo, antherMat, anthers.length)
    grainMesh.castShadow = true
    for (const im of [grainMesh, awnMesh, antherMesh]) im.frustumCulled = false
    antherMesh.visible = false

    const m = new Matrix4()
    awns.forEach((a, i) => {
      m.compose(a.pos, a.quat, new Vector3(0.00022, a.len, 0.00022))
      awnMesh.setMatrixAt(i, m)
    })
    awnMesh.instanceMatrix.needsUpdate = true

    const out = {
      grains, anthers, grainGeo, antherGeo, awnGeo, rachisGeo, grainMat, awnMat, rachisMat, antherMat,
      grainMesh, awnMesh, antherMesh, fill: -1, pollen: -1,
    }
    setGrainFill(out, spec, 0, m, new Vector3())
    setAnthers(out, 0, m, new Vector3())
    return out
  }, [cropId, length, quality, spec])

  useEffect(
    () => () => {
      const b = built
      ;[b.grainGeo, b.antherGeo, b.awnGeo, b.rachisGeo, b.grainMat, b.awnMat, b.rachisMat, b.antherMat].forEach((x) =>
        x.dispose(),
      )
      b.grainMesh.dispose()
      b.awnMesh.dispose()
      b.antherMesh.dispose()
    },
    [built],
  )

  const ripe = useMemo(() => new Color(palette.maduro), [palette])
  const grainRipe = useMemo(() => new Color(palette.grano).lerp(new Color(palette.maduro), 0.6), [palette])
  const m = useMemo(() => new Matrix4(), [])
  const sc = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const { cabeza, grano, madurez, polen } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.002
    if (!grp.visible) return
    // emerge de la vaina: crece desde la base
    grp.scale.set(0.6 + 0.4 * cabeza, Math.max(cabeza, 0.001), 0.6 + 0.4 * cabeza)
    // la cebada se dobla con el peso del grano; las otras apenas se inclinan
    grp.rotation.z = -spec.bend * clamp01(madurez * 1.1) * clamp01(grano)

    if (Math.abs(grano - built.fill) > 1e-4) setGrainFill(built, spec, grano, m, sc)
    built.antherMesh.visible = polen > 0.01
    if (built.antherMesh.visible && Math.abs(polen - built.pollen) > 1e-4) setAnthers(built, polen, m, sc)

    const r = clamp01(madurez)
    built.grainMat.color.copy(GREEN_HEAD).lerp(grainRipe, r)
    built.awnMat.color.copy(GREEN_HEAD).lerp(ripe, clamp01(r * 1.2))
    built.rachisMat.color.copy(GREEN_HEAD).lerp(ripe, r)
  })

  return (
    <group rotation-y={azimuth}>
      <group ref={group}>
        <mesh geometry={built.rachisGeo} material={built.rachisMat} />
        <primitive object={built.grainMesh} />
        <primitive object={built.awnMesh} />
        <primitive object={built.antherMesh} />
      </group>
    </group>
  )
}
