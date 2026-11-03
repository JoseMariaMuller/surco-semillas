import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, CylinderGeometry, DoubleSide, MeshStandardMaterial } from 'three'
import { useGrowth } from '../growthState.js'
import { applyWind } from '../wind.js'
import { createBroadLeafGeometry, shapeBroadLeaf } from './broadLeafGeometry.js'
import { leafProgress, leafVigor, senescence } from './stalkGrowth.js'

const DRY_TINT = new Color('#8a6a45')
const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Proporción ancho / largo de cada tipo de lámina
const RATIO = { acorazonada: 0.85, unifoliada: 0.7, trifoliada: 0.58 }
// Folíolos de la trifoliada: [giro en Y, escala, avance sobre el raquis (fracción de la lámina)]
const LEAFLETS = {
  trifoliada: [
    [0, 1, 0.16],
    [1.05, 0.86, 0],
    [-1.05, 0.86, 0],
  ],
  acorazonada: [[0, 1, 0]],
  unifoliada: [[0, 1, 0]],
}

/**
 * Hoja de dicotiledónea: pecíolo inclinado y una lámina (girasol, unifoliada de soja)
 * o tres folíolos (trifoliada de soja). Se despliega en su turno, como las de los cereales.
 * - growth(g): 0..1, opcional (las hojas de las ramas crecen con la rama)
 * - order: 0 (abajo) .. 1 (arriba), para el secado y la caída de la madurez
 */
export default function BroadLeaf({ crop, m, leaf, count, quality, growth, order }) {
  const g = useGrowth()
  const root = useRef()
  const petiole = useRef()
  const bladeGroup = useRef()
  const soy = crop.id === 'soja'
  const low = order ?? leaf.k / Math.max(1, count - 1)

  const built = useMemo(() => {
    const hi = quality === 'high'
    const shape = leaf.kind === 'acorazonada' ? 'acorazonada' : 'ovalada'
    const blade = createBroadLeafGeometry(hi ? 12 : 7, shape)
    const petGeo = new CylinderGeometry(0.0009, 0.0013, 1, hi ? 6 : 4, 1)
    petGeo.translate(0, 0.5, 0)
    const green = new Color(crop.paleta.hoja)
    const ripe = new Color(crop.paleta.maduro)
    // Emisivo leve: la lámina es algo traslúcida y el envés no queda negro a contraluz
    const material = applyWind(
      new MeshStandardMaterial({
        color: green.clone(),
        vertexColors: true,
        side: DoubleSide,
        roughness: 0.6,
        emissive: green.clone().multiplyScalar(0.22),
      }),
    )
    const petMat = applyWind(new MeshStandardMaterial({ color: green.clone(), roughness: 0.55 }))
    return { blade, petGeo, material, petMat, green, ripe, last: { grow: -1, open: -1, droop: -1 } }
  }, [crop, leaf.kind, quality])

  const params = useMemo(
    () => ({ blade: leaf.blade, ratio: RATIO[leaf.kind], droop: leaf.droop, fold: soy ? 0.12 : 0.18 }),
    [leaf, soy],
  )

  useEffect(
    () => () => {
      built.blade.dispose()
      built.petGeo.dispose()
      built.material.dispose()
      built.petMat.dispose()
    },
    [built],
  )

  useFrame(() => {
    const grow = growth ? growth(g) : clamp01(leafProgress(g) * count - leaf.k)
    // tamaño: lo que se desplegó, por el vigor de la planta (la apertura no depende del vigor)
    const size = grow * leafVigor(m, g)
    // Madurez: se secan de abajo hacia arriba; la soja además las pierde
    const dry = clamp01(senescence(crop, g) * 1.5 - low * 0.5)
    const fall = soy ? clamp01((g.g.madurez - (0.55 + 0.3 * low)) / 0.15) : 0
    const visible = grow > 0.001 && fall < 0.999
    root.current.visible = visible
    if (!visible) return

    const open = clamp01(grow * 1.25 - 0.15)
    // El girasol seco cuelga
    const droop = params.droop + (soy ? 0 : dry * 0.9)
    const l = built.last
    if (Math.abs(l.grow - size) > 1e-4 || Math.abs(l.open - open) > 1e-4 || Math.abs(l.droop - droop) > 1e-3) {
      shapeBroadLeaf(built.blade, { ...params, droop }, Math.max(size, 0.02), open)
      l.grow = size
      l.open = open
      l.droop = droop
    }

    // Pecíolo: de casi vertical a su inclinación final
    const lean = leaf.lean * (0.35 + 0.65 * open) + (soy ? 0 : dry * 0.5)
    const plen = leaf.petiole * Math.max(size, 0.02)
    petiole.current.scale.set(1, plen, 1)
    petiole.current.rotation.z = -lean
    bladeGroup.current.position.set(Math.sin(lean) * plen, Math.cos(lean) * plen, 0)

    // Al caer, la hoja se achica y baja
    root.current.scale.setScalar(Math.max(1 - fall, 1e-4))
    root.current.position.y = -0.02 * fall

    built.material.color.copy(built.green).lerp(built.ripe, dry)
    if (dry > 0.85) built.material.color.lerp(DRY_TINT, (dry - 0.85) * 2)
    built.material.emissive.copy(built.material.color).multiplyScalar(0.22)
    built.petMat.color.copy(built.material.color)
  })

  return (
    <group ref={root} rotation-y={leaf.azimuth}>
      <mesh ref={petiole} geometry={built.petGeo} material={built.petMat} castShadow />
      <group ref={bladeGroup}>
        {LEAFLETS[leaf.kind].map(([rot, s, ahead], i) => (
          <mesh
            key={i}
            geometry={built.blade}
            material={built.material}
            rotation-y={rot}
            position-x={ahead * leaf.blade}
            scale={s}
            castShadow
            frustumCulled={false}
          />
        ))}
      </group>
    </group>
  )
}
