import { BufferAttribute, BufferGeometry } from 'three'

// Hoja de gramínea como cinta: 3 vértices por sección (borde, nervadura, borde).
// Espacio local: la base en el origen, el eje sube por +Y y se arquea hacia +X.
// El ancho va sobre Z. Así, rotando en Y se elige hacia dónde apunta la hoja.

export function createLeafGeometry(segments = 16) {
  const rows = segments + 1
  const g = new BufferGeometry()
  const pos = new Float32Array(rows * 3 * 3)
  const col = new Float32Array(rows * 3 * 3)
  const uv = new Float32Array(rows * 3 * 2)
  const idx = []
  for (let i = 0; i < segments; i++) {
    const a = i * 3
    const b = a + 3
    // dos tiras: borde izq. a nervadura, nervadura a borde der.
    idx.push(a, b, a + 1, a + 1, b, b + 1)
    idx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
  }
  for (let i = 0; i < rows; i++) {
    const u = i / segments
    for (let j = 0; j < 3; j++) {
      uv[(i * 3 + j) * 2] = j / 2
      uv[(i * 3 + j) * 2 + 1] = u
    }
  }
  g.setIndex(idx)
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.userData.segments = segments
  return g
}

// Perfil de ancho en forma de lanza: vaina angosta, máximo a 1/3 de la lámina y punta aguda.
function widthAt(u, sheath) {
  if (u < sheath) return 0.42
  const v = (u - sheath) / (1 - sheath)
  if (v < 1 / 3) return 0.55 + 0.45 * Math.sin((v * 3 * Math.PI) / 2)
  return Math.pow((1 - v) / (2 / 3), 0.85)
}

/**
 * Da forma a la hoja.
 * - length, width: tamaño final en metros
 * - sheath: fracción del largo que es vaina (vertical, abrazando el tallo)
 * - lean: ángulo inicial de la lámina respecto de la vertical (rad)
 * - curl: cuánto se arquea hacia abajo hasta la punta (rad)
 * - fold: profundidad del pliegue en V (fracción del ancho)
 * - grow: 0..1, escala de la hoja
 * - open: 0..1, cuánto se abrió desde la vertical
 * - twist: giro leve a lo largo de la lámina (rad)
 */
export function shapeLeaf(g, p, grow, open) {
  const segs = g.userData.segments
  const pos = g.attributes.position.array
  const col = g.attributes.color.array
  const L = p.length * grow
  const W = p.width * (0.35 + 0.65 * grow)
  const ds = L / segs
  let x = p.offset ?? 0
  let y = 0
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    let theta = 0
    if (u > p.sheath) {
      const v = (u - p.sheath) / (1 - p.sheath)
      theta = open * (p.lean + p.curl * Math.pow(v, 1.7))
    }
    const st = Math.sin(theta)
    const ct = Math.cos(theta)
    if (i > 0) {
      x += st * ds
      y += ct * ds
    }
    const half = (W * widthAt(u, p.sheath)) / 2
    // normal "hacia arriba" de la lámina: (-cos, sin)
    const nx = -ct
    const ny = st
    const lift = half * p.fold * (u > p.sheath ? 1 : 0.2)
    const tw = (p.twist ?? 0) * u
    const ctw = Math.cos(tw)
    const stw = Math.sin(tw)
    const o = i * 9
    for (let j = 0; j < 3; j++) {
      const side = j - 1 // -1, 0, 1
      const ez = side * half
      const en = side === 0 ? -lift * 0.35 : lift
      // giro leve alrededor del eje de la hoja
      const zz = ez * ctw
      const nn = en + ez * stw * 0.4
      pos[o + j * 3] = x + nx * nn
      pos[o + j * 3 + 1] = y + ny * nn
      pos[o + j * 3 + 2] = zz
      // base más clara, nervadura apenas más clara, bordes un poco más oscuros
      const base = 1 + 0.4 * Math.max(0, 1 - u / Math.max(p.sheath * 1.6, 0.08))
      const k = base * (side === 0 ? 1.06 : 0.94)
      col[o + j * 3] = k
      col[o + j * 3 + 1] = k
      col[o + j * 3 + 2] = k
    }
  }
  g.attributes.position.needsUpdate = true
  g.attributes.color.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingSphere()
}
