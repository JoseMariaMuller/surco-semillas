import { CatmullRomCurve3, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { createRng } from '../utils/random.js'
import { BOX, PIT } from './dimensions.js'

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

  // Maíz: raíces de la corona, que salen de los nudos de la base desde V6-V8
  if (crop.id === 'maiz') {
    const crownY = -0.018
    for (let j = 0; j < 6; j++) {
      const side = j % 2 === 0 ? 1 : -1
      const start = new Vector3(side * 0.006, crownY, rng.range(-0.004, 0.004))
      const angle = side * (0.75 + 0.12 * Math.floor(j / 2) + rng.range(-0.1, 0.1))
      const curve = rootPath(rng, start, angle, rng.range(0.24, 0.34), 12)
      const laterals = []
      for (let k = 0; k < 6; k++) {
        const u = 0.2 + k * 0.12
        const p0 = curve.getPointAt(u)
        const tan = curve.getTangentAt(u)
        const ang = Math.atan2(tan.x, -tan.y) + (k % 2 ? 1 : -1) * rng.range(0.9, 1.3)
        laterals.push({ u, curve: rootPath(rng, p0, ang, rng.range(0.02, 0.05), 4, 0.02) })
      }
      roots.push({ curve, delay: 0.55 + j * 0.035, primary: false, crown: true, laterals })
    }
  }
  return roots
}

// Centro de la cabeza ya crecida, para la cámara.
function headCenterFor(crop, stemLen, headLen) {
  const k = crop.cabeza === 'panoja-abierta' ? 0.42 : 0.5
  return [0, stemLen + headLen * k, 0]
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
    headCenter: headCenterFor(crop, stemLen, headLen),
    headAzimuth: rng.range(0, Math.PI * 2),
    ...earLayout(crop, m, stemLen),
    tillers: tillerPlacements(crop, rng),
  }
}

// Choclo: en el nudo más cercano al 45 % de la altura, mirando hacia la cámara.
export const EAR = { len: 0.2, radius: 0.024, shank: 0.035, tilt: 0.42 }
function earLayout(crop, m, stemLen) {
  if (crop.id !== 'maiz') return { earNode: -1, earAzimuth: 0, earCenter: [0, crop.H * 0.45, 0] }
  let earNode = 0
  let best = Infinity
  m.nodes.forEach((f, i) => {
    const dd = Math.abs(f * stemLen - crop.H * 0.45)
    if (dd < best) {
      best = dd
      earNode = i
    }
  })
  const earAzimuth = -Math.PI / 4
  const along = EAR.shank + EAR.len / 2
  const lx = m.stemR + Math.sin(EAR.tilt) * along
  const ly = m.nodes[earNode] * stemLen + Math.cos(EAR.tilt) * along
  // rotación en Y: x local -> (cos a, 0, -sin a)
  const earCenter = [lx * Math.cos(earAzimuth), ly, -lx * Math.sin(earAzimuth)]
  return { earNode, earAzimuth, earCenter }
}

// Macollos: copias del vástago principal, más bajas y abiertas en abanico.
function tillerPlacements(crop, rng) {
  const n = crop.macollos
  const out = []
  const base = rng.range(0, Math.PI * 2)
  for (let k = 0; k < n; k++) {
    const ay = base + (k / n) * Math.PI * 2 + rng.range(-0.3, 0.3)
    const tilt = rng.range(0.16, 0.3)
    const s = rng.range(0.78, 0.9)
    const q = new Quaternion().setFromEuler(new Euler(0, ay, tilt, 'YZX'))
    const pos = new Vector3(Math.cos(ay) * 0.004, 0, -Math.sin(ay) * 0.004)
    out.push(new Matrix4().compose(pos, q, new Vector3(s, s * rng.range(0.86, 0.95), s)))
  }
  return out
}

// Distancia ponderada que ordena el cultivo vecino: prioriza lo que está detrás.
export const neighborDistance = (x, z) => Math.hypot(x * 0.8, z > 0 ? z * 1.5 : z * 0.65)

/**
 * Posiciones del cultivo vecino: hileras a la distancia entre surcos del cultivo,
 * priorizando lo que queda detrás de la planta principal (donde mira la cámara).
 */
export function neighborPlacements(crop, count) {
  const rng = createRng(`vecinos-${crop.id}`)
  const row = crop.surco
  // Separación sobre la hilera: la real, con un mínimo para que no sea una pared.
  const along = Math.max(1 / (crop.densidad * row), crop.H > 2 ? 0.26 : 0.12)
  const reachX = Math.max(1.8, crop.H * 2.2)
  const reachBack = Math.max(4, crop.H * 4)
  const reachFront = Math.max(1.6, crop.H * 1.6)
  const cands = []
  const rows = Math.ceil(reachX / row)
  for (let k = -rows; k <= rows; k++) {
    const offset = rng.range(0, along)
    for (let z = -reachBack + offset; z < reachFront; z += along) {
      const x = k * row + rng.range(-0.012, 0.012)
      const zz = z + rng.range(-along * 0.3, along * 0.3)
      // Fuera del foso y del rizotrón, con margen para que las hojas no lo invadan
      const inPit = Math.abs(x) < PIT.halfW + 0.06 && zz > -0.08 && zz < PIT.front + 0.08
      if (inPit) continue
      // Prioridad: cerca y, sobre todo, detrás
      const d = neighborDistance(x, zz)
      cands.push({ x, z: zz, d })
    }
  }
  cands.sort((a, b) => a.d - b.d)
  const picked = cands.slice(0, count)
  const out = picked.map(({ x, z }) => {
    const s = rng.range(0.82, 1.08)
    const q = new Quaternion().setFromEuler(new Euler(rng.range(-0.05, 0.05), rng.range(0, Math.PI * 2), rng.range(-0.05, 0.05)))
    return new Matrix4().compose(new Vector3(x, 0, z), q, new Vector3(s, s, s))
  })
  // Hasta dónde llega el cultivo vecino (la hectárea empieza ahí)
  out.reach = picked.length ? picked[picked.length - 1].d : 0
  return out
}

