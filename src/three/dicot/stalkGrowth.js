// Crecimiento del tallo de las dicotiledóneas (lo comparten el tallo, las flores y las vainas).

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Hojas verdaderas desplegadas (0..1). En la tabla compartida `hojas` vale 0,15 en la
 * emergencia (la primera hoja de los cereales); en las dicotiledóneas a esa altura solo
 * están los cotiledones, así que las hojas verdaderas arrancan después.
 * Queda: girasol ~V4 en la etapa 3 y ~V8 en la 4; soja ~V2 y ~V5.
 */
export const leafProgress = (g) => clamp01((g.g.hojas - 0.15) / 0.85)
export const COT_NODE = 0.03 // altura del nudo cotiledonar (punta del hipocótilo)

/**
 * Fracción del tallo ya crecida. En las dicotiledóneas el tallo se alarga desde
 * las primeras hojas (no espera a la encañazón); los pesos son de cada cultivo.
 */
export const stemFraction = (m, g) => clamp01(m.grow[0] * g.g.hojas + m.grow[1] * g.g.tallo + m.grow[2] * g.g.grano)

// Altura actual de un nudo del tallo principal (fracción del largo del tallo)
export const nodeHeight = (layout, f, g) => COT_NODE + f * stemFraction(layout.m, g) * layout.stemLen

// Nudo más alto ya formado: la punta del tallo está justo arriba de la hoja más nueva.
export function topNode(leaves, g) {
  const h = leafProgress(g)
  if (h >= 0.999) return 1
  const n = h * leaves.length
  const i = Math.min(leaves.length - 1, Math.floor(n))
  const j = Math.min(leaves.length - 1, i + 1)
  return leaves[i].node + (leaves[j].node - leaves[i].node) * (n - i)
}
export const APEX = 0.012

// Vigor de la planta: las hojas de una planta joven son más chicas y se agrandan con ella.
export const leafVigor = (m, g) => 0.45 + 0.55 * Math.min(1, stemFraction(m, g) * 1.6)
