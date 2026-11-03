import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, InstancedMesh, Matrix4, MeshStandardMaterial, SphereGeometry, TubeGeometry } from 'three'
import { useGrowth } from '../growthState.js'

const IVORY = new Color('#e9dcc0')
const NODULE = new Color('#d9b3a0')
const NODULE_R = 0.0018
const TIP = new Color('#fffaf0')

// Tubo con grosor decreciente y color que se aclara hacia la punta.
function rootTube(curve, segments, radius, radial) {
  const g = new TubeGeometry(curve, segments, radius, radial, false)
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const ring = radial + 1
  const c = new Color()
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const p = curve.getPointAt(u)
    const taper = 1 - 0.65 * u
    c.copy(IVORY).lerp(TIP, Math.pow(u, 3))
    for (let j = 0; j < ring; j++) {
      const k = i * ring + j
      pos.setXYZ(
        k,
        p.x + (pos.getX(k) - p.x) * taper,
        p.y + (pos.getY(k) - p.y) * taper,
        p.z + (pos.getZ(k) - p.z) * taper,
      )
      colors[k * 3] = c.r
      colors[k * 3 + 1] = c.g
      colors[k * 3 + 2] = c.b
    }
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  g.computeVertexNormals()
  g.setDrawRange(0, 0)
  g.userData.perSegment = radial * 6
  g.userData.segments = segments
  return g
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Devuelve la fracción efectivamente dibujada (múltiplo de un segmento).
function reveal(geo, frac) {
  const n = Math.round(frac * geo.userData.segments)
  geo.setDrawRange(0, n * geo.userData.perSegment)
  return n / geo.userData.segments
}

export default function Roots({ layout, quality }) {
  const g = useGrowth()
  const tips = useRef([])

  const built = useMemo(() => {
    const hi = quality === 'high'
    const R = layout.m.stemR > 0.006 ? 0.0011 : 0.00065
    const material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      emissive: '#3a2c18',
      emissiveIntensity: 0.35,
    })
    const tipMat = new MeshStandardMaterial({ color: TIP, roughness: 0.4, emissive: '#5a4a30', emissiveIntensity: 0.4 })
    const tipGeo = new SphereGeometry(1, 10, 8)
    // Las laterales de la raíz pivotante son algo más gruesas que las raicillas de los cereales
    const latR = layout.crop.tipo === 'dicotiledonea' ? 0.55 : 0.45
    const roots = layout.roots.map((r) => ({
      ...r,
      geo: rootTube(r.curve, hi ? 140 : 70, R * r.radius, hi ? 6 : 4),
      lats: r.laterals.map((l) => ({
        ...l,
        geo: rootTube(l.curve, hi ? 12 : 6, R * latR, hi ? 4 : 3),
      })),
    }))
    // Nódulos (soja): bolitas sobre las laterales de arriba
    let nodules = null
    if (layout.nodules.length) {
      const geo = new SphereGeometry(1, hi ? 10 : 6, hi ? 8 : 5)
      const mat = new MeshStandardMaterial({ color: NODULE, roughness: 0.5, emissive: '#4a3020', emissiveIntensity: 0.3 })
      const mesh = new InstancedMesh(geo, mat, layout.nodules.length)
      mesh.frustumCulled = false
      nodules = { geo, mat, mesh, m: new Matrix4() }
    }
    return { roots, material, tipMat, tipGeo, R, nodules, last: -1 }
  }, [layout, quality])

  useEffect(
    () => () => {
      built.material.dispose()
      built.tipMat.dispose()
      built.tipGeo.dispose()
      if (built.nodules) {
        built.nodules.geo.dispose()
        built.nodules.mat.dispose()
        built.nodules.mesh.dispose()
      }
      built.roots.forEach((r) => {
        r.geo.dispose()
        r.lats.forEach((l) => l.geo.dispose())
      })
    },
    [built],
  )

  useFrame(() => {
    const raiz = g.g.raiz
    if (raiz === built.last) return
    built.last = raiz
    built.roots.forEach((r, i) => {
      // Arranque lento: en germinación solo asoma la radícula.
      const frac = Math.pow(clamp01((raiz - r.delay) / (1 - r.delay)), 1.5)
      const drawn = reveal(r.geo, frac)
      const tip = tips.current[i]
      if (tip) {
        tip.visible = drawn > 0
        if (tip.visible) {
          tip.position.copy(r.curve.getPointAt(Math.min(drawn, 1)))
          const rad = built.R * r.radius * (1 - 0.65 * drawn) * 0.95
          tip.scale.setScalar(rad)
        }
      }
      r.lats.forEach((l) => reveal(l.geo, clamp01((frac - l.u - 0.06) / 0.3)))
    })
    const nod = built.nodules
    if (nod) {
      // aparecen en V2 (raiz 0,5) y terminan de crecer en V5
      const k = clamp01((raiz - 0.4) / 0.3) * NODULE_R
      nod.mesh.visible = k > 1e-5
      layout.nodules.forEach((p, i) => {
        // cada nódulo con su tamaño, entre 0,7 y 1,3 del radio
        nod.m.makeScale(k * (0.7 + ((i * 37) % 7) / 10), k, k * (0.7 + ((i * 37) % 7) / 10)).setPosition(p)
        nod.mesh.setMatrixAt(i, nod.m)
      })
      nod.mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {built.nodules && <primitive object={built.nodules.mesh} />}
      {built.roots.map((r, i) => (
        <group key={i}>
          <mesh geometry={r.geo} material={built.material} frustumCulled={false} />
          <mesh
            ref={(el) => {
              tips.current[i] = el
            }}
            geometry={built.tipGeo}
            material={built.tipMat}
            visible={false}
          />
          {r.lats.map((l, k) => (
            <mesh key={k} geometry={l.geo} material={built.material} frustumCulled={false} />
          ))}
        </group>
      ))}
    </group>
  )
}
