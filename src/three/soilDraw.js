import { createRng } from '../utils/random.js'

// Dibujo procedural del suelo, sin three.js: corre igual en el hilo principal
// (canvas del DOM) que en un Web Worker (OffscreenCanvas).

export function makeCanvas(w, h) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

const HOR_A = [52, 36, 25] // horizonte A, oscuro y con materia orgánica
const HOR_B = [116, 84, 58] // horizonte B, más claro y arcilloso

/**
 * Perfil de suelo para las paredes del rizotrón.
 * La textura cubre `widthM` x `depthM` metros; el borde superior es la superficie.
 */
export function drawSoilProfile({ widthM = 0.6, depthM = 0.5, px = 1024, seed = 'suelo' } = {}) {
  const w = px
  const h = Math.round((px * depthM) / widthM)
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const rng = createRng(seed)
  const pxPerM = w / widthM
  const aDepth = 0.25 * pxPerM

  // Base, límite ondulado entre horizontes y granitos: todo en una pasada por píxel
  // sobre un ImageData (decenas de miles de fillRect con colores en texto eran
  // lo más caro del arranque).
  const scale = w / 1024 // los tamaños de referencia estaban pensados para 1024 px
  const edge = new Float32Array(w)
  for (let x = 0; x < w; x++) edge[x] = Math.sin((x / scale) * 0.02) * 8 * scale
  // ruido suave del borde, por tramos de 6 px
  for (let x = 0; x < w; x += Math.round(6 * scale)) {
    const off = rng.range(-6, 6) * scale
    for (let k = 0; k < 6 * scale && x + k < w; k++) edge[x + k] += off
  }
  const img = ctx.createImageData(w, h)
  const d = img.data
  const band = 46 * scale
  const shift = 18 * scale
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = (y - aDepth - edge[x] + shift) / band
      t = t < 0 ? 0 : t > 1 ? 1 : t
      t = t * t * (3 - 2 * t)
      let r = HOR_A[0] + (HOR_B[0] - HOR_A[0]) * t
      let g = HOR_A[1] + (HOR_B[1] - HOR_A[1]) * t
      let b = HOR_A[2] + (HOR_B[2] - HOR_A[2]) * t
      // grano fino: leve variación en todos los píxeles y motas claras u oscuras
      const n = rng.next()
      let k = (n - 0.5) * 0.16
      if (n < 0.035) k = -0.25 - n * 6 // mota oscura
      else if (n > 0.975) k = 0.18 + (n - 0.975) * 8 // mota clara
      if (k > 0) {
        r += (210 - r) * k
        g += (180 - g) * k
        b += (140 - b) * k
      } else {
        r += (10 - r) * -k
        g += (6 - g) * -k
        b += (4 - b) * -k
      }
      const o = (y * w + x) * 4
      d[o] = r
      d[o + 1] = g
      d[o + 2] = b
      d[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // Agregados (terrones) con sombra suave
  for (let n = 0; n < 900; n++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const r = rng.range(1.5, 5)
    const deep = y > aDepth
    ctx.fillStyle = rgb(deep ? mix(HOR_B, [60, 40, 28], 0.5) : [24, 16, 11], 0.35)
    ctx.beginPath()
    ctx.ellipse(x + 1, y + 1.2, r, r * rng.range(0.6, 1), rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgb(deep ? mix(HOR_B, [190, 150, 110], 0.3) : mix(HOR_A, [110, 80, 55], 0.4), 0.55)
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * rng.range(0.6, 1), rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
  }

  // Piedritas
  for (let n = 0; n < 120; n++) {
    const x = rng.next() * w
    const y = aDepth * 0.4 + rng.next() * (h - aDepth * 0.4)
    const r = rng.range(2.5, 9)
    const tone = rng.range(0.25, 0.7)
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
    g.addColorStop(0, rgb(mix([150, 140, 125], [220, 210, 190], tone)))
    g.addColorStop(1, rgb(mix([70, 62, 52], [120, 110, 95], tone)))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * rng.range(0.55, 0.9), rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
  }

  // Restos orgánicos: rastrojo y raicillas viejas, sobre todo en el horizonte A
  ctx.lineCap = 'round'
  for (let n = 0; n < 260; n++) {
    const x = rng.next() * w
    const y = Math.pow(rng.next(), 1.8) * h
    const len = rng.range(4, 22)
    const a = rng.range(0, Math.PI * 2)
    ctx.strokeStyle = rng.next() < 0.6 ? rgb([18, 12, 8], 0.7) : rgb([150, 118, 70], 0.55)
    ctx.lineWidth = rng.range(0.6, 2)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5 + rng.range(-4, 4),
      y + Math.sin(a) * len * 0.5 + rng.range(-4, 4),
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    )
    ctx.stroke()
  }

  // Poros oscuros
  for (let n = 0; n < 400; n++) {
    ctx.fillStyle = rgb([8, 5, 3], rng.range(0.3, 0.7))
    ctx.beginPath()
    ctx.arc(rng.next() * w, rng.next() * h, rng.range(0.6, 2), 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas
}

/**
 * Parche de detalle para los primeros planos de la semilla.
 * Parte de la misma zona del perfil (así los colores coinciden), la amplía
 * y le suma grano fino nítido. Los bordes se funden con transparencia.
 * `rect` en metros: x de -widthM/2 a widthM/2, d = profundidad positiva.
 */
export function drawSoilDetail(baseCanvas, { widthM = 0.6, depthM = 0.5, rect, px = 2600, seed = 'detalle' }) {
  const { x0, x1, d0, d1 } = rect
  const w = px
  const h = Math.round((px * (d1 - d0)) / (x1 - x0))
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const rng = createRng(seed)
  const pxPerM = w / (x1 - x0)

  // 1. La misma porción del perfil, ampliada con suavizado
  const bw = baseCanvas.width
  const bh = baseCanvas.height
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    baseCanvas,
    ((x0 + widthM / 2) / widthM) * bw,
    (d0 / depthM) * bh,
    ((x1 - x0) / widthM) * bw,
    ((d1 - d0) / depthM) * bh,
    0,
    0,
    w,
    h,
  )

  // 2 y 3. Ruido por píxel (arena y limo) y granos nítidos de 2 × 2 px, claros u
  // oscuros, en la misma pasada sobre el ImageData.
  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  const row = w * 4
  // mezcla un píxel hacia un color con opacidad a (fuera de rango se ignora)
  const blend = (i, r, g, b, a) => {
    if (i < 0 || i >= data.length) return
    data[i] += (r - data[i]) * a
    data[i + 1] += (g - data[i + 1]) * a
    data[i + 2] += (b - data[i + 2]) * a
  }
  for (let i = 0; i < data.length; i += 4) {
    const u = rng.next()
    const n = (u - 0.5) * 16
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 0.9))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.8))
    if (u < 0.0024) {
      // grano: el mismo color en un bloque de 2 × 2
      const light = u < 0.001
      const a = light ? 0.2 + u * 300 : 0.25 + (u - 0.001) * 250
      const [r, g, b] = light ? [178, 146, 111] : [12, 8, 5]
      blend(i, r, g, b, a)
      blend(i + 4, r, g, b, a)
      blend(i + row, r, g, b, a)
      blend(i + row + 4, r, g, b, a)
    }
  }
  ctx.putImageData(img, 0, 0)

  // 4. Agregados con luz y sombra (miga del suelo)
  for (let n = 0; n < Math.round(w * h * 0.0006); n++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const r = rng.range(5, 16)
    ctx.fillStyle = 'rgba(10,6,4,0.4)'
    ctx.beginPath()
    ctx.ellipse(x + r * 0.25, y + r * 0.3, r, r * 0.8, rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(160,120,85,0.22)'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.15, y - r * 0.2, r * 0.8, r * 0.6, rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
  }

  // 5. Piedritas con brillo
  for (let n = 0; n < Math.round(w * h * 0.000018); n++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const r = rng.range(4, 12)
    const tone = rng.range(0.1, 0.5)
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r)
    g.addColorStop(0, rgb(mix([175, 165, 150], [235, 225, 205], tone)))
    g.addColorStop(0.7, rgb(mix([110, 100, 88], [160, 150, 132], tone)))
    g.addColorStop(1, rgb([45, 38, 30]))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * rng.range(0.6, 0.9), rng.range(0, Math.PI), 0, Math.PI * 2)
    ctx.fill()
  }

  // 6. Fibras orgánicas finas
  ctx.lineCap = 'round'
  for (let n = 0; n < Math.round(w * h * 0.00005); n++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const len = rng.range(0.004, 0.018) * pxPerM
    const a = rng.range(0, Math.PI * 2)
    ctx.strokeStyle = rng.next() < 0.6 ? 'rgba(20,13,8,0.55)' : 'rgba(150,118,76,0.4)'
    ctx.lineWidth = rng.range(0.8, 1.8)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5 + rng.range(-len, len) * 0.2,
      y + Math.sin(a) * len * 0.5 + rng.range(-len, len) * 0.2,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    )
    ctx.stroke()
  }

  // 7. Bordes que se funden con la pared
  ctx.globalCompositeOperation = 'destination-out'
  const fade = Math.round(Math.min(w, h) * 0.16)
  const edges = [
    [0, 0, fade, 0, 0, 0, fade, h],
    [w, 0, w - fade, 0, w - fade, 0, fade, h],
    [0, h, 0, h - fade, 0, h - fade, w, fade],
  ]
  for (const [gx0, gy0, gx1, gy1, rx, ry, rw, rh] of edges) {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(rx, ry, rw, rh)
  }
  ctx.globalCompositeOperation = 'source-over'

  return canvas
}

/**
 * Superficie arada: textura repetible con surcos paralelos al eje Z del mundo.
 * Un mosaico representa `tileM` metros.
 */
export function drawField({ px = 512, rows = 4, seed = 'superficie' } = {}) {
  const canvas = makeCanvas(px, px)
  const ctx = canvas.getContext('2d')
  const rng = createRng(seed)
  const base = [92, 68, 48]
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, px, px)

  // Surcos: bandas claras y oscuras alternadas a lo largo de X
  const band = px / rows
  for (let x = 0; x < px; x++) {
    const ph = ((x % band) / band) * Math.PI * 2
    const k = Math.sin(ph)
    const c = k > 0 ? mix(base, [140, 108, 78], k * 0.45) : mix(base, [40, 28, 20], -k * 0.45)
    ctx.fillStyle = rgb(c, 0.85)
    ctx.fillRect(x, 0, 1, px)
  }

  // Terrones y granulado (se repite sin costuras evitando bordes)
  for (let n = 0; n < px * px * 0.05; n++) {
    const x = rng.next() * px
    const y = rng.next() * px
    const k = rng.range(-0.4, 0.4)
    const c = k > 0 ? mix(base, [190, 160, 120], k) : mix(base, [20, 14, 10], -k)
    ctx.fillStyle = rgb(c, rng.range(0.3, 0.8))
    const s = rng.range(0.8, 3)
    ctx.fillRect(x, y, s, s)
  }

  // Rastrojo del cultivo anterior
  ctx.lineCap = 'round'
  for (let n = 0; n < 140; n++) {
    const x = rng.next() * px
    const y = rng.next() * px
    const a = rng.range(-0.5, 0.5) + Math.PI / 2
    const len = rng.range(6, 26)
    ctx.strokeStyle = rgb(mix([170, 140, 90], [210, 185, 130], rng.next()), rng.range(0.35, 0.7))
    ctx.lineWidth = rng.range(1, 2.4)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }

  return canvas
}

/** Reflejo diagonal muy suave para el vidrio. */
export function drawGlassSheen(px = 256) {
  const canvas = makeCanvas(px, px)
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, px, px)
  g.addColorStop(0, 'rgba(255,255,255,0.0)')
  g.addColorStop(0.32, 'rgba(255,255,255,0.0)')
  g.addColorStop(0.38, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.44, 'rgba(255,255,255,0.0)')
  g.addColorStop(0.52, 'rgba(255,255,255,0.0)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.3)')
  g.addColorStop(0.58, 'rgba(255,255,255,0.0)')
  g.addColorStop(1, 'rgba(255,255,255,0.0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, px, px)
  return canvas
}
