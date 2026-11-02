import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, Texture } from 'three'
import { drawField, drawGlassSheen, drawSoilDetail, drawSoilProfile } from './soilDraw.js'
import { DETAIL, SOIL_PX } from './soilSpec.js'

/**
 * Convierte una imagen (ImageBitmap del worker o canvas del DOM) en textura.
 * Los ImageBitmap no respetan flipY en WebGL, así que en los dos casos se usa
 * flipY = false y se invierte la coordenada v con repeat/offset: mismo resultado.
 */
function toTexture(image, { repeat = false, anisotropy = 4 } = {}) {
  const tex = image instanceof ImageBitmap ? new Texture(image) : new CanvasTexture(image)
  tex.flipY = false
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = anisotropy
  if (repeat) {
    tex.wrapS = tex.wrapT = RepeatWrapping
  } else {
    tex.wrapS = RepeatWrapping
    tex.wrapT = ClampToEdgeWrapping
    tex.repeat.y = -1
    tex.offset.y = 1
  }
  tex.needsUpdate = true
  return tex
}

function texturesFrom({ profile, detail, field }) {
  return {
    soil: toTexture(profile),
    detail: toTexture(detail, { anisotropy: 8 }),
    field: toTexture(field, { repeat: true }),
  }
}

// En el hilo principal, si no hay Worker u OffscreenCanvas 2D.
function drawOnMainThread(quality) {
  const px = SOIL_PX[quality] ?? SOIL_PX.high
  const profile = drawSoilProfile({ px: px.profile })
  return {
    profile,
    detail: drawSoilDetail(profile, { rect: DETAIL, px: px.detail }),
    field: drawField({ px: px.field }),
  }
}

function canUseWorker() {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false
  try {
    return Boolean(new OffscreenCanvas(1, 1).getContext('2d'))
  } catch {
    return false
  }
}

/**
 * Genera las texturas de suelo (perfil, detalle y superficie arada).
 * Lo hace en un Web Worker cuando se puede, para no trabar la página al cargar.
 * Devuelve una promesa con texturas nuevas (quien las usa las libera).
 */
export function loadSoilTextures(quality) {
  if (!canUseWorker()) {
    // diferido un cuadro para que primero se pinte la página
    return new Promise((resolve) => setTimeout(() => resolve(texturesFrom(drawOnMainThread(quality))), 0))
  }
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./soil.worker.js', import.meta.url), { type: 'module' })
    const fallback = () => {
      worker.terminate()
      resolve(texturesFrom(drawOnMainThread(quality)))
    }
    worker.onmessage = ({ data }) => {
      if (!data.ok) return fallback()
      worker.terminate()
      resolve(texturesFrom(data.bitmaps))
    }
    worker.onerror = fallback
    worker.postMessage({ quality })
  })
}

/** Reflejo diagonal muy suave para el vidrio (barato: va en el hilo principal). */
export function createGlassSheenTexture() {
  const tex = new CanvasTexture(drawGlassSheen())
  tex.colorSpace = SRGBColorSpace
  return tex
}
