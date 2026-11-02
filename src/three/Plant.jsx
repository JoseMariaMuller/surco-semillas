import Seed from './parts/Seed.jsx'
import Roots from './parts/Roots.jsx'
import Culm, { Coleoptile } from './parts/Stem.jsx'
import Spike from './heads/Spike.jsx'

// Arma la planta según el cultivo. En el prototipo la cabeza es siempre la espiga.
export default function Plant({ crop, layout, quality }) {
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
      <Culm layout={layout} palette={crop.paleta} quality={quality} head={head} />
    </group>
  )
}
