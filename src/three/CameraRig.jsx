import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3 } from 'three'
import { cameraFrame, FOV_FRAMES, STAGE_COUNT } from '../data/stages.js'
import { useGrowth } from './growthState.js'

// Mueve la cámara entre los fotogramas de cada etapa con la misma curva que el crecimiento.
export default function CameraRig({ crop, layout, reduced = false }) {
  const g = useGrowth()
  const camera = useThree((s) => s.camera)

  // Recorrido continuo: splines por las posiciones y los puntos de mira de cada etapa.
  // La versión centrípeta evita rulos y sobrepasos entre etapas de escalas muy distintas.
  const paths = useMemo(() => {
    const frames = Array.from({ length: STAGE_COUNT }, (_, i) =>
      cameraFrame(i, crop, layout.headCenter, layout.earCenter),
    )
    return {
      frames,
      pos: new CatmullRomCurve3(frames.map((f) => new Vector3(...f.pos)), false, 'centripetal'),
      look: new CatmullRomCurve3(frames.map((f) => new Vector3(...f.look)), false, 'centripetal'),
    }
  }, [crop, layout])
  const tmp = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), off: new Vector3() }), [])
  const view = useMemo(() => ({ w: 0, h: 0, x: 0, y: 0 }), [])

  useFrame((state) => {
    const { i, t } = g
    if (reduced) {
      // Movimiento reducido: saltos directos entre fotogramas.
      const f = paths.frames[t < 0.5 ? i : i + 1]
      tmp.pos.set(...f.pos)
      tmp.look.set(...f.look)
    } else {
      const u = (i + t) / (STAGE_COUNT - 1)
      paths.pos.getPoint(u, tmp.pos)
      paths.look.getPoint(u, tmp.look)
    }

    const { width, height } = state.size
    const aspect = width / height
    const narrow = width <= 760 || aspect < 0.8

    // En pantallas angostas, alejar para que la planta entre completa.
    if (aspect < 0.8) {
      const k = 1 + 0.5 * Math.min(1, (0.8 - aspect) / 0.25)
      tmp.off.subVectors(tmp.pos, tmp.look).multiplyScalar(k)
      tmp.pos.copy(tmp.look).add(tmp.off)
    }

    camera.position.copy(tmp.pos)
    camera.lookAt(tmp.look)

    let dirty = false
    const fov = FOV_FRAMES[i] + (FOV_FRAMES[i + 1] - FOV_FRAMES[i]) * t
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov
      dirty = true
    }

    // Plano cercano proporcional a la distancia: precisión en primeros planos y en el lote.
    const dist = tmp.pos.distanceTo(tmp.look)
    const near = Math.min(0.2, Math.max(0.002, dist * 0.03))
    if (Math.abs(camera.near - near) > 1e-4) {
      camera.near = near
      dirty = true
    }

    // Corre el encuadre para que la planta no quede detrás del panel:
    // a la derecha en desktop (panel a la izquierda) y arriba en mobile (tarjeta abajo).
    const x = narrow ? 0 : -0.17 * width
    const y = narrow ? 0.13 * height : 0
    if (view.w !== width || view.h !== height || view.x !== x || view.y !== y) {
      Object.assign(view, { w: width, h: height, x, y })
      camera.setViewOffset(width, height, x, y, width, height)
      dirty = true
    }

    if (dirty) camera.updateProjectionMatrix()
  })

  return null
}
