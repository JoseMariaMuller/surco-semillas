import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Color, Fog, Vector3 } from 'three'
import { CROPS } from '../data/crops.js'
import { SKY_FRAMES } from '../data/stages.js'
import { createGrowthState, GrowthContext, stepGrowth } from './growthState.js'
import { buildLayout } from './plantLayout.js'
import CameraRig from './CameraRig.jsx'
import Rhizotron from './Rhizotron.jsx'
import Plant from './Plant.jsx'
import { WIND } from './wind.js'

// Lee el progreso del scroll y actualiza el estado compartido antes que el resto.
function Driver({ state, progressRef, reduced, onStage }) {
  const lastStage = useRef(-1)
  useFrame((_, dt) => {
    stepGrowth(state, progressRef.current, Math.min(dt, 0.1), reduced)
    if (state.stage !== lastStage.current) {
      lastStage.current = state.stage
      onStage?.(state.stage)
    }
  }, -1)
  return null
}

const SKY_COLORS = SKY_FRAMES.map((f) => ({ sky: new Color(f.sky), sun: new Color(f.sunColor) }))

// Cielo, niebla y luz que cambian con la etapa.
function SkyAndLight({ state, shadows }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const sun = useRef()
  const hemi = useRef()
  const lamp = useRef()
  const fx = useMemo(() => {
    const bg = new Color(SKY_FRAMES[0].sky)
    return { bg, fog: new Fog(bg.clone(), 1, 10), lampOffset: new Vector3(-0.05, 0.06, 0.02) }
  }, [])

  // Asignar en un efecto (no en useMemo): en StrictMode el memo corre dos veces.
  useLayoutEffect(() => {
    scene.background = fx.bg
    scene.fog = fx.fog
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [scene, fx])

  useFrame(() => {
    const { i, t } = state
    const a = SKY_FRAMES[i]
    const b = SKY_FRAMES[i + 1]
    fx.bg.copy(SKY_COLORS[i].sky).lerp(SKY_COLORS[i + 1].sky, t)
    fx.fog.color.copy(fx.bg)
    fx.fog.near = a.fog[0] + (b.fog[0] - a.fog[0]) * t
    fx.fog.far = a.fog[1] + (b.fog[1] - a.fog[1]) * t
    // En el lote, la niebla acompaña la distancia de la cámara (cultivos altos la alejan más)
    const w = Math.min(1, Math.max(0, state.s - 8.5))
    if (w > 0) {
      const dist = camera.position.length()
      fx.fog.near += (Math.max(fx.fog.near, dist * 0.45) - fx.fog.near) * w
      fx.fog.far += (Math.max(fx.fog.far, dist * 2.3) - fx.fog.far) * w
    }
    sun.current.intensity = a.sun + (b.sun - a.sun) * t
    sun.current.color.copy(SKY_COLORS[i].sun).lerp(SKY_COLORS[i + 1].sun, t)
    hemi.current.intensity = a.hemi + (b.hemi - a.hemi) * t
    // El sol baja hacia la tarde en la madurez
    const s = state.s
    const elev = s < 2 ? 0.35 : s < 8 ? 0.35 + Math.min(1, (s - 2) / 3) * 0.6 : 0.95 - Math.min(1, (s - 8) / 1.5) * 0.55
    sun.current.position.set(-3 * Math.cos(elev), 4 * Math.sin(elev) + 0.6, 2.2)

    // Lámpara cálida del foso de observación: ilumina el vidrio mientras estamos bajo tierra.
    const under = Math.min(1, Math.max(0, 1 - (s - 1.6) / 1.2))
    lamp.current.intensity = under * 2.6
    lamp.current.visible = under > 0.01
    lamp.current.position.copy(camera.position).add(fx.lampOffset)
  })

  return (
    <>
      <pointLight ref={lamp} color="#ffc98f" decay={0} distance={0} />
      {/* Luz fija del foso: deja leer las raíces cuando la cámara ya está arriba */}
      <pointLight position={[0.1, -0.22, 0.55]} color="#ffd9ab" intensity={0.9} decay={2} distance={1.3} />
      <hemisphereLight ref={hemi} args={['#dfeaf0', '#5a4330', 0.6]} />
      <directionalLight
        ref={sun}
        position={[-2, 3, 2]}
        intensity={1}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-0.4}
        shadow-camera-near={0.1}
        shadow-camera-far={12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
      />
    </>
  )
}

// memo: el cambio de etapa re-renderiza la historia, pero la escena no lo necesita.
export default memo(function GrowthScene({ cropId, progressRef, reduced = false, mobile = false, onStage }) {
  const state = useMemo(() => createGrowthState(), [])
  const quality = mobile ? 'low' : 'high'
  const shadows = !mobile

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.75]}
      shadows={shadows ? 'percentage' : false}
      camera={{ fov: 38, near: 0.003, far: 220, position: [0, -CROPS[cropId].d, 0.12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <GrowthContext.Provider value={state}>
        <Driver state={state} progressRef={progressRef} reduced={reduced} onStage={onStage} />
        <SkyAndLight state={state} shadows={shadows} />
        <Crops cropId={cropId} state={state} quality={quality} reduced={reduced} />
      </GrowthContext.Provider>
    </Canvas>
  )
})

const SWAP_TIME = 0.3 // segundos que tarda en encogerse (y en crecer) la planta al cambiar de cultivo
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

/**
 * Cambio de cultivo sin perder la etapa: la planta actual se encoge en ~300 ms,
 * se desmonta (sus componentes liberan geometrías y materiales con dispose())
 * y crece la nueva. `state.swap` (0..1) lo leen la planta, las vecinas y la hectárea.
 */
function Crops({ cropId, state, quality, reduced }) {
  const [shownId, setShownId] = useState(cropId)
  const tr = useRef({ k: 1, pending: false })
  const crop = CROPS[shownId]
  const layout = useMemo(() => buildLayout(crop), [crop])

  // Si el cambio ya se aplicó, la nueva planta crece
  useLayoutEffect(() => {
    tr.current.pending = false
  }, [shownId])

  useFrame((_, dt) => {
    const t = tr.current
    if (cropId !== shownId) {
      if (reduced) t.k = 0
      else t.k = Math.max(0, t.k - dt / SWAP_TIME)
      if (t.k === 0 && !t.pending) {
        t.pending = true
        setShownId(cropId)
      }
    } else if (!t.pending && t.k < 1) {
      t.k = reduced ? 1 : Math.min(1, t.k + dt / SWAP_TIME)
    }
    const e = easeInOut(t.k)
    state.swap = e

    // Viento: amplitud proporcional a la altura del cultivo, más fuerte en el lote abierto
    WIND.uWindTime.value += reduced ? 0 : dt
    WIND.uWindH.value = crop.H
    WIND.uWindAmp.value = reduced ? 0 : crop.H * 0.03 * (1 + 0.6 * state.g.campo) * e
  }, -1)

  return (
    <>
      <CameraRig crop={crop} layout={layout} reduced={reduced} />
      <Rhizotron rowSpacing={crop.surco} quality={quality} />
      <Plant key={shownId} crop={crop} layout={layout} quality={quality} reduced={reduced} />
    </>
  )
}
