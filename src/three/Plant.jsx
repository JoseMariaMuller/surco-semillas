import { useMemo, useRef } from 'react'
import Seed from './parts/Seed.jsx'
import Roots from './parts/Roots.jsx'
import Culm, { Coleoptile } from './parts/Stem.jsx'
import Spike from './heads/Spike.jsx'
import Neighbors from './Neighbors.jsx'
import { neighborPlacements } from './plantLayout.js'

// Arma la planta según el cultivo. En el prototipo la cabeza es siempre la espiga.
export default function Plant({ crop, layout, quality }) {
  const culmRef = useRef(null)
  const placements = useMemo(() => neighborPlacements(crop, quality === 'high' ? 170 : 48), [crop, quality])

  const head = (
    <Spike
      cropId={crop.id}
      length={layout.headLen}
      palette={crop.paleta}
      quality={quality}
      azimuth={layout.headAzimuth}
    />
  )

  return (
    <group>
      <Seed crop={crop} layout={layout} quality={quality} />
      <Roots layout={layout} quality={quality} />
      <Coleoptile crop={crop} layout={layout} quality={quality} />
      <Culm layout={layout} palette={crop.paleta} quality={quality} head={head} groupRef={culmRef} />
      {/* Va después del vástago: copia su estado ya actualizado en el mismo cuadro */}
      <Neighbors sourceRef={culmRef} placements={placements} />
    </group>
  )
}
