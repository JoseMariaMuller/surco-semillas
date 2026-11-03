import { BufferAttribute, Color, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../utils/random.js'
import { createLeafGeometry, shapeLeaf } from './parts/leafGeometry.js'
import { createBroadLeafGeometry, shapeBroadLeaf } from './dicot/broadLeafGeometry.js'

// Parcelas de la hectárea: plantas maduras simplificadas, fusionadas en una geometría.

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

/**
 * Soja madura: un arbusto de tallo y ramas sin hojas, cargado de racimos de vainas
 * tostadas. Más grueso y más claro que la planta real, para que el lote se lea de lejos.
 */
function simpleSoy(crop, layout, rng) {
  const { stemLen, m } = layout
  const straw = new Color(crop.paleta.maduro).multiplyScalar(1.12)
  const pod = new Color(crop.paleta.maduro).multiplyScalar(1.05)
  const R = m.stemR * 2.2
  const parts = [prep(new CylinderGeometry(R * 0.6, R, stemLen, 3, 1, true), straw, M([0, stemLen / 2, 0]))]
  const branches = []
  for (let b = 0; b < 4; b++) {
    const len = stemLen * rng.range(0.4, 0.55)
    const y0 = stemLen * (0.12 + b * 0.07)
    const az = b * 1.57 + rng.range(-0.3, 0.3)
    const tilt = rng.range(0.45, 0.7)
    const br = new CylinderGeometry(R * 0.4, R * 0.6, len, 3, 1, true)
    br.translate(0, len / 2, 0)
    parts.push(prep(br, straw, M([0, y0, 0], [0, az, tilt], [1, 1, 1], 'YZX')))
    branches.push({ len, y0, az, tilt })
  }
  // racimos de vainas en el tallo y en las ramas
  const pods = []
  for (let k = 0; k < 6; k++) pods.push([0, stemLen * (0.3 + k * 0.11), 0, k * 2.4])
  for (const br of branches) {
    const u = br.len * 0.75
    const x = Math.sin(br.tilt) * u
    pods.push([Math.cos(br.az) * x, br.y0 + Math.cos(br.tilt) * u, -Math.sin(br.az) * x, br.az])
  }
  for (const [x, y, z, a] of pods) {
    parts.push(prep(new SphereGeometry(1, 3, 2), pod, M([x + Math.cos(a) * 0.02, y - 0.015, z - Math.sin(a) * 0.02], [0, a, -1.2], [0.03, 0.009, 0.008], 'YZX')))
  }
  return parts
}

/** Cabeza madura simplificada sobre un tallo de largo `top`. */
// `branches`: ramas de la panoja de avena (menos en los macollos, para aligerar el lote)
function headParts(crop, layout, rng, top, straw, grain, branches = 5) {
  const { headLen } = layout
  const parts = []
  // Cereales de invierno: cilindros sin tapas (desde lejos no se ven y son la mitad de los triángulos)
  const open = crop.macollos > 0
  if (crop.cabeza === 'espiga') {
    const thin = crop.id === 'centeno' ? 0.75 : 1
    const head = new CylinderGeometry(0.0045 * thin, 0.0065 * thin, headLen, 4, 1, open)
    head.translate(0, headLen / 2, 0)
    // la cebada madura cuelga
    const bend = crop.id === 'cebada' ? -1.7 : rng.range(-0.25, 0.1)
    parts.push(prep(head, grain, M([0, top, 0], [0, rng.range(0, 6.28), bend], [1, 1, 1], 'YZX')))
  } else if (crop.cabeza === 'panoja-abierta') {
    parts.push(prep(new CylinderGeometry(0.001, 0.0015, headLen, 3, 1, open), straw, M([0, top + headLen / 2, 0])))
    for (let i = 0; i < branches; i++) {
      const b = new CylinderGeometry(0.0012, 0.002, headLen * 0.45, 3, 1, open)
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
  const { stemLen, m } = layout
  const pal = crop.paleta
  const straw = new Color(pal.maduro)
  const leafDry = new Color(pal.maduro).multiplyScalar(0.82)
  const grain = new Color(pal.grano).lerp(new Color(pal.maduro), crop.id === 'sorgo' ? 0 : 0.5)
  const parts = []
  const r = Math.max(m.stemR, 0.0025)

  parts.push(prep(new CylinderGeometry(r * 0.7, r, stemLen, 3, 1, crop.macollos > 0), straw, M([0, stemLen / 2, 0])))

  // Algunas hojas, ya abiertas y caídas
  // los cereales de invierno, que en la hectárea son matas, llevan una sola hoja seca
  const picks = crop.id === 'maiz' ? [4, 7, 10] : crop.id === 'sorgo' ? [3, 6] : [3]
  for (const k of picks) {
    const leaf = layout.leaves[Math.min(k, layout.leaves.length - 1)]
    const lg = createLeafGeometry(4)
    shapeLeaf(lg, { ...leaf, curl: leaf.curl + 0.3, offset: r }, 1, 1)
    const y = leaf.node * stemLen
    parts.push(prep(lg, leafDry, M([0, y, 0], [0, leaf.azimuth + rng.range(-0.3, 0.3), 0])))
  }

  // Cabeza según el cultivo
  parts.push(...headParts(crop, layout, rng, stemLen, straw, grain))

  // Cereales de invierno: la planta madura es una mata, con los macollos en abanico
  const tillers = Math.min(crop.cabeza === 'panoja-abierta' ? 2 : 3, crop.macollos)
  for (let t = 0; t < tillers; t++) {
    const s = rng.range(0.82, 0.95)
    const len = stemLen * s
    const tiller = [prep(new CylinderGeometry(r * 0.6, r * 0.9, len, 3, 1, true), straw, M([0, len / 2, 0]))]
    tiller.push(...headParts(crop, layout, rng, len, straw, grain, 3))
    const tilt = M([0, 0, 0], [0, (t / tillers) * Math.PI * 2 + rng.range(-0.4, 0.4), rng.range(0.14, 0.3)], [1, 1, 1], 'YZX')
    tiller.forEach((g) => parts.push(g.applyMatrix4(tilt)))
  }

  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return merged
}

/** Parcela: varias hileras de plantas simplificadas fusionadas en una sola geometría. */
export function patchGeometry(crop, layout, quality = 'high') {
  const rng = createRng(`parcela-${crop.id}`)
  const variants = [0, 1, 2].map(() => simplePlant(crop, layout, rng))
  const rows = Math.max(3, Math.round(1.4 / crop.surco))
  const len = crop.H > 2 ? 2.6 : 1.4
  // Surco angosto (cereales de invierno y soja): en desktop, el doble de plantas sobre la
  // hilera para que el lote no se vea ralo desde lejos. En mobile queda como estaba.
  const minAlong = crop.surco < 0.5 && quality === 'high' ? 0.12 : crop.H > 2 ? 0.25 : 0.24
  const along = Math.max(1 / (crop.densidad * crop.surco), minAlong)
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
  return { patch, width: rows * crop.surco, len, plants: rows * perRow }
}
