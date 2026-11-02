import { useRef, useState } from 'react'
import { CROPS, NOTA_VALORES } from '../../data/crops.js'
import CropSelector from '../CropSelector/CropSelector.jsx'
import styles from './SeedLabel.module.css'

const fmt = new Intl.NumberFormat('es-AR')

/** Pestañas accesibles de variedades: flechas, Inicio y Fin. */
function VarietyTabs({ crop, index, onSelect }) {
  const refs = useRef([])
  const n = crop.variedades.length
  const go = (i) => {
    const next = (i + n) % n
    onSelect(next)
    refs.current[next]?.focus()
  }
  const onKeyDown = (e) => {
    const map = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: n - 1 }
    if (e.key in map) {
      e.preventDefault()
      go(map[e.key])
    }
  }
  return (
    <div role="tablist" aria-label={`Variedades de ${crop.nombre.toLowerCase()}`} className={styles.tabs} onKeyDown={onKeyDown}>
      {crop.variedades.map((v, i) => (
        <button
          key={v.nombre}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          id={`tab-${crop.id}-${i}`}
          aria-selected={i === index}
          aria-controls="rotulo"
          tabIndex={i === index ? 0 : -1}
          className={styles.tab}
          onClick={() => onSelect(i)}
        >
          {v.nombre}
        </button>
      ))}
    </div>
  )
}

/**
 * Ficha técnica con estética de rótulo de bolsa de semilla.
 * El cultivo es el mismo del selector de la animación.
 */
export default function SeedLabel({ cropId, onCropChange }) {
  const crop = CROPS[cropId]
  // la variedad elegida se recuerda por cultivo
  const [picked, setPicked] = useState({})
  const index = Math.min(picked[cropId] ?? 0, crop.variedades.length - 1)
  const variety = crop.variedades[index]

  const rows = [
    ['Especie', <><em>{crop.cientifico}</em> ({crop.nombre.toLowerCase()})</>],
    ['Cultivar', `${variety.nombre}, ${variety.tipo.toLowerCase()}`],
    ['Categoría', 'Original'],
    ['Poder germinativo', `${crop.pg} %`],
    ['Pureza', '99 %'],
    ['Peso de mil semillas', `${fmt.format(crop.pms)} g`],
    ['Lote', 'SRC-26-0412'],
    ['Campaña', '2026/27'],
    ['Origen', 'Pergamino, Buenos Aires'],
    ['Época de siembra', crop.siembra],
    ['Densidad sugerida', `${fmt.format(crop.densidad)} plantas/m²`],
    ['Ciclo', `${crop.ciclo} días`],
    ['Rinde potencial', crop.rinde],
  ]

  return (
    <section id="ficha" className="section" aria-labelledby="ficha-titulo">
      <div className={`wrap ${styles.layout}`}>
        <div className={styles.intro}>
          <div className="section-head">
            <h2 id="ficha-titulo">Ficha técnica</h2>
            <p>Lo mismo que dice el rótulo de la bolsa, para que compares antes de pedir.</p>
          </div>
          <CropSelector value={cropId} onChange={onCropChange} label="Cultivo de la ficha" className={styles.selector} />
          <p className={styles.note}>{NOTA_VALORES} El lote y la campaña son de ejemplo.</p>
        </div>

        <article className={styles.bag} aria-label={`Rótulo de ${variety.nombre}`}>
          <div className={styles.stitch} aria-hidden="true" />
          <div className={styles.eyelet} aria-hidden="true" />
          <div className={styles.label}>
            <p className={styles.brand}>Surco Semillas</p>
            <VarietyTabs crop={crop} index={index} onSelect={(i) => setPicked((p) => ({ ...p, [cropId]: i }))} />
            <div id="rotulo" role="tabpanel" aria-labelledby={`tab-${crop.id}-${index}`} className={styles.panel}>
              <h3 className={styles.cultivar}>{variety.nombre}</h3>
              <dl className={styles.grid}>
                {rows.map(([k, v]) => (
                  <div key={k} className={styles.row}>
                    <dt>{k}</dt>
                    <dd className="num">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
