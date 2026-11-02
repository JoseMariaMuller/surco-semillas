import { useEffect, useRef } from 'react'

// Progreso de 0 a 1 del scroll dentro de una sección alta con contenido sticky.
// Se guarda en un ref (no en estado) para no re-renderizar en cada scroll.
export function useScrollProgress(sectionRef) {
  const progress = useRef(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let frame = 0
    const measure = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const range = rect.height - window.innerHeight
      const p = range > 0 ? -rect.top / range : 0
      progress.current = Math.min(1, Math.max(0, p))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [sectionRef])

  return progress
}
