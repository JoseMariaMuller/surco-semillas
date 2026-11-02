import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import { useGrowth } from '../growthState.js'
import { createLeafGeometry, shapeLeaf } from './leafGeometry.js'

const DRY_TINT = new Color('#b59a68')
const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Hoja que se despliega en su turno: la k-ésima de N crece cuando
 * hojas × N supera k. Escala de 0 a 1 y se abre desde la vertical.
 */
export default function Leaf({ leaf, count, palette, quality, stemR }) {
  const g = useGrowth()
  const ref = useRef()
  const { geometry, material, green, ripe, last } = useMemo(() => {
    const geometry = createLeafGeometry(quality === 'high' ? 18 : 10)
    const green = new Color(palette.hoja)
    const ripe = new Color(palette.maduro)
    const material = new MeshStandardMaterial({
      color: green.clone(),
      vertexColors: true,
      side: DoubleSide,
      roughness: 0.62,
    })
    // `last` vive con la geometría: si se reconstruye, se vuelve a formar.
    return { geometry, material, green, ripe, last: { grow: -1, open: -1 } }
  }, [palette, quality])
  // Parámetros fijos de forma (evita crear objetos en cada cuadro).
  const params = useMemo(() => ({ ...leaf, offset: stemR }), [leaf, stemR])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const grow = clamp01(g.g.hojas * count - leaf.k)
    const visible = grow > 0.001
    ref.current.visible = visible
    if (!visible) return
    // se abre un poco después de alargarse
    const open = clamp01(grow * 1.25 - 0.15)
    const l = last
    if (Math.abs(l.grow - grow) > 1e-4 || Math.abs(l.open - open) > 1e-4) {
      shapeLeaf(geometry, params, Math.max(grow, 0.02), open)
      l.grow = grow
      l.open = open
    }
    // Madurez: las hojas de abajo se secan primero
    const low = 1 - leaf.k / Math.max(1, count - 1)
    const dry = clamp01(g.g.madurez * 1.5 - (1 - low) * 0.5)
    material.color.copy(green).lerp(ripe, dry)
    if (dry > 0.85) material.color.lerp(DRY_TINT, (dry - 0.85) * 2)
  })

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      rotation-y={leaf.azimuth}
      castShadow
      frustumCulled={false}
    />
  )
}
