import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { cameraFrame, FOV_FRAMES, STAGE_COUNT } from '../data/stages.js'
import { lerpVec, useGrowth } from './growthState.js'

// Mueve la cámara entre los fotogramas de cada etapa con la misma curva que el crecimiento.
export default function CameraRig({ crop, layout }) {
  const g = useGrowth()
  const camera = useThree((s) => s.camera)

  const frames = useMemo(
    () => Array.from({ length: STAGE_COUNT }, (_, i) => cameraFrame(i, crop, layout.headCenter, layout.earCenter)),
    [crop, layout],
  )
  const tmp = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), off: new Vector3() }), [])
  const view = useMemo(() => ({ w: 0, h: 0, x: 0, y: 0 }), [])

  useFrame((state) => {
    const { i, t } = g
    lerpVec(tmp.pos, frames[i].pos, frames[i + 1].pos, t)
    lerpVec(tmp.look, frames[i].look, frames[i + 1].look, t)

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
