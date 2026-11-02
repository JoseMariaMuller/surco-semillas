import { NOTA_VALORES, plantasPorHa } from '../../data/crops.js'
import styles from './StagePanels.module.css'

const fmt = new Intl.NumberFormat('es-AR')

function daysLabel(days) {
  if (days == null) return null
  if (days === 0) return 'Día de siembra'
  return `${fmt.format(days)} ${days === 1 ? 'día' : 'días'} desde la siembra`
}

/**
 * Un panel por etapa. Todos quedan en el DOM (el canvas es aria-hidden, así que
 * esta es la versión accesible de la historia); solo el activo se ve.
 */
export default function StagePanels({ stages, current, crop }) {
  const last = stages.length - 1
  return (
    <ol className={styles.panels} aria-label={`Ciclo del ${crop.nombre.toLowerCase()}, etapa por etapa`}>
      {stages.map((s) => {
        const isHero = s.index === 0
        const days = daysLabel(s.days)
        return (
          <li
            key={s.index}
            className={isHero ? styles.hero : styles.card}
            data-active={s.index === current}
          >
            {isHero ? (
              <>
                <h1 id="hero-titulo" className={styles.title}>
                  De una semilla a una hectárea.
                </h1>
                <p className={styles.lead}>
                  Bajá y mirá crecer {crop.nombre.toLowerCase()} desde la tierra hasta el lote, etapa por etapa.
                </p>
                <p className={styles.heroStage}>
                  <span className={`${styles.code} num`}>{s.code}</span> {s.text}
                </p>
                <p className={styles.hint}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  Bajá para empezar
                </p>
              </>
            ) : (
              <>
                <p className={styles.meta}>
                  <span className={`${styles.code} num`}>{s.code}</span>
                  {days && <span className="num">{days}</span>}
                </p>
                <h2 className={styles.name}>{s.name}</h2>
                <p className={styles.text}>{s.text}</p>
                {s.index === last && (
                  <>
                    <p className={styles.count}>
                      <strong className="num">{fmt.format(plantasPorHa(crop))}</strong> plantas de{' '}
                      {crop.nombre.toLowerCase()} en una hectárea, con {fmt.format(crop.densidad)} plantas por metro
                      cuadrado.
                    </p>
                    <p className={styles.note}>{NOTA_VALORES}</p>
                  </>
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
