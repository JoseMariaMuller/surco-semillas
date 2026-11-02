import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
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
import { EAR } from '../plantLayout.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const UP = new Vector3(0, 1, 0)

/* ---------------------------------- Panoja ---------------------------------- */

const TASSEL_GREEN = new Color('#b8b86a')

/** Panoja del maíz: eje central y 8 a 12 ramas finas que se abren y caen en la punta. */
export function Tassel({ length, palette, quality, azimuth = 0 }) {
  const g = useGrowth()
  const group = useRef()

  const built = useMemo(() => {
    const rng = createRng('panoja-maiz')
    const n = rng.int(8, 12)
    const branches = []
    for (let i = 0; i < n; i++) {
      branches.push({
        y: length * (0.05 + 0.4 * (i / n)) + rng.range(-0.005, 0.005),
        az: i * 2.4 + rng.range(-0.2, 0.2),
        len: length * rng.range(0.45, 0.62) * (1 - 0.35 * (i / n)),
        angle: rng.range(0.5, 0.85),
        droop: rng.range(0.5, 0.9),
      })
    }
    const axisGeo = new CylinderGeometry(0.0016, 0.003, length, quality === 'high' ? 8 : 5, 1)
    axisGeo.translate(0, length / 2, 0)
    const segGeo = new CylinderGeometry(0.6, 1, 1, 4, 1)
    segGeo.translate(0, 0.5, 0)
    const mat = applyWind(new MeshStandardMaterial({ color: TASSEL_GREEN.clone(), roughness: 0.6 }))
    // dos tramos por rama: el primero sube y se abre, el segundo cae
    const segMesh = new InstancedMesh(segGeo, mat, n * 2)
    segMesh.frustumCulled = false
    segMesh.castShadow = true
    return { branches, axisGeo, segGeo, mat, segMesh, key: -1 }
  }, [length, quality])

  useEffect(
    () => () => {
      built.axisGeo.dispose()
      built.segGeo.dispose()
      built.mat.dispose()
      built.segMesh.dispose()
    },
    [built],
  )

  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), s: new Vector3(), p: new Vector3(), d: new Vector3() }), [])
  const ripe = useMemo(() => new Color(palette.maduro), [palette])

  useFrame(() => {
    const { cabeza, madurez } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.002
    if (!grp.visible) return
    grp.scale.set(0.5 + 0.5 * cabeza, Math.max(cabeza, 0.001), 0.5 + 0.5 * cabeza)
    const open = clamp01((cabeza - 0.3) / 0.7)
    if (open !== built.key) {
      built.key = open
      const { m, q, s, p, d } = tmp
      built.branches.forEach((b, i) => {
        const a1 = b.angle * open + 0.08
        d.set(Math.sin(a1) * Math.cos(b.az), Math.cos(a1), -Math.sin(a1) * Math.sin(b.az))
        q.setFromUnitVectors(UP, d)
        p.set(0, b.y, 0)
        s.set(0.0012, b.len * 0.55, 0.0012)
        m.compose(p, q, s)
        built.segMesh.setMatrixAt(i * 2, m)
        // segundo tramo, desde la punta del primero, más caído
        p.addScaledVector(d, b.len * 0.55)
        const a2 = a1 + b.droop * open
        d.set(Math.sin(a2) * Math.cos(b.az), Math.cos(a2), -Math.sin(a2) * Math.sin(b.az))
        q.setFromUnitVectors(UP, d)
        s.set(0.0009, b.len * 0.45, 0.0009)
        m.compose(p, q, s)
        built.segMesh.setMatrixAt(i * 2 + 1, m)
      })
      built.segMesh.instanceMatrix.needsUpdate = true
    }
    built.mat.color.copy(TASSEL_GREEN).lerp(ripe, clamp01(madurez))
  })

  return (
    <group rotation-y={azimuth}>
      <group ref={group}>
        <mesh geometry={built.axisGeo} material={built.mat} castShadow />
        <primitive object={built.segMesh} />
      </group>
    </group>
  )
}

/* ---------------------------------- Choclo ---------------------------------- */

const HUSK_GREEN = new Color('#7ea24e')
const SILK_GREEN = new Color('#cfd88c')
const SILK_RED = new Color('#b9493a')
const SILK_BROWN = new Color('#5e3b22')
const KERNEL_MILK = new Color('#f2e1a0')
const HUSK_COUNT = 8

// Radio del choclo a lo largo de su eje (v de 0 a 1): se afina hacia la punta.
const earRadius = (v) => EAR.radius * (1 - 0.38 * v * v)

// Hoja de chala: cinta curva que envuelve parte del choclo y se cierra en la punta.
function huskGeometry(hi) {
  const nv = hi ? 14 : 8
  const nw = hi ? 5 : 3
  const span = 0.62 // medio ancho angular (rad)
  const total = EAR.len + 0.045
  const pos = []
  const idx = []
  for (let i = 0; i <= nv; i++) {
    const v = i / nv
    const y = v * total
    const ev = Math.min(1, y / EAR.len)
    // Siempre por fuera de los granos; solo se cierra después de la punta
    let r = earRadius(ev) + 0.0045
    if (y > EAR.len) r *= Math.max(0.12, 1 - (y - EAR.len) / (total - EAR.len))
    const w = span * (y > EAR.len ? 1 - ((y - EAR.len) / (total - EAR.len)) * 0.7 : 1)
    for (let j = 0; j <= nw; j++) {
      const phi = -w + (2 * w * j) / nw
      pos.push(r * Math.cos(phi), y, r * Math.sin(phi))
    }
  }
  for (let i = 0; i < nv; i++) {
    for (let j = 0; j < nw; j++) {
      const a = i * (nw + 1) + j
      const b = a + nw + 1
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Choclo envuelto en chala, con barba en la punta; al llenar, la chala se abre y se ven los granos. */
export function Ear({ palette, quality, stemR }) {
  const g = useGrowth()
  const group = useRef()
  const huskRefs = useRef([])

  const built = useMemo(() => {
    const rng = createRng('choclo')
    const hi = quality === 'high'
    const base = EAR.shank

    // Granos: 16 hileras de ~40
    const rows = 16
    const perRow = hi ? 40 : 26
    const kernels = []
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < perRow; k++) {
        const v = (k + 0.5) / perRow
        const ang = (r / rows) * Math.PI * 2 + (k % 2) * (Math.PI / rows)
        const rad = earRadius(v)
        kernels.push({
          pos: new Vector3(Math.cos(ang) * rad * 0.9, base + 0.006 + v * (EAR.len - 0.012), Math.sin(ang) * rad * 0.9),
          quat: new Quaternion().setFromEuler(new Euler(0, -ang, 0)),
          w: (Math.PI * 2 * rad) / rows,
          h: (EAR.len - 0.012) / perRow,
        })
      }
    }

    // Barba: decenas de hilos finos que salen de la punta
    const silks = []
    for (let i = 0; i < (hi ? 46 : 28); i++) {
      const a = rng.range(0, Math.PI * 2)
      const spread = rng.range(0.15, 1.25)
      const dir = new Vector3(Math.sin(spread) * Math.cos(a), Math.cos(spread), Math.sin(spread) * Math.sin(a))
      silks.push({ dir, len: rng.range(0.035, 0.085), off: new Vector3(rng.range(-0.002, 0.002), 0, rng.range(-0.002, 0.002)) })
    }

    // Hojas de chala, repartidas alrededor; las que miran a la cámara se abren más.
    const husks = Array.from({ length: HUSK_COUNT }, (_, i) => {
      const a = (i / HUSK_COUNT) * Math.PI * 2 + rng.range(-0.1, 0.1)
      // ángulo -π/4 en este marco apunta hacia la cámara de las etapas 7 y 8
      const facing = Math.cos(a + Math.PI / 4)
      return { a, openMax: facing > 0.3 ? rng.range(0.7, 1.05) : rng.range(0.05, 0.18) }
    })

    const kernelGeo = new SphereGeometry(1, hi ? 7 : 5, hi ? 5 : 4)
    const silkGeo = new CylinderGeometry(0.5, 1, 1, 3, 1)
    silkGeo.translate(0, 0.5, 0)
    const shankGeo = new CylinderGeometry(stemR * 0.45, stemR * 0.55, base, 8, 1)
    shankGeo.translate(0, base / 2, 0)
    const cobGeo = new CylinderGeometry(EAR.radius * 0.55, EAR.radius * 0.82, EAR.len * 0.98, hi ? 14 : 8, 1)
    cobGeo.translate(0, base + EAR.len * 0.49, 0)
    const huskGeo = huskGeometry(hi)

    const kernelMat = applyWind(new MeshStandardMaterial({ color: KERNEL_MILK.clone(), roughness: 0.35 }))
    const silkMat = applyWind(new MeshStandardMaterial({ color: SILK_GREEN.clone(), roughness: 0.7 }))
    const huskMat = applyWind(new MeshStandardMaterial({ color: HUSK_GREEN.clone(), roughness: 0.6, side: DoubleSide }))
    const cobMat = applyWind(new MeshStandardMaterial({ color: KERNEL_MILK.clone(), roughness: 0.5 }))

    const kernelMesh = new InstancedMesh(kernelGeo, kernelMat, kernels.length)
    kernelMesh.frustumCulled = false
    // Los granos no se copian en las plantas vecinas: desde lejos alcanza con el marlo.
    kernelMesh.userData.noMirror = true
    const silkMesh = new InstancedMesh(silkGeo, silkMat, silks.length)
    silkMesh.frustumCulled = false

    const m = new Matrix4()
    const q = new Quaternion()
    const top = new Vector3(0, base + EAR.len + 0.04, 0)
    silks.forEach((s, i) => {
      q.setFromUnitVectors(UP, s.dir)
      m.compose(top.clone().add(s.off), q, new Vector3(0.00035, s.len, 0.00035))
      silkMesh.setMatrixAt(i, m)
    })
    silkMesh.instanceMatrix.needsUpdate = true

    return {
      kernels, husks, kernelGeo, silkGeo, shankGeo, cobGeo, huskGeo,
      kernelMat, silkMat, huskMat, cobMat, kernelMesh, silkMesh, fill: -1,
    }
  }, [quality, stemR])

  useEffect(
    () => () => {
      const b = built
      ;[b.kernelGeo, b.silkGeo, b.shankGeo, b.cobGeo, b.huskGeo, b.kernelMat, b.silkMat, b.huskMat, b.cobMat].forEach((x) =>
        x.dispose(),
      )
      b.kernelMesh.dispose()
      b.silkMesh.dispose()
    },
    [built],
  )

  const tmp = useMemo(() => ({ m: new Matrix4(), s: new Vector3() }), [])
  const kernelRipe = useMemo(() => new Color(palette.grano), [palette])
  const huskRipe = useMemo(() => new Color(palette.maduro), [palette])

  useFrame(() => {
    const { cabeza, polen, grano, madurez } = g.g
    const grp = group.current
    grp.visible = cabeza > 0.01
    if (!grp.visible) return
    grp.scale.setScalar(0.35 + 0.65 * cabeza)

    // Granos que engordan con el llenado
    if (Math.abs(grano - built.fill) > 1e-4) {
      built.fill = grano
      const { m, s } = tmp
      const k = 0.55 + 0.45 * grano
      built.kernels.forEach((kn, i) => {
        s.set(0.0042 * k, kn.h * 0.58, kn.w * 0.52 * k)
        m.compose(kn.pos, kn.quat, s)
        built.kernelMesh.setMatrixAt(i, m)
      })
      built.kernelMesh.instanceMatrix.needsUpdate = true
    }

    // La chala se abre en parte durante el llenado y la madurez
    const open = clamp01((grano - 0.35) / 0.65) * (0.65 + 0.35 * madurez)
    built.husks.forEach((h, i) => {
      const el = huskRefs.current[i]
      if (el) el.rotation.z = -h.openMax * open
    })

    // Barba: verde, rojiza en floración y marrón cuando el grano se llena
    const silkOut = clamp01((cabeza - 0.5) / 0.5)
    built.silkMesh.visible = silkOut > 0.01
    built.silkMat.color
      .copy(SILK_GREEN)
      .lerp(SILK_RED, clamp01(polen * 1.4 + grano * 0.6))
      .lerp(SILK_BROWN, clamp01((grano - 0.25) / 0.6))

    const kc = clamp01(grano * 0.6 + madurez * 0.8)
    built.kernelMat.color.copy(KERNEL_MILK).lerp(kernelRipe, kc)
    built.cobMat.color.copy(built.kernelMat.color)
    built.huskMat.color.copy(HUSK_GREEN).lerp(huskRipe, clamp01(madurez * 1.1))
  })

  return (
    <group position-x={stemR}>
      <group ref={group} rotation-z={-EAR.tilt}>
        <mesh geometry={built.shankGeo} material={built.huskMat} />
        <mesh geometry={built.cobGeo} material={built.cobMat} />
        <primitive object={built.kernelMesh} />
        <primitive object={built.silkMesh} />
        {built.husks.map((h, i) => (
          <group key={i} position-y={EAR.shank} rotation-y={h.a}>
            <mesh
              ref={(el) => {
                huskRefs.current[i] = el
              }}
              geometry={built.huskGeo}
              material={built.huskMat}
              castShadow
            />
          </group>
        ))}
      </group>
    </group>
  )
}
