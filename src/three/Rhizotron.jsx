import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  ClampToEdgeWrapping,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
} from 'three'
import { createFieldTexture, createGlassSheenTexture, createSoilProfileTexture } from './soilTexture.js'
import { BOX, GLASS_Z, PIT } from './dimensions.js'

const TEX_W = 0.6
const TEX_D = 0.5

// Plano de pared con UV en metros reales (la textura se repite en ancho).
// `start` es la profundidad (m) del borde superior dentro del perfil de suelo.
function wallGeometry(width, depth, start = 0) {
  const g = new PlaneGeometry(width, depth)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (width / TEX_W), 1 - (start + (1 - uv.getY(i)) * depth) / TEX_D)
  }
  g.translate(0, -depth / 2, 0)
  return g
}

function groundGeometry(size = 160) {
  const s = new Shape()
  s.moveTo(-size, -size)
  s.lineTo(size, -size)
  s.lineTo(size, size)
  s.lineTo(-size, size)
  s.closePath()
  // Hueco del foso de observación delante del vidrio (z de 0.03 a 0.9)
  const hole = new Shape()
  hole.moveTo(-PIT.halfW, -GLASS_Z)
  hole.lineTo(-PIT.halfW, -PIT.front)
  hole.lineTo(PIT.halfW, -PIT.front)
  hole.lineTo(PIT.halfW, -GLASS_Z)
  hole.closePath()
  s.holes.push(hole)
  const g = new ShapeGeometry(s)
  g.rotateX(-Math.PI / 2)
  return g
}

export default function Rhizotron({ rowSpacing = 0.175, quality = 'high' }) {
  const assets = useMemo(() => {
    const soil = createSoilProfileTexture({ px: quality === 'high' ? 2048 : 1024 })
    soil.wrapS = RepeatWrapping
    soil.wrapT = ClampToEdgeWrapping

    const field = createFieldTexture({ px: quality === 'high' ? 512 : 256 })
    const tile = rowSpacing * 4
    field.repeat.set(1 / tile, 1 / tile)

    const sheen = createGlassSheenTexture()

    const soilMat = new MeshStandardMaterial({ map: soil, roughness: 0.95, metalness: 0 })
    const groundMat = new MeshStandardMaterial({ map: field, roughness: 1, metalness: 0 })
    const glassMat = new MeshStandardMaterial({
      color: '#e4f1f2',
      transparent: true,
      opacity: 0.1,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
    })
    const sheenMat = new MeshBasicMaterial({
      map: sheen,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const aluMat = new MeshStandardMaterial({ color: '#9da3a5', roughness: 0.5, metalness: 0.3 })

    const wallBack = wallGeometry(BOX.w, BOX.depth)
    const wallSide = wallGeometry(BOX.t, BOX.depth)
    const pitSideW = PIT.front - GLASS_Z
    const pitSide = wallGeometry(pitSideW, PIT.depth)
    const pitFront = wallGeometry(PIT.halfW * 2, PIT.depth)
    const pitWing = wallGeometry(PIT.halfW - BOX.w / 2, PIT.depth)
    const pitUnder = wallGeometry(BOX.w, PIT.depth - BOX.depth, 0.38)
    const floor = new PlaneGeometry(PIT.halfW * 2, pitSideW)
    const boxBottom = new PlaneGeometry(BOX.w, BOX.t)
    const glass = new PlaneGeometry(BOX.w, BOX.depth)
    const barV = new BoxGeometry(0.008, BOX.depth + 0.008, 0.008)
    const barH = new BoxGeometry(BOX.w + 0.008, 0.006, 0.008)

    return {
      textures: [soil, field, sheen],
      materials: { soilMat, groundMat, glassMat, sheenMat, aluMat },
      geos: {
        wallBack, wallSide, pitSide, pitFront, pitWing, pitUnder, floor, boxBottom, glass, barV, barH,
        ground: groundGeometry(),
      },
    }
  }, [rowSpacing, quality])

  useEffect(
    () => () => {
      assets.textures.forEach((t) => t.dispose())
      Object.values(assets.materials).forEach((m) => m.dispose())
      Object.values(assets.geos).forEach((g) => g.dispose())
    },
    [assets],
  )

  const { soilMat, groundMat, glassMat, sheenMat, aluMat } = assets.materials
  const g = assets.geos
  const hw = BOX.w / 2
  const wingX = hw + (PIT.halfW - hw) / 2
  const pitMidZ = (GLASS_Z + PIT.front) / 2

  return (
    <group>
      {/* Superficie arada hasta el horizonte */}
      <mesh geometry={g.ground} material={groundMat} receiveShadow />

      {/* Caja del rizotrón: fondo, laterales y piso con perfil de suelo */}
      <mesh geometry={g.wallBack} material={soilMat} position={[0, 0, -GLASS_Z]} receiveShadow />
      <mesh geometry={g.wallSide} material={soilMat} position={[-hw, 0, 0]} rotation-y={Math.PI / 2} />
      <mesh geometry={g.wallSide} material={soilMat} position={[hw, 0, 0]} rotation-y={-Math.PI / 2} />
      <mesh geometry={g.boxBottom} material={soilMat} position={[0, -BOX.depth, 0]} rotation-x={-Math.PI / 2} />

      {/* Foso de observación */}
      <mesh geometry={g.pitWing} material={soilMat} position={[-wingX, 0, GLASS_Z]} />
      <mesh geometry={g.pitWing} material={soilMat} position={[wingX, 0, GLASS_Z]} />
      <mesh
        geometry={g.pitUnder}
        material={soilMat}
        position={[0, -BOX.depth, GLASS_Z]}
      />
      <mesh geometry={g.pitSide} material={soilMat} position={[-PIT.halfW, 0, pitMidZ]} rotation-y={Math.PI / 2} />
      <mesh geometry={g.pitSide} material={soilMat} position={[PIT.halfW, 0, pitMidZ]} rotation-y={-Math.PI / 2} />
      <mesh geometry={g.pitFront} material={soilMat} position={[0, 0, PIT.front]} rotation-y={Math.PI} />
      <mesh
        geometry={g.floor}
        material={soilMat}
        position={[0, -PIT.depth, pitMidZ]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      />

      {/* Marco de aluminio */}
      <mesh geometry={g.barV} material={aluMat} position={[-hw, -BOX.depth / 2, GLASS_Z]} />
      <mesh geometry={g.barV} material={aluMat} position={[hw, -BOX.depth / 2, GLASS_Z]} />
      <mesh geometry={g.barH} material={aluMat} position={[0, -BOX.depth, GLASS_Z]} />
      <mesh geometry={g.barH} material={aluMat} position={[0, -0.001, GLASS_Z]} />

      {/* Vidrio: transparente, sin transmission */}
      <mesh geometry={g.glass} material={glassMat} position={[0, -BOX.depth / 2, GLASS_Z]} renderOrder={2} />
      <mesh
        geometry={g.glass}
        material={sheenMat}
        position={[0, -BOX.depth / 2, GLASS_Z + 0.0005]}
        renderOrder={3}
      />
    </group>
  )
}
