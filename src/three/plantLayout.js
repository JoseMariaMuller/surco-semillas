import { CatmullRomCurve3, Vector3 } from 'three'
import { createRng } from '../utils/random.js'
import { BOX } from './dimensions.js'

// Parámetros morfológicos por cultivo (metros). Los de trigo están completos;
// el resto se ajusta en la fase de todos los cultivos.
export const MORPH = {
  trigo: {
    leaves: 8, nodes: [0.12, 0.3, 0.52, 0.76],
    leafLen: [0.07, 0.24], leafWidth: 0.014, stemR: 0.0022,
    headLen: 0.09, seminal: 5, rootDepth: 0.44,
    seed: { len: 0.0072, w: 0.0036, h: 0.0032 },
  },
  cebada: {
    leaves: 8, nodes: [0.12, 0.3, 0.52, 0.76],
    leafLen: [0.07, 0.22], leafWidth: 0.015, stemR: 0.0022,
    headLen: 0.08, seminal: 6, rootDepth: 0.42,
    seed: { len: 0.0095, w: 0.0036, h: 0.003 },
  },
  avena: {
    leaves: 8, nodes: [0.12, 0.3, 0.52, 0.76],
    leafLen: [0.08, 0.26], leafWidth: 0.016, stemR: 0.0024,
    headLen: 0.2, seminal: 4, rootDepth: 0.44,
    seed: { len: 0.011, w: 0.003, h: 0.0028 },
  },
  centeno: {
    leaves: 8, nodes: [0.12, 0.3, 0.52, 0.76],
    leafLen: [0.08, 0.26], leafWidth: 0.012, stemR: 0.0022,
    headLen: 0.12, seminal: 4, rootDepth: 0.46,
    seed: { len: 0.008, w: 0.0028, h: 0.0026 },
  },
  maiz: {
    leaves: 13, nodes: [0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84],
    leafLen: [0.12, 0.9], leafWidth: 0.08, stemR: 0.012,
    headLen: 0.35, seminal: 4, rootDepth: 0.46,
    seed: { len: 0.011, w: 0.0085, h: 0.0045 },
  },
  sorgo: {
    leaves: 10, nodes: [0.08, 0.18, 0.3, 0.42, 0.54, 0.66, 0.78],
    leafLen: [0.1, 0.65], leafWidth: 0.06, stemR: 0.008,
    headLen: 0.25, seminal: 3, rootDepth: 0.44,
    seed: { len: 0.0045, w: 0.0042, h: 0.004 },
  },
}

const LIMIT_X = BOX.w / 2 - 0.02
const LIMIT_Y = -BOX.depth + 0.02

// Recorrido de una raíz: caminata con gravitropismo, achatada contra el vidrio.
function rootPath(rng, start, angle, length, steps, zAmp = 0.018) {
  const pts = [start.clone()]
  let a = angle // 0 = hacia abajo; positivo hacia +X
  const step = length / steps
  let p = start.clone()
  let z = start.z
  for (let i = 0; i < steps; i++) {
    a += rng.range(-0.28, 0.28)
    a *= 0.86 // gravitropismo: tiende a la vertical
    z = Math.max(-zAmp, Math.min(zAmp, z + rng.range(-0.006, 0.006)))
    p = new Vector3(p.x + Math.sin(a) * step, p.y - Math.cos(a) * step, z)
    if (Math.abs(p.x) > LIMIT_X) {
      p.x = Math.sign(p.x) * LIMIT_X
      a *= -0.5
    }
    if (p.y < LIMIT_Y) p.y = LIMIT_Y + rng.range(0, 0.004)
    pts.push(p)
  }
  return new CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
}

function buildRoots(crop, m, rng) {
  const seedPos = new Vector3(0, -crop.d, 0)
  const roots = []
  const n = m.seminal
  for (let j = 0; j < n; j++) {
    const isPrimary = j === 0
    // Radícula hacia abajo; seminales en abanico alternando lados
    const side = j % 2 === 1 ? 1 : -1
    const spread = isPrimary ? rng.range(-0.08, 0.08) : side * (0.35 + 0.22 * Math.ceil(j / 2) + rng.range(-0.1, 0.1))
    const length = m.rootDepth * (isPrimary ? 1 : rng.range(0.7, 0.92))
    const start = seedPos.clone().add(new Vector3(side * 0.0015 * (isPrimary ? 0 : 1), -0.001, 0))
    const curve = rootPath(rng, start, spread, length, 14)
    const delay = isPrimary ? 0 : 0.12 + j * 0.04

    // Raicillas laterales
    const laterals = []
    const count = rng.int(7, 12)
    for (let k = 0; k < count; k++) {
      const u = 0.12 + (k / count) * 0.75 + rng.range(-0.03, 0.03)
      const p0 = curve.getPointAt(Math.min(u, 0.99))
      const tan = curve.getTangentAt(Math.min(u, 0.99))
      const s = k % 2 === 0 ? 1 : -1
      const base = Math.atan2(tan.x, -tan.y)
      const ang = base + s * rng.range(0.9, 1.4)
      const len = rng.range(0.018, 0.06) * (1 - u * 0.6)
      laterals.push({ u, curve: rootPath(rng, p0, ang, len, 4, 0.02) })
    }
    roots.push({ curve, delay, primary: isPrimary, laterals })
  }
  return roots
}

export function buildLayout(crop) {
  const m = MORPH[crop.id]
  const rng = createRng(`planta-${crop.id}`)
  const headLen = m.headLen
  const stemLen = crop.H - headLen
  const N = m.leaves
  const crownCount = N - m.nodes.length

  const leaves = []
  let az = rng.range(0, Math.PI * 2)
  for (let k = 0; k < N; k++) {
    const nodeIndex = k - crownCount
    const r = N > 2 ? Math.min(1, k / (N - 2)) : 1
    let len = m.leafLen[0] + (m.leafLen[1] - m.leafLen[0]) * Math.pow(r, 0.8)
    if (k === N - 1) len *= 0.72 // hoja bandera, más corta
    const lowFrac = 1 - k / (N - 1)
    leaves.push({
      k,
      node: nodeIndex >= 0 ? m.nodes[nodeIndex] : 0,
      azimuth: az,
      length: len,
      width: m.leafWidth * (0.62 + 0.38 * Math.min(1, k / (N - 2))),
      // Las vainas de las hojas del tallo cubren casi todo el entrenudo
      sheath: nodeIndex >= 0 ? 0.36 : 0.26,
      lean: 0.25 + 0.2 * lowFrac + rng.range(-0.05, 0.05),
      curl: 1.1 + 0.9 * lowFrac + rng.range(-0.2, 0.2),
      fold: 0.55,
      twist: rng.range(-0.5, 0.5),
    })
    az += Math.PI + rng.range(-0.35, 0.35) // alterna 180° ± variación
  }

  return {
    crop,
    m,
    stemLen,
    headLen,
    leaves,
    roots: buildRoots(crop, m, rng),
    headCenter: [0, stemLen + headLen * 0.5, 0],
    earCenter: [0, crop.H * 0.45, 0],
    headAzimuth: rng.range(0, Math.PI * 2),
  }
}
