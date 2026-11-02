import { CROPS } from '../../data/crops.js'
import { STAGE_COUNT } from '../../data/stages.js'
import styles from './GrowthStory.module.css'

export default function GrowthStory({ cropId }) {
  const crop = CROPS[cropId]
  return (
    <section
      id="crecimiento"
      className={styles.story}
      style={{ '--stages': STAGE_COUNT }}
      aria-labelledby="hero-titulo"
    >
      <div id="inicio" className={styles.sticky}>
        <div className={styles.stage} aria-hidden="true" />
        <div className={styles.hero}>
          <h1 id="hero-titulo" className={styles.title}>
            De una semilla a una hectárea.
          </h1>
          <p className={styles.lead}>
            Bajá y mirá crecer {crop.nombre.toLowerCase()} desde la tierra hasta el lote, etapa por etapa.
          </p>
        </div>
      </div>
    </section>
  )
}
