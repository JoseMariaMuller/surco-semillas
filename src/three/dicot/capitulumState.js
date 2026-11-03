// Momento de las flores del disco del girasol, a partir del estado de crecimiento.

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Fracción del disco (del borde hacia el centro) que ya abrió (antesis, R5.x).
 * Nunca retrocede: sube con el polen hasta R5.5 (~la mitad en la etapa 7) y
 * termina de completarse con el llenado.
 */
export const discAnthesis = (g) => clamp01(0.45 * g.g.polen + (g.g.grano - 0.1) / 0.9)

/** Fracción del disco con flores ya pasadas (aquenios); nunca supera lo abierto. */
export const discSpent = (g) => Math.min(clamp01((g.g.grano - 0.2) / 0.6), discAnthesis(g))
