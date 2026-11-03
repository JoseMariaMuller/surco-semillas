// Crecimiento del tallo de las dicotiledóneas (lo comparten el tallo, las flores y las vainas).

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Hojas verdaderas desplegadas (0..1). En la tabla compartida `hojas` vale 0,15 en la
 * emergencia (la primera hoja de los cereales); en las dicotiledóneas a esa altura solo
 * están los cotiledones, así que las hojas verdaderas arrancan después.
 * Queda: girasol ~V4 en la etapa 3 y ~V8 en la 4; soja ~V2 y ~V5.
 */
export const leafProgress = (g) => clamp01((g.g.hojas - 0.15) / 0.85)

/**
 * Cuántas hojas (de `count`) están desplegadas. La soja es indeterminada: en R1 todavía
 * le faltan nudos, que suma durante el llenado. Con esto: girasol V4 y V8 en las etapas 3 y 4;
 * soja V2 (2 unifoliadas + 1 trifoliada) y V5 (2 + 4), según Fehr y Caviness.
 */
export function visibleLeaves(crop, g, count) {
  const lp = leafProgress(g)
  const n = crop.id === 'soja' ? lp * count * (0.9 + 0.1 * clamp01(g.g.grano)) : lp * count
  return Math.min(count, n)
}
export const COT_NODE = 0.03 // altura del nudo cotiledonar (punta del hipocótilo)

/**
 * Fracción del tallo ya crecida. En las dicotiledóneas el tallo se alarga desde
 * las primeras hojas (no espera a la encañazón); los pesos son de cada cultivo.
 */
export const stemFraction = (m, g) => clamp01(m.grow[0] * g.g.hojas + m.grow[1] * g.g.tallo + m.grow[2] * g.g.grano)

// Altura actual de un nudo del tallo principal (fracción del largo del tallo)
export const nodeHeight = (layout, f, g) => COT_NODE + f * stemFraction(layout.m, g) * layout.stemLen

// Nudo más alto ya formado: la punta del tallo está justo arriba de la hoja más nueva.
export function topNode(crop, leaves, g) {
  const n = visibleLeaves(crop, g, leaves.length)
  if (n >= leaves.length - 1e-3) return 1
  const i = Math.min(leaves.length - 1, Math.floor(n))
  const j = Math.min(leaves.length - 1, i + 1)
  return leaves[i].node + (leaves[j].node - leaves[i].node) * (n - i)
}
export const APEX = 0.012

/**
 * Senescencia (0..1). La soja sigue verde en R6 (madurez 0,3) y recién amarillea
 * desde R7; el girasol empieza a secar sus hojas de abajo durante el llenado.
 */
export const senescence = (crop, g) =>
  crop.id === 'soja' ? clamp01((g.g.madurez - 0.35) / 0.65) : g.g.madurez

// Ramas de la soja: crecen desde la etapa de ramificación
export const branchGrowth = (g) => clamp01((g.g.tallo - 0.5) / 0.5)

/**
 * Posición actual de un sitio (nudo del tallo o punto de una rama), en el espacio
 * del tallo. Usa el mismo crecimiento que Stalk, así flores y vainas siguen a su nudo.
 * site: { node, branch (-1 = tallo), u (fracción de la rama), azimuth }
 */
export function nodePosition(layout, site, g, out) {
  const y = nodeHeight(layout, site.node, g)
  if (site.branch < 0) {
    const r = layout.m.stemR * 0.9
    return out.set(Math.cos(site.azimuth) * r, y, -Math.sin(site.azimuth) * r)
  }
  const b = layout.branches[site.branch]
  const along = site.u * b.len * branchGrowth(g)
  const s = Math.sin(b.tilt)
  return out.set(s * Math.cos(b.azimuth) * along, y + Math.cos(b.tilt) * along, -s * Math.sin(b.azimuth) * along)
}

// Vigor de la planta: las hojas de una planta joven son más chicas y se agrandan con ella.
export const leafVigor = (m, g) => 0.45 + 0.55 * Math.min(1, stemFraction(m, g) * 1.6)
