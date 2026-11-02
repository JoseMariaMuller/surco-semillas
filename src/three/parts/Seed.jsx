import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial, SphereGeometry } from 'three'
import { useGrowth } from '../growthState.js'

// Semilla tratada: el curasemilla la tiñe de rosa. Al hincharse se aclara.
const DRY = new Color('#b8406c')
const WET = new Color('#e597b2')

function seedGeometry(shape, quality) {
  const g = new SphereGeometry(1, quality === 'high' ? 32 : 18, quality === 'high' ? 20 : 12)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    if (shape === 'ovalada') {
      // surco ventral a lo largo del grano, del lado que mira al vidrio
      if (z > 0) z -= 0.42 * z * Math.exp(-(y * y) / 0.025)
    } else if (shape === 'cuña') {
      // grano de maíz: más ancho arriba, en punta abajo, aplanado
      const k = (y + 1) / 2
      x *= 0.55 + 0.5 * k
      z *= 0.85
      if (y > 0.7) y = 0.7 + (y - 0.7) * 0.4
    } else if (shape === 'alargada') {
      // cáscara: leve arista longitudinal
      y += 0.06 * Math.cos(Math.atan2(z, y) * 4) * (1 - Math.abs(x))
    } else if (shape === 'esférica') {
      x *= 1
    }
    p.setXYZ(i, x, y, z)
  }
  g.computeVertexNormals()
  return g
}

export default function Seed({ crop, layout, quality }) {
  const ref = useRef()
  const g = useGrowth()
  const { seed } = layout.m

  const { geometry, material } = useMemo(
    () => ({
      geometry: seedGeometry(crop.semilla, quality),
      material: new MeshStandardMaterial({ color: DRY.clone(), roughness: 0.55 }),
    }),
    [crop.semilla, quality],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const sw = g.g.semilla
    const k = 1 + 0.25 * sw
    // largo sobre X, alto sobre Y, ancho sobre Z
    const isCorn = crop.semilla === 'cuña'
    ref.current.scale.set(
      ((isCorn ? seed.w : seed.len) / 2) * k,
      ((isCorn ? seed.len : seed.h) / 2) * k,
      ((isCorn ? seed.h : seed.w) / 2) * k,
    )
    material.color.copy(DRY).lerp(WET, sw)
  })

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      position={[0, -crop.d, 0]}
      rotation={[0.25, -0.35, crop.semilla === 'cuña' ? Math.PI : 0.18]}
    />
  )
}
