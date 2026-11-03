import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, CylinderGeometry, MeshStandardMaterial } from 'three'
import { useGrowth } from '../growthState.js'
import { applyWind } from '../wind.js'
import BroadLeaf from './BroadLeaf.jsx'
import { APEX, branchGrowth, leafProgress, leafVigor, nodeHeight, senescence, topNode } from './stalkGrowth.js'
import SoyNodes from './SoyNodes.jsx'

const clamp01 = (v) => Math.min(1, Math.max(0, v))


/**
 * Tallo de dicotiledónea: cilindro sin vainas, hojas con pecíolo y, en la soja,
 * ramas desde los nudos de abajo. `head` sigue la punta del tallo.
 */
export default function Stalk({ crop, layout, quality, head = null, children = null }) {
  const g = useGrowth()
  const stem = useRef()
  const top = useRef()
  const leafRefs = useRef([])
  const branchRefs = useRef([])
  const branchStems = useRef([])
  const { m, leaves, branches } = layout

  const built = useMemo(() => {
    const seg = quality === 'high' ? 12 : 7
    const geo = new CylinderGeometry(m.stemR * 0.55, m.stemR, 1, seg, 1)
    geo.translate(0, 0.5, 0)
    const branchGeo = new CylinderGeometry(m.stemR * 0.45, m.stemR * 0.7, 1, seg, 1)
    branchGeo.translate(0, 0.5, 0)
    const green = new Color(crop.paleta.hoja).lerp(new Color('#d8e6a8'), 0.2)
    const ripe = new Color(crop.paleta.maduro)
    // El tallo del girasol es áspero y mate
    const material = applyWind(new MeshStandardMaterial({ color: green.clone(), roughness: crop.id === 'girasol' ? 0.8 : 0.55 }))
    return { geo, branchGeo, material, green, ripe }
  }, [crop, m, quality])

  // Hojas de cada rama (trifoliadas a lo largo de la rama)
  const branchLeaves = useMemo(
    () =>
      branches.map((b, bi) =>
        Array.from({ length: b.leaves }, (_, j) => {
          const ref = leaves.find((l) => l.nodeIndex === b.nodeIndex + 1 + j) ?? leaves[leaves.length - 1]
          return {
            ...ref,
            k: 1000 + bi * 10 + j,
            u: 0.4 + j * 0.3,
            azimuth: (j % 2 ? Math.PI : 0) + 0.4 * (bi - 1),
            blade: ref.blade * 0.85,
            petiole: ref.petiole * 0.8,
          }
        }),
      ),
    [branches, leaves],
  )

  useEffect(
    () => () => {
      built.geo.dispose()
      built.branchGeo.dispose()
      built.material.dispose()
    },
    [built],
  )

  useFrame(() => {
    // sobre los cotiledones, el tallo aparece con la primera hoja verdadera
    const visible = leafProgress(g) > 0.001
    stem.current.visible = visible
    const len = nodeHeight(layout, topNode(leaves, g), g) + APEX
    // el tallo engrosa a medida que la planta crece
    const thick = leafVigor(m, g)
    stem.current.scale.set(thick, Math.max(len, 1e-4), thick)
    top.current.position.y = len

    leafRefs.current.forEach((grp, i) => {
      if (grp) grp.position.y = nodeHeight(layout, leaves[i].node, g)
    })

    const bg = branchGrowth(g)
    branches.forEach((b, i) => {
      const grp = branchRefs.current[i]
      if (!grp) return
      grp.visible = bg > 0.001
      grp.position.y = nodeHeight(layout, b.node, g)
      branchStems.current[i].scale.y = Math.max(b.len * bg, 1e-4)
    })

    built.material.color.copy(built.green).lerp(built.ripe, clamp01(senescence(crop, g) * 1.2 - 0.1))
  })

  return (
    <group>
      <mesh ref={stem} geometry={built.geo} material={built.material} castShadow visible={false} />
      {leaves.map((leaf, i) => (
        <group
          key={leaf.k}
          ref={(el) => {
            leafRefs.current[i] = el
          }}
        >
          <BroadLeaf crop={crop} m={m} leaf={leaf} count={leaves.length} quality={quality} />
        </group>
      ))}
      {branches.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            branchRefs.current[i] = el
          }}
          rotation-y={b.azimuth}
          visible={false}
        >
          <group rotation-z={-b.tilt}>
            <mesh
              ref={(el) => {
                branchStems.current[i] = el
              }}
              geometry={built.branchGeo}
              material={built.material}
              castShadow
            />
            {branchLeaves[i].map((leaf) => (
              <group key={leaf.k} position-y={leaf.u * b.len}>
                <BranchLeaf crop={crop} m={m} leaf={leaf} quality={quality} branchLen={b.len} />
              </group>
            ))}
          </group>
        </group>
      ))}
      <group ref={top}>{head}</group>
      {crop.cabeza === 'vainas' && <SoyNodes crop={crop} layout={layout} quality={quality} />}
      {children}
    </group>
  )
}

// Hoja de rama: crece con la rama y sube con su punta.
function BranchLeaf({ crop, m, leaf, quality, branchLen }) {
  const ref = useRef()
  const growth = useMemo(() => (g) => clamp01((branchGrowth(g) - leaf.u * 0.6) / 0.4), [leaf.u])
  const g = useGrowth()
  useFrame(() => {
    // la hoja acompaña el largo actual de la rama
    ref.current.position.y = leaf.u * branchLen * (branchGrowth(g) - 1)
  })
  return (
    <group ref={ref}>
      <BroadLeaf crop={crop} m={m} leaf={leaf} count={1} quality={quality} growth={growth} order={0.3} />
    </group>
  )
}
