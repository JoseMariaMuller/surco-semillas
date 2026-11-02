import { createContext, useContext } from 'react'
import { MathUtils, Vector3 } from 'three'
import { GROWTH_FRAMES, GROWTH_KEYS, STAGE_COUNT } from '../data/stages.js'

const LAST = STAGE_COUNT - 1

export function createGrowthState() {
  return {
    shown: 0, // progreso amortiguado 0..1
    s: 0, // etapa flotante 0..10
    i: 0, // etapa base
    t: 0, // mezcla entre i e i+1 (curva con meseta)
    stage: 0, // etapa más cercana (para la UI)
    g: Object.fromEntries(GROWTH_KEYS.map((k) => [k, 0])),
    time: 0,
    swap: 1, // transición entre cultivos (0..1)
  }
}

// Curva de quinto grado: aceleración y frenado sin cambios bruscos.
const smootherstep = (a, b, x) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// Avanza el estado a partir del progreso real del scroll.
export function stepGrowth(state, target, dt, reduced) {
  // Amortiguación suave: el valor mostrado persigue al scroll sin tirones.
  state.shown = reduced ? target : MathUtils.damp(state.shown, target, 3.2, dt)
  if (Math.abs(state.shown - target) < 1e-5) state.shown = target

  const s = state.shown * LAST
  const i = Math.min(Math.floor(s), LAST - 1)
  const f = s - i
  // Meseta corta para leer el panel; el resto del recorrido es movimiento continuo.
  // En movimiento reducido salta de etapa en etapa.
  const t = reduced ? (f < 0.5 ? 0 : 1) : smootherstep(0.1, 0.9, f)

  state.s = s
  state.i = i
  state.t = t
  state.stage = Math.round(i + t)

  const a = GROWTH_FRAMES[i]
  const b = GROWTH_FRAMES[i + 1]
  for (const k of GROWTH_KEYS) state.g[k] = a[k] + (b[k] - a[k]) * t
  state.time += dt
}

export function lerpVec(out, a, b, t) {
  return out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
}

export const tmpVec = new Vector3()

export const GrowthContext = createContext(null)
export const useGrowth = () => useContext(GrowthContext)
