// Resolución de cada textura de suelo según la calidad y zona del parche de detalle.

// Zona del parche de detalle (m): cubre lo que encuadran las etapas 0 y 1.
export const DETAIL = { x0: -0.17, x1: 0.13, d0: 0, d1: 0.19 }

export const SOIL_PX = {
  high: { profile: 2048, detail: 2600, field: 512 },
  low: { profile: 1024, detail: 1400, field: 256 },
}
