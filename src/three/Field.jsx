import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../utils/random.js'
import { useGrowth } from './growthState.js'
import { createLeafGeometry, shapeLeaf } from './parts/leafGeometry.js'
import { createBroadLeafGeometry, shapeBroadLeaf } from './dicot/broadLeafGeometry.js'
import { neighborDistance } from './plantLayout.js'
import { applyWind } from './wind.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Deja cada parte con los mismos atributos (posición, normal, color) y sin índice.
function prep(geo, color, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  g.deleteAttribute('uv')
  if (matrix) g.applyMatrix4(matrix)
  const n = g.attributes.position.count
  const shade = g.attributes.color
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const k = shade ? shade.getX(i) : 1
    col[i * 3] = color.r * k
    col[i * 3 + 1] = color.g * k
    col[i * 3 + 2] = color.b * k
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  if (!g.attributes.normal) g.computeVertexNormals()
  return g
}

const M = (pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], order = 'XYZ') =>
  new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot, order)), new Vector3(...scale))

/** Girasol maduro: tallo, dos hojas secas colgando y el capítulo caído, de dorso marrón. */
function simpleSunflower(crop, layout, rng) {
  const { stemLen, m } = layout
  const straw = new Color(crop.paleta.maduro)
  const parts = [prep(new CylinderGeometry(m.stemR * 0.5, m.stemR * 0.9, stemLen, 4, 1), straw, M([0, stemLen / 2, 0]))]
  for (const f of [0.35, 0.6]) {
    const lg = createBroadLeafGeometry(4, 'acorazonada')
    shapeBroadLeaf(lg, { blade: 0.2, ratio: 0.8, droop: 1.7, fold: 0.15 }, 1, 1)
    parts.push(prep(lg, straw.clone().multiplyScalar(0.8), M([0, f * stemLen, 0], [0, rng.range(0, 6.28), 0])))
  }
  // capítulo colgando adelante del tallo, mirando al suelo
  const R = m.disc / 2
  const disc = new CylinderGeometry(R, R * 0.9, 0.03, 8, 1)
  parts.push(prep(disc, new Color('#6b4a2c'), M([0.07, stemLen + 0.02, 0], [0, 0, 0.35])))
  return parts
}

/** Soja madura: tallo y ramas sin hojas, con racimos de vainas tostadas. */
function simpleSoy(crop, layout, rng) {
  const { stemLen, m } = layout
  const straw = new Color(crop.paleta.maduro)
  const pod = straw.clone().multiplyScalar(0.85)
  const parts = [prep(new CylinderGeometry(m.stemR * 0.6, m.stemR, stemLen, 3, 1), straw, M([0, stemLen / 2, 0]))]
  for (let b = 0; b < 3; b++) {
    const len = stemLen * 0.4
    const br = new CylinderGeometry(m.stemR * 0.4, m.stemR * 0.6, len, 3, 1)
    br.translate(0, len / 2, 0)
    parts.push(prep(br, straw, M([0, stemLen * (0.15 + b * 0.08), 0], [0, b * 2.1 + rng.range(-0.3, 0.3), 0.6], [1, 1, 1], 'YZX')))
  }
  // racimos de vainas en los nudos
  for (let k = 0; k < 8; k++) {
    const y = stemLen * (0.2 + k * 0.1)
    const a = k * 2.4
    parts.push(prep(new SphereGeometry(1, 4, 2), pod, M([Math.cos(a) * 0.02, y - 0.015, -Math.sin(a) * 0.02], [0, a, -1.2], [0.022, 0.006, 0.005], 'YZX')))
  }
  return parts
}

/** Planta madura simplificada: pocos polígonos, colores ya secos. */
function simplePlant(crop, layout, rng) {
  if (crop.tipo === 'dicotiledonea') {
    const parts = crop.cabeza === 'capitulo' ? simpleSunflower(crop, layout, rng) : simpleSoy(crop, layout, rng)
    const merged = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return merged
  }
  const { stemLen, headLen, m } = layout
  const pal = crop.paleta
  const straw = new Color(pal.maduro)
  const leafDry = new Color(pal.maduro).multiplyScalar(0.82)
  const grain = new Color(pal.grano).lerp(new Color(pal.maduro), crop.id === 'sorgo' ? 0 : 0.5)
  const parts = []
  const r = Math.max(m.stemR, 0.0025)

  parts.push(prep(new CylinderGeometry(r * 0.7, r, stemLen, 3, 1), straw, M([0, stemLen / 2, 0])))

  // Algunas hojas, ya abiertas y caídas
  const picks = crop.id === 'maiz' ? [4, 7, 10] : crop.id === 'sorgo' ? [3, 6] : [2, 5]
  for (const k of picks) {
    const leaf = layout.leaves[Math.min(k, layout.leaves.length - 1)]
    const lg = createLeafGeometry(4)
    shapeLeaf(lg, { ...leaf, curl: leaf.curl + 0.3, offset: r }, 1, 1)
    const y = leaf.node * stemLen
    parts.push(prep(lg, leafDry, M([0, y, 0], [0, leaf.azimuth + rng.range(-0.3, 0.3), 0])))
  }

  // Cabeza según el cultivo
  const top = stemLen
  if (crop.cabeza === 'espiga') {
    const thin = crop.id === 'centeno' ? 0.75 : 1
    const head = new CylinderGeometry(0.0045 * thin, 0.0065 * thin, headLen, 4, 1)
    head.translate(0, headLen / 2, 0)
    // la cebada madura cuelga
    const bend = crop.id === 'cebada' ? -1.7 : rng.range(-0.25, 0.1)
    parts.push(prep(head, grain, M([0, top, 0], [0, rng.range(0, 6.28), bend], [1, 1, 1], 'YZX')))
  } else if (crop.cabeza === 'panoja-abierta') {
    parts.push(prep(new CylinderGeometry(0.001, 0.0015, headLen, 3, 1), straw, M([0, top + headLen / 2, 0])))
    for (let i = 0; i < 5; i++) {
      const b = new CylinderGeometry(0.0012, 0.002, headLen * 0.45, 3, 1)
      b.translate(0, headLen * 0.225, 0)
      parts.push(prep(b, grain, M([0, top + headLen * (0.1 + i * 0.16), 0], [0, i * 2.4, 1.0], [1, 1, 1], 'YZX')))
    }
  } else if (crop.cabeza === 'panoja-compacta') {
    parts.push(prep(new SphereGeometry(1, 6, 5), grain, M([0, top + headLen / 2, 0], [0, 0, 0], [0.045, headLen / 2, 0.045])))
  } else {
    // maíz: panoja arriba y choclo a media altura
    for (let i = 0; i < 4; i++) {
      const b = new CylinderGeometry(0.0015, 0.002, headLen * 0.6, 3, 1)
      b.translate(0, headLen * 0.3, 0)
      parts.push(prep(b, straw, M([0, top + headLen * 0.2, 0], [0, i * 1.6, 0.55], [1, 1, 1], 'YZX')))
    }
    parts.push(prep(new CylinderGeometry(0.002, 0.003, headLen, 3, 1), straw, M([0, top + headLen / 2, 0])))
    const ear = new SphereGeometry(1, 6, 4)
    parts.push(prep(ear, straw.clone().multiplyScalar(0.95), M([0.03, crop.H * 0.45, 0], [0, rng.range(0, 6.28), -0.45], [0.026, 0.11, 0.026], 'YZX')))
  }

  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return merged
}

/** Parcela: varias hileras de plantas simplificadas fusionadas en una sola geometría. */
function patchGeometry(crop, layout) {
  const rng = createRng(`parcela-${crop.id}`)
  const variants = [0, 1, 2].map(() => simplePlant(crop, layout, rng))
  const rows = Math.max(3, Math.round(1.4 / crop.surco))
  const len = crop.H > 2 ? 2.6 : 1.4
  const along = Math.max(1 / (crop.densidad * crop.surco), crop.H > 2 ? 0.25 : 0.24)
  const perRow = Math.max(2, Math.round(len / along))
  const geos = []
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < perRow; k++) {
      const s = rng.range(0.85, 1.1)
      const mtx = M(
        [(r - (rows - 1) / 2) * crop.surco + rng.range(-0.01, 0.01), 0, (k + rng.range(0.1, 0.9)) * (len / perRow) - len / 2],
        [rng.range(-0.06, 0.06), rng.range(0, Math.PI * 2), rng.range(-0.06, 0.06)],
        [s, s * rng.range(0.9, 1.05), s],
      )
      geos.push(variants[(r + k) % 3].clone().applyMatrix4(mtx))
    }
  }
  const patch = mergeGeometries(geos)
  geos.forEach((g) => g.dispose())
  variants.forEach((g) => g.dispose())
  return { patch, width: rows * crop.surco, len }
}

/**
 * La hectárea: parcelas instanciadas alrededor del rizotrón, por fuera del cultivo
 * vecino detallado. Aparecen de adentro hacia afuera cuando `campo` sube.
 */
export default function Field({ crop, layout, quality, neighborReach }) {
  const g = useGrowth()

  const built = useMemo(() => {
    const { patch, width, len } = patchGeometry(crop, layout)
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
