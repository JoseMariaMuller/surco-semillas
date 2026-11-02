import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGrowth } from './growthState.js'
import Seed from './parts/Seed.jsx'
import Roots from './parts/Roots.jsx'
import Culm, { Coleoptile } from './parts/Stem.jsx'
import Spike from './heads/Spike.jsx'
import OpenPanicle from './heads/OpenPanicle.jsx'
import CompactPanicle from './heads/CompactPanicle.jsx'
import { Ear, Tassel } from './heads/Maize.jsx'
import Neighbors from './Neighbors.jsx'
import Pollen from './Pollen.jsx'
import Field from './Field.jsx'
import { neighborPlacements } from './plantLayout.js'

const HEADS = {
  espiga: Spike,
  'panoja-abierta': OpenPanicle,
  'panoja-compacta': CompactPanicle,
  maiz: Tassel,
}

// Plantas vecinas por cultivo: menos cuando cada planta es grande y pesada.
const NEIGHBOR_COUNT = {
  maiz: { high: 70, low: 24 },
  sorgo: { high: 100, low: 32 },
  default: { high: 170, low: 48 },
}

function pollenEmitter(crop, layout) {
  const { stemLen, headLen, headCenter } = layout
  if (crop.id === 'maiz') return { center: [0, stemLen + headLen * 0.4, 0], half: headLen * 0.3, radius: 0.09 }
  if (crop.cabeza === 'panoja-abierta') return { center: headCenter, half: headLen * 0.4, radius: 0.06 }
  if (crop.cabeza === 'panoja-compacta') return { center: headCenter, half: headLen * 0.45, radius: 0.04 }
  return { center: headCenter, half: headLen * 0.5, radius: 0.012 }
}

// La planta principal se encoge y crece sobre su base al cambiar de cultivo.
function SwapGroup({ children }) {
  const g = useGrowth()
  const ref = useRef()
  useFrame(() => ref.current.scale.setScalar(Math.max(g.swap, 1e-4)))
  return <group ref={ref}>{children}</group>
}

/** Arma la planta según el cultivo, con macollos, cultivo vecino, polen y la hectárea. */
export default function Plant({ crop, layout, quality, reduced = false }) {
  const culmRef = useRef(null)
  const counts = NEIGHBOR_COUNT[crop.id] ?? NEIGHBOR_COUNT.default
  const neighbors = useMemo(() => neighborPlacements(crop, counts[quality]), [crop, counts, quality])
  const emitter = useMemo(() => pollenEmitter(crop, layout), [crop, layout])
  const Head = HEADS[crop.cabeza]

  const head = (
    <Head cropId={crop.id} length={layout.headLen} palette={crop.paleta} quality={quality} azimuth={layout.headAzimuth} />
  )
  const ear = crop.id === 'maiz' ? <Ear palette={crop.paleta} quality={quality} stemR={layout.m.stemR} /> : null

  return (
    <group>
      <SwapGroup>
        <Seed crop={crop} layout={layout} quality={quality} />
        <Roots layout={layout} quality={quality} />
        <Coleoptile crop={crop} layout={layout} quality={quality} />
        <Culm layout={layout} palette={crop.paleta} quality={quality} head={head} ear={ear} groupRef={culmRef} />
      </SwapGroup>
      {/* Van después del vástago: copian su estado ya actualizado en el mismo cuadro */}
      {layout.tillers.length > 0 && (
        <Neighbors sourceRef={culmRef} placements={layout.tillers} scaleBy="macollos" castShadow />
      )}
      <Neighbors sourceRef={culmRef} placements={neighbors} />
      <Pollen emitter={emitter} count={quality === 'high' ? 260 : 110} reduced={reduced} />
      <Field crop={crop} layout={layout} quality={quality} neighborReach={neighbors.reach} />
    </group>
  )
}
