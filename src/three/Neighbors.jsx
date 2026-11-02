import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4 } from 'three'
import { useGrowth } from './growthState.js'

/**
 * Replica las mallas del vástago principal con InstancedMesh: comparte geometría y
 * material, así que crecen, maduran y cambian de color exactamente igual.
 */
export default function Neighbors({ sourceRef, placements }) {
  const g = useGrowth()
  const group = useRef()
  const st = useMemo(
    () => ({ mirrors: null, last: -1, inv: new Matrix4(), rel: new Matrix4(), base: new Matrix4(), tmp: new Matrix4(), out: new Matrix4() }),
    [],
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
    if (!root || !group.current) return

    if (!st.mirrors) {
      st.mirrors = []
      root.traverse((obj) => {
        if (!obj.isMesh) return
        const per = obj.isInstancedMesh ? obj.instanceMatrix.count : 1
        const mesh = new InstancedMesh(obj.geometry, obj.material, per * placements.length)
        mesh.castShadow = obj.castShadow
        mesh.frustumCulled = false
        mesh.count = 0
        group.current.add(mesh)
        st.mirrors.push({ src: obj, mesh })
      })
    }

    // Solo recalcular cuando cambió el crecimiento
    if (g.s === st.last) return
    st.last = g.s

    root.updateMatrixWorld(true)
    st.inv.copy(root.matrixWorld).invert()
    const P = placements
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
