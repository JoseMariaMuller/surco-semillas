import { useEffect, useRef } from 'react'
import styles from './ProgressRail.module.css'

/**
 * Riel de progreso: una marca por etapa, cada una es un botón que lleva a esa etapa.
 * El relleno sigue al scroll leyendo el ref del progreso (sin estado de React).
 */
export default function ProgressRail({ stages, current, progressRef, active, onGo }) {
  const railRef = useRef(null)

  useEffect(() => {
    if (!active) return
    let frame = 0
    let last = -1
    const tick = () => {
      const p = progressRef.current
      if (p !== last && railRef.current) {
        last = p
        railRef.current.style.setProperty('--p', p.toFixed(4))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, progressRef])

  const last = stages.length - 1

  return (
    <nav className={styles.rail} aria-label="Etapas del cultivo" ref={railRef}>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} />
      </div>
      <ol className={styles.list}>
        {stages.map((s) => (
          <li key={s.index} className={styles.item} style={{ '--i': s.index / last }}>
            <button
              type="button"
              className={styles.mark}
              aria-current={s.index === current ? 'step' : undefined}
              // el nombre accesible empieza con el texto visible (el código de la etapa)
              aria-label={`${s.short}: ir a ${s.name.toLowerCase()}`}
              onClick={() => onGo(s.index)}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={`${styles.code} num`}>{s.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
