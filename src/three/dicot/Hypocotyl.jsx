import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Color, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3 } from 'three'
import { useGrowth } from '../growthState.js'
import { applyWind } from '../wind.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const STEM = new Color('#c9d79a')
const PALE = new Color('#e8e2b0') // cotiledones todavía bajo tierra
const YELLOW = new Color('#d8c25a')

// Tamaño de los cotiledones (largo, espesor, ancho), en metros
const COTYLEDON = {
  girasol: [0.025, 0.003, 0.012],
  soja: [0.02, 0.005, 0.014],
}
const TOP = 0.03 // altura final del nudo cotiledonar sobre el suelo

/**
 * Recorrido del hipocótilo para un valor de `brote`:
 * de 0 a 0,6 sube en gancho atravesando la tierra; de 0,6 a 1 se endereza.
 * Devuelve la curva, el punto de los cotiledones y el ángulo de la punta.
 */
function hookCurve(d, b) {
  // en germinación (brote 0,05) solo asoma la radícula: el gancho arranca después
  const p = clamp01((b - 0.05) / 0.55)
  const q = clamp01((b - 0.6) / 0.4)
  const yA = lerp(-d + 0.004, 0.012, p) + q * (TOP - 0.012)
  const seed = new Vector3(0, -d, 0)
  const pts = [seed, new Vector3(0.0005, (seed.y + yA) / 2, 0), new Vector3(0, yA, 0)]
  // gancho: la punta cuelga hacia abajo; al enderezarse queda vertical
  const bx = lerp(0.004, 0, q)
  const ex = lerp(0.008, 0, q)
  pts.push(new Vector3(bx, yA + lerp(0.002, 0.004, q), 0))
  pts.push(new Vector3(ex, yA + lerp(-0.008, 0.008, q), 0))
  const curve = new CatmullRomCurve3(pts, false, 'centripetal')
  const end = curve.getPointAt(1)
  const tan = curve.getTangentAt(1)
  return { curve, end, angle: Math.atan2(tan.y, tan.x) }
}

/** Germinación epigea: el hipocótilo en gancho saca los cotiledones de la tierra. */
export default function Hypocotyl({ crop, layout, quality }) {
  const g = useGrowth()
  const tube = useRef()
  const cotGroup = useRef()
  const cots = useRef([])
  const hi = quality === 'high'
  const segs = hi ? 28 : 16
  const radial = hi ? 8 : 5
  const radius = Math.max(0.0012, layout.m.stemR * 0.22)

  const built = useMemo(() => {
    const geometry = new TubeGeometry(hookCurve(crop.d, 0).curve, segs, radius, radial, false)
    const material = applyWind(new MeshStandardMaterial({ color: STEM, roughness: 0.55 }))
    const [l, t, w] = COTYLEDON[crop.id]
    const cotGeo = new SphereGeometry(1, hi ? 16 : 10, hi ? 10 : 6)
    cotGeo.scale(l / 2, t / 2, w / 2)
    cotGeo.translate(l / 2, 0, 0) // crece desde el nudo hacia afuera
    // verde de los cotiledones: la soja los tiene más amarillentos y carnosos
    const green = new Color(crop.paleta.hoja).lerp(new Color('#e3eab0'), 0.25)
    if (crop.id === 'soja') green.lerp(new Color('#d9d27a'), 0.4)
    const cotMat = applyWind(new MeshStandardMaterial({ color: PALE.clone(), roughness: 0.6 }))
    return { geometry, material, cotGeo, cotMat, green, last: -1 }
  }, [crop, segs, radius, radial, hi])

  useEffect(
    () => () => {
      built.geometry.dispose()
      built.material.dispose()
      built.cotGeo.dispose()
      built.cotMat.dispose()
    },
    [built],
  )

  useFrame(() => {
    const { brote, hojas } = g.g
    const visible = brote > 0.001
    tube.current.visible = visible
    cotGroup.current.visible = visible
    if (!visible) return

    if (Math.abs(brote - built.last) > 1e-4) {
      built.last = brote
      const { curve, end, angle } = hookCurve(crop.d, brote)
      // Recalcula el tubo con la misma cantidad de vértices y copia las posiciones
      const tmp = new TubeGeometry(curve, segs, radius, radial, false)
      built.geometry.attributes.position.array.set(tmp.attributes.position.array)
      built.geometry.attributes.normal.array.set(tmp.attributes.normal.array)
      built.geometry.attributes.position.needsUpdate = true
      built.geometry.attributes.normal.needsUpdate = true
      built.geometry.computeBoundingSphere()
      tmp.dispose()
      // Solo se ve la parte que ya creció (el gancho sube desde la semilla)
      cotGroup.current.position.copy(end)
      const q = clamp01((brote - 0.6) / 0.4)
      cots.current.forEach((c, i) => {
        if (!c) return
        const s = i === 0 ? 1 : -1
        // cerrados: los dos siguen la punta del gancho; abiertos: horizontales a cada lado
        const closed = angle + s * 0.12
        // el de la izquierda gira por abajo (−π − 0,15 apunta a la izquierda y apenas hacia arriba)
        const open = s > 0 ? 0.15 : -Math.PI - 0.15
        c.rotation.z = lerp(closed, open, q)
        c.position.z = s * 0.0015 * (1 - q)
      })
      built.cotMat.color.copy(PALE).lerp(built.green, q)
    }

    // Más adelante amarillean y caen, cuando la planta ya tiene varias hojas
    const yellow = clamp01((hojas - 0.5) / 0.3)
    const fall = clamp01((hojas - 0.8) / 0.15)
    if (brote >= 1) built.cotMat.color.copy(built.green).lerp(YELLOW, yellow)
    // Al principio los cotiledones siguen adentro de la semilla: salen cuando el gancho sube
    const out = clamp01((brote / 0.6 - 0.2) / 0.5)
    cotGroup.current.visible = out > 0.001
    cotGroup.current.scale.setScalar(Math.max((0.35 + 0.65 * out) * (1 - fall), 1e-4))
  })

  return (
    <group>
      <mesh ref={tube} geometry={built.geometry} material={built.material} castShadow frustumCulled={false} />
      <group ref={cotGroup}>
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              cots.current[i] = el
            }}
            geometry={built.cotGeo}
            material={built.cotMat}
            castShadow
          />
        ))}
      </group>
    </group>
  )
}
