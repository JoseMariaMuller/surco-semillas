import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Points, PointsMaterial, SRGBColorSpace } from 'three'
import { useGrowth } from './growthState.js'
import { createRng } from '../utils/random.js'

function dotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * Polen en floración: granos amarillos que se desprenden de la cabeza
 * (anteras de la espiga o panoja del maíz) y derivan con el viento.
 * `emitter`: centro [x, y, z], medio alto vertical y radio horizontal.
 */
export default function Pollen({ emitter, count = 240, reduced = false }) {
  const g = useGrowth()
  const ref = useRef()

  const sys = useMemo(() => {
    const rng = createRng('polen')
    const positions = new Float32Array(count * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    const map = dotTexture()
    const material = new PointsMaterial({
      color: '#f3d55a',
      size: 0.0032,
      map,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
    const pts = new Points(geometry, material)
    pts.frustumCulled = false
    const parts = Array.from({ length: count }, () => ({ age: 0, life: 0, vx: 0, vy: 0, vz: 0 }))
    return { rng, positions, geometry, material, map, pts, parts, started: false }
  }, [count])

  useEffect(
    () => () => {
      sys.geometry.dispose()
      sys.material.dispose()
      sys.map.dispose()
    },
    [sys],
  )

  const spawn = (i, p, preAge) => {
    const { rng, positions } = sys
    const [cx, cy, cz] = emitter.center
    const a = rng.range(0, Math.PI * 2)
    const r = emitter.radius * Math.sqrt(rng.next())
    positions[i * 3] = cx + Math.cos(a) * r
    positions[i * 3 + 1] = cy + rng.range(-emitter.half, emitter.half)
    positions[i * 3 + 2] = cz + Math.sin(a) * r
    p.life = rng.range(1.6, 3.8)
    p.age = preAge ? rng.range(0, p.life) : 0
    // deriva con el viento (hacia +X), cae muy despacio y gira con la turbulencia
    p.vx = rng.range(0.03, 0.09)
    p.vy = rng.range(-0.018, 0.004)
    p.vz = rng.range(-0.02, 0.02)
  }

  useFrame((state, dt) => {
    const pol = g.g.polen
    const pts = sys.pts
    pts.visible = !reduced && pol > 0.01 && g.swap > 0.95
    if (!pts.visible) {
      sys.started = false
      return
    }
    const d = Math.min(dt, 0.05)
    if (!sys.started) {
      sys.parts.forEach((p, i) => spawn(i, p, true))
      sys.started = true
    }
    sys.material.opacity = Math.min(1, pol * 1.4)
    const pos = sys.positions
    const t = state.clock.elapsedTime
    sys.parts.forEach((p, i) => {
      p.age += d
      if (p.age > p.life) {
        spawn(i, p, false)
        return
      }
      const k = i * 3
      const swirl = Math.sin(t * 2.1 + i) * 0.012
      pos[k] += (p.vx + swirl) * d
      pos[k + 1] += (p.vy + Math.cos(t * 1.7 + i * 0.7) * 0.006) * d
      pos[k + 2] += (p.vz + Math.cos(t * 1.3 + i) * 0.01) * d
    })
    sys.geometry.attributes.position.needsUpdate = true
  })

  return <primitive ref={ref} object={sys.pts} />
}
