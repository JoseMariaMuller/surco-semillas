// Detecta si el navegador puede crear un contexto WebGL.
let cached = null

export function hasWebGL() {
  if (cached !== null) return cached
  try {
    // ?sin-webgl en la URL fuerza la versión estática (útil para probarla)
    if (new URLSearchParams(window.location.search).has('sin-webgl')) return (cached = false)
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    cached = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
