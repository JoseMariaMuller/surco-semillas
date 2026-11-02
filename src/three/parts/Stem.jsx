import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, CylinderGeometry, MeshStandardMaterial } from 'three'
import { useGrowth } from '../growthState.js'
import Leaf from './Leaf.jsx'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const PALE = new Color('#e9e4bd')

/** Coleoptile: el brote que sube desde la semilla hasta romper la superficie. */
export function Coleoptile({ crop, layout, quality }) {
  const g = useGrowth()
  const ref = useRef()
  const { geometry, material } = useMemo(() => {
    const r = layout.m.stemR * 0.55
    const geometry = new CylinderGeometry(r * 0.8, r, 1, quality === 'high' ? 10 : 6, 1)
    geometry.translate(0, 0.5, 0)
    const material = new MeshStandardMaterial({ color: PALE, roughness: 0.5, emissive: '#3b3420', emissiveIntensity: 0.3 })
    return { geometry, material }
  }, [layout, quality])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  const full = crop.d + 0.006
  useFrame(() => {
    const b = g.g.brote
    ref.current.visible = b > 0.001
    ref.current.scale.y = Math.max(0.0001, b * full)
  })
  return <mesh ref={ref} geometry={geometry} material={material} position={[0.0005, -crop.d + 0.001, 0]} />
}

/**
 * Vástago: tallo con nudos, hojas y la cabeza arriba.
 * `head` se renderiza en un grupo que sigue la punta del tallo.
 */
export default function Culm({ layout, palette, quality, head, scale = 1, groupRef }) {
  const g = useGrowth()
  const stemRef = useRef()
  const topRef = useRef()
  const leafRefs = useRef([])
  const nodeRefs = useRef([])
  const { m, stemLen, leaves } = layout

  const { stemGeo, nodeGeo, stemMat, green, ripe } = useMemo(() => {
    const seg = quality === 'high' ? 12 : 7
    const stemGeo = new CylinderGeometry(m.stemR * 0.72, m.stemR, 1, seg, 1)
    stemGeo.translate(0, 0.5, 0)
    const nodeGeo = new CylinderGeometry(m.stemR * 1.28, m.stemR * 1.28, m.stemR * 2.2, seg, 1)
    const green = new Color(palette.hoja).lerp(new Color('#d8e6a8'), 0.18)
    const ripe = new Color(palette.maduro)
    const stemMat = new MeshStandardMaterial({ color: green.clone(), roughness: 0.5 })
    return { stemGeo, nodeGeo, stemMat, green, ripe }
  }, [m, palette, quality])

  useEffect(
    () => () => {
      stemGeo.dispose()
      nodeGeo.dispose()
      stemMat.dispose()
    },
    [stemGeo, nodeGeo, stemMat],
  )

  useFrame(() => {
    const { brote, tallo, cabeza, madurez } = g.g
    // Los entrenudos de abajo se alargan primero; el pedúnculo (último tramo,
    // sobre el nudo de la hoja bandera) recién se estira cuando sale la cabeza.
    const topNode = m.nodes[m.nodes.length - 1]
    const nodeScale = tallo * stemLen
    const sheathTop = Math.min(0.05, stemLen * (1 - topNode)) * clamp01(tallo * 2)
    const peduncle = clamp01(cabeza) * (stemLen * (1 - topNode) - sheathTop)
    // Antes de encañar, el "tallo" es el pseudotallo de vainas al ras del suelo.
    const len = Math.max(brote * 0.012, topNode * nodeScale + sheathTop + peduncle)
    stemRef.current.visible = brote > 0.5
    stemRef.current.scale.y = Math.max(len, 0.0001)
    topRef.current.position.y = len

    // Nudos visibles desde la encañazón
    const showNodes = clamp01((tallo - 0.15) / 0.3)
    nodeRefs.current.forEach((n, i) => {
      if (!n) return
      n.visible = showNodes > 0.01
      n.position.y = m.nodes[i] * nodeScale
      n.scale.setScalar(0.6 + 0.4 * showNodes)
    })

    // Las hojas superiores suben con su nudo
    leafRefs.current.forEach((grp, i) => {
      if (grp) grp.position.y = leaves[i].node * nodeScale - 0.004
    })

    stemMat.color.copy(green).lerp(ripe, clamp01(madurez * 1.2 - 0.1))
  })

  return (
    <group scale={scale} ref={groupRef}>
      <mesh ref={stemRef} geometry={stemGeo} material={stemMat} castShadow />
      {m.nodes.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
          geometry={nodeGeo}
          material={stemMat}
          visible={false}
        />
      ))}
      {leaves.map((leaf, i) => (
        <group
          key={leaf.k}
          ref={(el) => {
            leafRefs.current[i] = el
          }}
        >
          <Leaf leaf={leaf} count={leaves.length} palette={palette} quality={quality} stemR={m.stemR * 0.9} />
        </group>
      ))}
      <group ref={topRef}>{head}</group>
    </group>
  )
}
