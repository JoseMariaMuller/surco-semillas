import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, MeshStandardMaterial, SphereGeometry } from 'three'
import { useGrowth } from '../growthState.js'

// Semilla tratada: el curasemilla la tiñe de rosa. Al hincharse se aclara.
const DRY = new Color('#b8406c')
const WET = new Color('#e597b2')

// Sombreado por vértice (multiplica el color del curasemilla): rayas del aquenio
// y el hilo de la soja. El resto de las semillas queda en 1.
function seedShade(shape, x, y, z) {
  if (shape === 'aquenio') {
    // rayas a lo largo del aquenio, negras y grises
    const a = Math.atan2(z, y)
    return Math.sin(a * 9) > 0.35 ? 0.38 : 0.92
  }
  if (shape === 'redonda') {
    // hilo: mancha alargada oscura de un costado
    const k = Math.exp(-((x * x) / 0.12 + (y * y) / 0.02))
    return z > 0 ? 1 - 0.6 * k : 1
  }
  return 1
}

function seedGeometry(shape, quality) {
  const g = new SphereGeometry(1, quality === 'high' ? 32 : 18, quality === 'high' ? 20 : 12)
  const p = g.attributes.position
  const col = new Float32Array(p.count * 3)
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
    } else if (shape === 'aquenio') {
      // lágrima: redondeado atrás, en punta adelante
      const taper = 1 - 0.5 * ((x + 1) / 2) ** 1.4
      y *= taper
      z *= taper
    } else if (shape === 'redonda') {
      y *= 0.92
    }
    const k = seedShade(shape, x, y, z)
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k
    p.setXYZ(i, x, y, z)
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
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
      material: new MeshStandardMaterial({ color: DRY.clone(), roughness: 0.55, vertexColors: true }),
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
