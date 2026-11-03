import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  Euler,
} from 'three'
import { useGrowth } from '../growthState.js'
import { applyWind } from '../wind.js'
import { discAnthesis, discSpent } from './capitulumState.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

// Colores de las flores del disco según su momento
const CLOSED = new Color('#7d8a34') // botones verdes antes de abrir
const POLLEN = new Color('#e3a51e') // flor abierta con polen
const SPENT = new Color('#5b3d26') // flor pasada
const BRACT = new Color('#4f7d2f')
const BACK_YELLOW = new Color('#d9c25a')
const BACK_BROWN = new Color('#6b4a2c')

const RAYS = 32
const BRACTS = 26
const NECK = 0.06 // cuello entre el último nudo y el capítulo

/**
 * Capítulo del girasol: botón en estrella (R1), disco que se abre con las liguladas (R4),
 * antesis en anillos del borde al centro (R5), aquenios que se oscurecen (R6–R7)
 * y, en la madurez, el cuello curvado con el capítulo mirando al suelo y el dorso marrón.
 */
export default function Capitulum({ crop, layout, quality }) {
  const g = useGrowth()
  const bendRef = useRef()
  const faceRef = useRef()
  const scaleRef = useRef()
  const hi = quality === 'high'
  const R = layout.m.disc / 2
  const N = hi ? 600 : 250

  const built = useMemo(() => {
    const flor = new Color(crop.paleta.flor)
    const grano = new Color(crop.paleta.grano)

    // Receptáculo: cilindro chato con el frente en z = 0
    const discGeo = new CylinderGeometry(R, R * 0.92, 0.028, hi ? 40 : 20, 1)
    discGeo.rotateX(Math.PI / 2)
    discGeo.translate(0, 0, -0.016)
    // Emisivo leve: a contraluz el dorso no queda negro
    const backMat = applyWind(new MeshStandardMaterial({ color: BRACT.clone(), roughness: 0.7, emissive: BRACT.clone().multiplyScalar(0.25) }))

    // Frente liso con el color promedio: lo copian los vecinos (las flores del disco no)
    const capGeo = new CircleGeometry(R * 0.98, hi ? 40 : 20)
    const capMat = applyWind(new MeshStandardMaterial({ color: CLOSED.clone(), roughness: 0.8 }))

    // Flores del disco / aquenios en espiral de Vogel
    const c = R / Math.sqrt(N)
    const floretGeo = new SphereGeometry(1, 6, 4)
    floretGeo.scale(c * 1.05, c * 1.05, c * 1.5)
    const floretMat = applyWind(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }))
    const florets = new InstancedMesh(floretGeo, floretMat, N)
    florets.userData.noMirror = true
    florets.frustumCulled = false
    const m = new Matrix4()
    const ring = new Float32Array(N) // 0 centro .. 1 borde
    for (let n = 0; n < N; n++) {
      const r = R * 0.96 * Math.sqrt((n + 0.5) / N)
      const a = n * GOLDEN
      // el disco es apenas cóncavo en el centro
      m.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, -0.004 * (1 - (r / R) ** 2))
      florets.setMatrixAt(n, m)
      florets.setColorAt(n, CLOSED)
      ring[n] = r / R
    }

    // Liguladas: lámina amarilla alargada desde el borde
    const rayLen = R * 0.62
    const rayGeo = new SphereGeometry(1, hi ? 10 : 6, 4)
    rayGeo.scale(rayLen / 2, rayLen * 0.11, 0.0015)
    rayGeo.translate(rayLen / 2, 0, 0)
    const rayMat = applyWind(new MeshStandardMaterial({ color: flor.clone(), roughness: 0.55, side: DoubleSide, emissive: flor.clone().multiplyScalar(0.15) }))
    const rays = new InstancedMesh(rayGeo, rayMat, RAYS)
    rays.frustumCulled = false

    // Brácteas verdes alrededor (cierran el botón y quedan atrás del disco)
    const bractLen = R * 0.42
    const bractGeo = new SphereGeometry(1, 8, 4)
    bractGeo.scale(bractLen / 2, bractLen * 0.22, 0.0016)
    bractGeo.translate(bractLen / 2, 0, 0)
    const bractMat = applyWind(new MeshStandardMaterial({ color: BRACT.clone(), roughness: 0.65, side: DoubleSide }))
    const bracts = new InstancedMesh(bractGeo, bractMat, BRACTS)
    bracts.frustumCulled = false

    const neckGeo = new CylinderGeometry(layout.m.stemR * 0.5, layout.m.stemR * 0.55, NECK, hi ? 10 : 6, 1)
    neckGeo.translate(0, NECK / 2, 0)

    return {
      discGeo, backMat, capGeo, capMat, floretGeo, floretMat, florets, ring,
      rayGeo, rayMat, rays, bractGeo, bractMat, bracts, neckGeo, flor, grano,
      tmp: { m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3(), c: new Color() },
      last: { open: -1, rays: -1, colors: '' },
    }
  }, [crop, layout, R, N, hi])

  useEffect(
    () => () => {
      const b = built
      ;[b.discGeo, b.capGeo, b.floretGeo, b.rayGeo, b.bractGeo, b.neckGeo].forEach((x) => x.dispose())
      ;[b.backMat, b.capMat, b.floretMat, b.rayMat, b.bractMat].forEach((x) => x.dispose())
      ;[b.florets, b.rays, b.bracts].forEach((x) => x.dispose())
    },
    [built],
  )

  useFrame(() => {
    const { tallo, cabeza, grano, madurez } = g.g
    const bud = clamp01((tallo - 0.5) / 0.5)
    const visible = bud > 0.001
    bendRef.current.visible = visible
    if (!visible) return

    // Tamaño: botón de ~2 cm en R1, disco completo con la apertura
    const size = 0.15 * bud + 0.85 * cabeza
    scaleRef.current.scale.setScalar(Math.max(size, 1e-3))

    // Orientación: el botón mira al cielo; abierto mira al este, 20° arriba;
    // en la madurez el cuello se curva y el capítulo queda mirando al suelo.
    const droop = clamp01((madurez - 0.15) / 0.85)
    bendRef.current.rotation.x = lerp(0.12, 1.15, droop)
    faceRef.current.rotation.x = lerp(lerp(-Math.PI / 2 - 0.12, -0.47, clamp01(cabeza)), 0.55, droop)

    const t = built.tmp
    // Brácteas: cerradas sobre el botón (estrella), después abiertas hacia atrás
    const open = clamp01(cabeza)
    if (Math.abs(open - built.last.open) > 1e-4) {
      built.last.open = open
      for (let i = 0; i < BRACTS; i++) {
        const a = (i / BRACTS) * Math.PI * 2 + (i % 2) * 0.12
        // de apuntar al frente y al centro (cerrado) a echarse hacia atrás del disco
        const tilt = lerp(-1.8, 0.55, open) + (i % 2) * 0.12
        t.e.set(0, tilt, a, 'ZYX')
        t.q.setFromEuler(t.e)
        t.p.set(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, -0.01)
        t.s.setScalar(1)
        t.m.compose(t.p, t.q, t.s)
        built.bracts.setMatrixAt(i, t.m)
      }
      built.bracts.instanceMatrix.needsUpdate = true
    }

    // Liguladas: salen con la apertura y se marchitan con el llenado
    const rayOut = clamp01((cabeza - 0.3) / 0.7)
    const wilt = clamp01((grano - 0.35) / 0.5)
    const rayKey = rayOut * 10 + wilt
    built.rays.visible = rayOut > 0.001 && wilt < 0.999
    if (built.rays.visible && Math.abs(rayKey - built.last.rays) > 1e-4) {
      built.last.rays = rayKey
      for (let i = 0; i < RAYS; i++) {
        const a = (i / RAYS) * Math.PI * 2 + (i % 2) * 0.09
        // abren desde el frente y al marchitarse se caen hacia atrás
        const tilt = lerp(-1.2, -0.12, rayOut) + wilt * (1.1 + (i % 3) * 0.2)
        t.e.set(0, tilt, a, 'ZYX')
        t.q.setFromEuler(t.e)
        t.p.set(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97, (i % 2) * 0.002)
        const k = (0.6 + 0.4 * rayOut) * (1 - 0.5 * wilt)
        t.s.set(k, k * (1 - 0.4 * wilt), 1)
        t.m.compose(t.p, t.q, t.s)
        built.rays.setMatrixAt(i, t.m)
      }
      built.rays.instanceMatrix.needsUpdate = true
      built.rayMat.color.copy(built.flor).lerp(SPENT, wilt)
      built.rayMat.emissive.copy(built.rayMat.color).multiplyScalar(0.15)
    }

    // Flores del disco: antesis en anillos del borde al centro, después aquenios oscuros
    const opened = discAnthesis(g)
    const spent = discSpent(g)
    const key = `${opened.toFixed(3)}|${spent.toFixed(3)}|${madurez.toFixed(3)}`
    if (key !== built.last.colors) {
      built.last.colors = key
      const avg = new Color(0, 0, 0)
      for (let n = 0; n < N; n++) {
        const r = built.ring[n]
        if (r > 1 - spent) {
          // aquenio: gris oscuro con rayas (variación entre vecinos), más seco al madurar
          t.c.copy(SPENT).lerp(built.grano, clamp01(spent * 1.4 - (1 - r))).multiplyScalar(n % 3 === 0 ? 1.25 : 1)
        } else if (r > 1 - opened) {
          t.c.copy(POLLEN)
        } else {
          t.c.copy(CLOSED)
        }
        built.florets.setColorAt(n, t.c)
        avg.add(t.c)
      }
      built.florets.instanceColor.needsUpdate = true
      built.capMat.color.copy(avg.multiplyScalar(1 / N))
    }

    // Dorso: verde, amarillo en R7, marrón en la madurez; las brácteas igual
    const back = clamp01((grano - 0.4) / 0.6)
    built.backMat.color.copy(BRACT).lerp(BACK_YELLOW, back).lerp(BACK_BROWN, clamp01((madurez - 0.3) / 0.7))
    built.backMat.emissive.copy(built.backMat.color).multiplyScalar(0.25)
    built.bractMat.color.copy(BRACT).lerp(BACK_BROWN, clamp01((madurez - 0.1) / 0.6))
  })

  return (
    <group rotation-y={layout.headAzimuth}>
      <group ref={bendRef}>
        <mesh geometry={built.neckGeo} material={built.backMat} castShadow />
        <group position-y={NECK} ref={faceRef}>
          <group ref={scaleRef}>
            <mesh geometry={built.discGeo} material={built.backMat} castShadow />
            <mesh geometry={built.capGeo} material={built.capMat} position-z={0.0005} />
            <primitive object={built.florets} />
            <primitive object={built.rays} />
            <primitive object={built.bracts} />
          </group>
        </group>
      </group>
    </group>
  )
}
