import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CROPS } from '../../data/crops.js'
import { getStages, STAGE_COUNT } from '../../data/stages.js'
import { useScrollProgress } from '../../hooks/useScrollProgress.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'
import { useInView } from '../../hooks/useInView.js'
import { hasWebGL } from '../../utils/webgl.js'
import { scrollToStage } from '../../utils/scrollToStage.js'
import CropSelector from '../CropSelector/CropSelector.jsx'
import StaticFallback from '../StaticFallback/StaticFallback.jsx'
import SeedLoader from './SeedLoader.jsx'
import StagePanels from './StagePanels.jsx'
import ProgressRail from './ProgressRail.jsx'
import styles from './GrowthStory.module.css'

const GrowthScene = lazy(() => import('../../three/GrowthScene.jsx'))

const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches

// Sin WebGL: la etapa sale directamente del scroll.
function useStageFromScroll(progressRef, enabled, onStage) {
  useEffect(() => {
    if (!enabled) return
    let frame = 0
    let last = -1
    const tick = () => {
      const s = Math.round(progressRef.current * (STAGE_COUNT - 1))
      if (s !== last) {
        last = s
        onStage(s)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [progressRef, enabled, onStage])
}

export default function GrowthStory({ cropId, onCropChange }) {
  const sectionRef = useRef(null)
  const progressRef = useScrollProgress(sectionRef)
  const reduced = useReducedMotion()
  const inView = useInView(sectionRef)
  const [stage, setStage] = useState(0)
  const [mobile] = useState(isMobile)
  const [webgl] = useState(hasWebGL)
  const crop = CROPS[cropId]
  const stages = useMemo(() => getStages(cropId), [cropId])

  useStageFromScroll(progressRef, !webgl && inView, setStage)

  const goTo = useCallback((i) => scrollToStage(sectionRef.current, i, reduced), [reduced])

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
          {webgl ? (
            <Suspense fallback={<SeedLoader />}>
              <GrowthScene
                cropId={cropId}
                progressRef={progressRef}
                reduced={reduced}
                mobile={mobile}
                active={inView}
                onStage={setStage}
              />
            </Suspense>
          ) : (
            <StaticFallback crop={crop} stage={stage} />
          )}
        </div>

        <StagePanels stages={stages} current={stage} crop={crop} />

        <div className={styles.selector}>
          <CropSelector value={cropId} onChange={onCropChange} />
        </div>

        <ProgressRail stages={stages} current={stage} progressRef={progressRef} active={inView} onGo={goTo} />
      </div>
    </section>
  )
}
