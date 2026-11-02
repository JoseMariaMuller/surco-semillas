import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { createRng } from '../utils/random.js'

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function toTexture(canvas, repeat = false) {
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

const HOR_A = [52, 36, 25] // horizonte A, oscuro y con materia orgánica
const HOR_B = [116, 84, 58] // horizonte B, más claro y arcilloso

/**
 * Perfil de suelo para las paredes del rizotrón.
 * La textura cubre `widthM` x `depthM` metros; el borde superior es la superficie.
 */
export function createSoilProfileTexture({ widthM = 0.6, depthM = 0.5, px = 1024, seed = 'suelo' } = {}) {
  const w = px
  const h = Math.round((px * depthM) / widthM)
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const rng = createRng(seed)
  const pxPerM = w / widthM
  const aDepth = 0.25 * pxPerM

  // Base con transición irregular entre horizontes
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, Math.max(0, (y - aDepth + 18) / 46))
    ctx.fillStyle = rgb(mix(HOR_A, HOR_B, t * t * (3 - 2 * t)))
    ctx.fillRect(0, y, w, 1)
  }

  // Límite ondulado entre horizontes
  ctx.fillStyle = rgb(mix(HOR_A, HOR_B, 0.45), 0.6)
  for (let x = 0; x < w; x += 6) {
    const yy = aDepth + Math.sin(x * 0.02) * 8 + rng.range(-6, 6)
    ctx.fillRect(x, yy, 7, rng.range(4, 14))
  }

  // Granitos finos
  const grains = Math.round(w * h * 0.06)
  for (let n = 0; n < grains; n++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const deep = y > aDepth
    const base = deep ? HOR_B : HOR_A
    const k = rng.range(-0.35, 0.35)
    const c = k > 0 ? mix(base, [210, 180, 140], k) : mix(base, [10, 6, 4], -k)
    ctx.fillStyle = rgb(c, rng.range(0.35, 0.9))
    const s = rng.range(0.6, 2.2)
    ctx.fillRect(x, y, s, s)
  }

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

  return toTexture(canvas)
}

/**
 * Superficie arada: textura repetible con surcos paralelos al eje Z del mundo.
 * Un mosaico representa `tileM` metros.
 */
export function createFieldTexture({ px = 512, rows = 4, seed = 'superficie' } = {}) {
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

  return toTexture(canvas, true)
}

/** Reflejo diagonal muy suave para el vidrio. */
export function createGlassSheenTexture(px = 256) {
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
  return toTexture(canvas)
}
