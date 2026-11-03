import { BufferAttribute, BufferGeometry } from 'three'

// Lámina ancha (girasol y folíolos de soja) como grilla: filas a lo largo de la
// nervadura y COLS columnas a lo ancho. Espacio local: la base en el origen,
// la nervadura sale por +X y cae hacia −Y; el ancho va sobre Z.

const COLS = 7 // de borde a borde, con la nervadura en el medio

export function createBroadLeafGeometry(segments = 12, shape = 'ovalada') {
  const rows = segments + 1
  const g = new BufferGeometry()
  const pos = new Float32Array(rows * COLS * 3)
  const col = new Float32Array(rows * COLS * 3)
  const idx = []
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < COLS - 1; j++) {
      const a = i * COLS + j
      const b = a + COLS
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  g.setIndex(idx)
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.userData.segments = segments
  g.userData.shape = shape
  return g
}

// Medio ancho relativo (0..1) a lo largo de la lámina.
function halfWidth(shape, u) {
  if (shape === 'acorazonada') {
    // base ancha con lóbulos, máximo cerca de un tercio, punta aguda
    if (u < 0.3) return 0.78 + 0.22 * Math.sin(((u / 0.3) * Math.PI) / 2)
    return Math.pow((1 - u) / 0.7, 0.65)
  }
  // ovalada: base redondeada y punta apenas aguda
  return Math.pow(Math.sin(Math.PI * Math.min(u, 0.999)), 0.7) * (u > 0.75 ? Math.pow((1 - u) / 0.25, 0.25) : 1)
}

// Dientes del borde (girasol): diente de sierra a lo largo de la lámina.
const serration = (u, n) => {
  const t = (u * n) % 1
  return 1 - 0.07 * t
}

/**
 * Da forma a la lámina.
 * - p.blade: largo final (m); p.ratio: ancho / largo
 * - p.droop: cuánto cae la punta (rad); p.fold: pliegue en V en la nervadura (fracción del ancho)
 * - grow: 0..1 (escala); open: 0..1 (de plegada hacia arriba a extendida)
 */
export function shapeBroadLeaf(g, p, grow, open) {
  const segs = g.userData.segments
  const shape = g.userData.shape
  const pos = g.attributes.position.array
  const col = g.attributes.color.array
  const L = p.blade * grow
  const W = L * p.ratio
  const ds = L / segs
  // Cerrada sube casi vertical; abierta sale apenas hacia arriba y cae hacia la punta
  const start = (1 - open) * 1.2 + 0.12
  let x = 0
  let y = 0
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    const a = start - open * p.droop * Math.pow(u, 1.5)
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    if (i > 0) {
      x += ca * ds
      y += sa * ds
    }
    const half = (W / 2) * halfWidth(shape, u)
    // Lóbulos del corazón: los bordes de la base se corren hacia atrás del pecíolo
    const lobe = shape === 'acorazonada' ? Math.max(0, 1 - u / 0.18) * L * 0.06 : 0
    // Normal "hacia arriba" de la lámina en el plano XY
    const nx = -sa
    const ny = ca
    for (let j = 0; j < COLS; j++) {
      const s = (j - (COLS - 1) / 2) / ((COLS - 1) / 2) // −1..1
      const edge = Math.abs(s)
      const h = half * (shape === 'acorazonada' && edge === 1 ? serration(u, 11) : 1)
      // pliegue en V más un poco de cuchara hacia los bordes
      const lift = h * (p.fold * edge + 0.08 * edge * edge) * (0.4 + 0.6 * open)
      const back = lobe * edge * edge
      const o = (i * COLS + j) * 3
      pos[o] = x - back * ca + nx * lift
      pos[o + 1] = y - back * sa + ny * lift
      pos[o + 2] = s * h
      // base más clara, nervadura más clara, bordes un poco más oscuros
      const k = (1 + 0.25 * Math.max(0, 1 - u / 0.2)) * (edge === 0 ? 1.12 : 1 - 0.08 * edge)
      col[o] = col[o + 1] = col[o + 2] = k
    }
  }
  g.attributes.position.needsUpdate = true
  g.attributes.color.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingSphere()
}
