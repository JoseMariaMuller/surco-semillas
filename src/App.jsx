import { useState } from 'react'
import Header from './components/Header/Header.jsx'
import GrowthStory from './components/GrowthStory/GrowthStory.jsx'
import { DEFAULT_CROP } from './data/crops.js'
import styles from './App.module.css'

export default function App() {
  const [cropId, setCropId] = useState(DEFAULT_CROP)

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <GrowthStory cropId={cropId} onCropChange={setCropId} />

        <section id="ficha" className={styles.section} aria-labelledby="ficha-titulo">
          <div className="wrap">
            <h2 id="ficha-titulo">Ficha técnica</h2>
          </div>
        </section>

        <section id="calculadora" className={styles.section} aria-labelledby="calc-titulo">
          <div className="wrap">
            <h2 id="calc-titulo">¿Cuánta semilla necesitás?</h2>
          </div>
        </section>

        <section id="cotizacion" className={styles.section} aria-labelledby="cot-titulo">
          <div className="wrap">
            <h2 id="cot-titulo">Pedí tu cotización</h2>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className="wrap">
          <p>Proyecto ficticio de portfolio. Diseño y desarrollo: Jose Muller.</p>
        </div>
      </footer>
    </>
  )
}
