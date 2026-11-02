import { STAGE_COUNT } from '../data/stages.js'

// Lleva el scroll a la etapa `i` dentro de la sección alta de la historia.
export function scrollToStage(section, i, reduced) {
  if (!section) return
  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY
  const range = rect.height - window.innerHeight
  window.scrollTo({ top: top + (range * i) / (STAGE_COUNT - 1), behavior: reduced ? 'auto' : 'smooth' })
}
