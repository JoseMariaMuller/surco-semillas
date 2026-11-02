import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { CROPS, plantasPorHa } from '../../data/crops.js'
import { getStages, STAGE_COUNT } from '../../data/stages.js'
import { useScrollProgress } from '../../hooks/useScrollProgress.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'
import SeedLoader from './SeedLoader.jsx'
import CropSelector from '../CropSelector/CropSelector.jsx'
import styles from './GrowthStory.module.css'

const GrowthScene = lazy(() => import('../../three/GrowthScene.jsx'))

const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches

const fmt = new Intl.NumberFormat('es-AR')

export default function GrowthStory({ cropId, onCropChange }) {
  const sectionRef = useRef(null)
  const progressRef = useScrollProgress(sectionRef)
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0)
  const [mobile] = useState(isMobile)
  const crop = CROPS[cropId]
  const stages = useMemo(() => getStages(cropId), [cropId])
  const current = stages[stage]

  return (
    <section
      id="crecimiento"
      ref={sectionRef}
      className={styles.story}
      style={{ '--stages': STAGE_COUNT }}
      aria-labelledby="hero-titulo"
    >
      <div id="inicio" className={styles.sticky}>
        <div className={styles.stage}>
          <Suspense fallback={<SeedLoader />}>
            <GrowthScene
              cropId={cropId}
              progressRef={progressRef}
              reduced={reduced}
              mobile={mobile}
              onStage={setStage}
            />
          </Suspense>
        </div>

        <div className={styles.selector}>
          <CropSelector value={cropId} onChange={onCropChange} />
        </div>

        <div className={styles.hero} hidden={stage !== 0}>
          <h1 id="hero-titulo" className={styles.title}>
            De una semilla a una hectárea.
          </h1>
          <p className={styles.lead}>
            Bajá y mirá crecer {crop.nombre.toLowerCase()} desde la tierra hasta el lote, etapa por etapa.
          </p>
          <p className={styles.hint}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Bajá para empezar
          </p>
        </div>

        {stage > 0 && (
          <div className={styles.panel} aria-live="polite">
            <p className={styles.code}>
              <span className="num">{current.code}</span>
              {current.days != null && (
                <span className="num">
                  {current.days} {current.days === 1 ? 'día' : 'días'} desde la siembra
                </span>
              )}
            </p>
            <h2 className={styles.stageName}>{current.name}</h2>
            <p>{current.text}</p>
            {stage === STAGE_COUNT - 1 && (
              <p className={styles.count}>
                <strong className="num">{fmt.format(plantasPorHa(crop))}</strong> plantas de{' '}
                {crop.nombre.toLowerCase()} en una hectárea.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
