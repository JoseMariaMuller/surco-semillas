// Cálculo de la semilla necesaria para sembrar un lote.
//
// kg/ha       = plantas/m² × PMS × 100 / (PG% × logro%)
// semillas/ha = plantas/m² × 10.000 / (PG × logro)   (PG y logro como fracción)
//
// Ejemplo: trigo, 300 pl/m², PMS 38 g, PG 90 %, logro 85 % → ~149 kg/ha.

export const BOLSA_KG = 40
export const BOLSA_SEMILLAS = 80000

export function kgPorHa({ plantas, pms, pg, logro }) {
  return (plantas * pms * 100) / (pg * logro)
}

export function semillasPorHa({ plantas, pg, logro }) {
  return (plantas * 10000) / ((pg / 100) * (logro / 100))
}

/**
 * Devuelve kg/ha, kg totales y bolsas. El maíz se vende en bolsas de 80.000
 * semillas; el resto, en bolsas de 40 kg.
 */
export function calcularSemilla({ cultivo, hectareas, plantas, pms, pg, logro }) {
  const kgHa = kgPorHa({ plantas, pms, pg, logro })
  const kgTotal = kgHa * hectareas
  const semHa = semillasPorHa({ plantas, pg, logro })
  const semTotal = semHa * hectareas
  const porSemillas = cultivo === 'maiz'
  const bolsas = porSemillas ? Math.ceil(semTotal / BOLSA_SEMILLAS) : Math.ceil(kgTotal / BOLSA_KG)
  return {
    kgHa,
    kgTotal,
    semillasHa: semHa,
    semillasTotal: semTotal,
    bolsas,
    bolsa: porSemillas ? { tipo: 'semillas', cantidad: BOLSA_SEMILLAS } : { tipo: 'kg', cantidad: BOLSA_KG },
  }
}

const LIMITES = {
  hectareas: { min: 0.1, max: 100000, msg: 'Indicá las hectáreas con un número mayor que 0.' },
  plantas: { min: 1, max: 2000, msg: 'Indicá las plantas por metro cuadrado, entre 1 y 2000.' },
  pms: { min: 1, max: 1000, msg: 'Indicá el peso de mil semillas en gramos, entre 1 y 1000.' },
  pg: { min: 1, max: 100, msg: 'El poder germinativo va de 1 a 100 %.' },
  logro: { min: 1, max: 100, msg: 'El logro de implantación va de 1 a 100 %.' },
}

/** Convierte un texto de formulario en número (acepta coma decimal). */
export function aNumero(valor) {
  if (typeof valor === 'number') return valor
  const limpio = String(valor ?? '').trim().replace(',', '.')
  if (limpio === '') return NaN
  return Number(limpio)
}

/** Devuelve { campo: mensaje } con los campos que no sirven para calcular. */
export function validarSemilla(valores) {
  const errores = {}
  for (const [campo, { min, max, msg }] of Object.entries(LIMITES)) {
    const n = aNumero(valores[campo])
    if (!Number.isFinite(n) || n < min || n > max) errores[campo] = msg
  }
  return errores
}
