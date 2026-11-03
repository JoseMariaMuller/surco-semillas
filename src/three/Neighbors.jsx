import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedBufferAttribute, InstancedMesh, Matrix4 } from 'three'
import { useGrowth } from './growthState.js'

/**
 * Replica las mallas de un vástago con InstancedMesh: comparte geometría y
 * material, así que crecen, maduran y se mecen exactamente igual.
 * Se usa para los macollos (alrededor de la planta) y para el cultivo vecino.
 * - scaleBy: clave del crecimiento que escala cada copia (p. ej. 'macollos')
 * - castShadow: si las copias proyectan sombra
 * Las mallas con userData.noMirror no se copian. Si la malla de origen tiene color por
 * instancia (las flores del disco del girasol), las copias lo repiten.
 */
export default function Neighbors({ sourceRef, placements, scaleBy = null, castShadow = false }) {
  const g = useGrowth()
  const group = useRef()
  const st = useMemo(
    () => ({
      mirrors: null,
      last: -1,
      lastSwap: -1,
      inv: new Matrix4(),
      rel: new Matrix4(),
      base: new Matrix4(),
      tmp: new Matrix4(),
      out: new Matrix4(),
      sc: new Matrix4(),
      scaled: placements.map((p) => p.clone()),
    }),
    [placements],
  )

  useEffect(
    () => () => {
      st.mirrors?.forEach((m) => {
        m.mesh.removeFromParent()
        m.mesh.dispose()
      })
      st.mirrors = null
    },
    [st],
  )

  useFrame(() => {
    const root = sourceRef.current
    if (!root || !group.current || placements.length === 0) return

    if (!st.mirrors) {
      st.mirrors = []
      root.traverse((obj) => {
        if (!obj.isMesh || obj.userData.noMirror) return
        const per = obj.isInstancedMesh ? obj.instanceMatrix.count : 1
        const mesh = new InstancedMesh(obj.geometry, obj.material, per * placements.length)
        if (obj.instanceColor) {
          mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(per * placements.length * 3), 3)
        }
        mesh.castShadow = castShadow && obj.castShadow
        mesh.frustumCulled = false
        mesh.count = 0
        group.current.add(mesh)
        st.mirrors.push({ src: obj, mesh })
      })
    }

    // Solo recalcular cuando cambió el crecimiento
    if (g.s === st.last && g.swap === st.lastSwap) return
    st.last = g.s
    st.lastSwap = g.swap

    // Escala dinámica de cada copia (los macollos crecen con `macollos`)
    // y todas se encogen con la transición entre cultivos (swap)
    let P = placements
    const k = (scaleBy ? g.g[scaleBy] : 1) * g.swap
    group.current.visible = k > 0.001
    if (!group.current.visible) return
    if (k < 0.9999) {
      st.sc.makeScale(k, k, k)
      placements.forEach((p, i) => st.scaled[i].multiplyMatrices(p, st.sc))
      P = st.scaled
    }

    root.updateMatrixWorld(true)
    st.inv.copy(root.matrixWorld).invert()
    for (const m of st.mirrors) {
      const { src, mesh } = m
      let visible = true
      for (let o = src; o && o !== root.parent; o = o.parent) {
        if (!o.visible) {
          visible = false
          break
        }
      }
      if (!visible) {
        mesh.count = 0
        continue
      }
      st.rel.multiplyMatrices(st.inv, src.matrixWorld)
      if (src.isInstancedMesh) {
        const n = src.count
        const arr = src.instanceMatrix.array
        for (let k = 0; k < P.length; k++) {
          st.base.multiplyMatrices(P[k], st.rel)
          for (let j = 0; j < n; j++) {
            st.tmp.fromArray(arr, j * 16)
            st.out.multiplyMatrices(st.base, st.tmp)
            mesh.setMatrixAt(k * n + j, st.out)
          }
        }
        mesh.count = n * P.length
        // mismos colores en cada copia, solo si cambiaron en el origen
        if (src.instanceColor && m.colorVersion !== src.instanceColor.version) {
          m.colorVersion = src.instanceColor.version
          const c = src.instanceColor.array.subarray(0, n * 3)
          for (let k = 0; k < P.length; k++) mesh.instanceColor.array.set(c, k * n * 3)
          mesh.instanceColor.needsUpdate = true
        }
      } else {
        for (let k = 0; k < P.length; k++) {
          st.out.multiplyMatrices(P[k], st.rel)
          mesh.setMatrixAt(k, st.out)
        }
        mesh.count = P.length
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return <group ref={group} />
}
