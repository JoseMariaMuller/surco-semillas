import { useCallback, useState } from 'react'
import Header from './components/Header/Header.jsx'
import GrowthStory from './components/GrowthStory/GrowthStory.jsx'
import SeedLabel from './components/SeedLabel/SeedLabel.jsx'
import Calculator from './components/Calculator/Calculator.jsx'
import QuoteForm from './components/QuoteForm/QuoteForm.jsx'
import Footer from './components/Footer/Footer.jsx'
import { DEFAULT_CROP } from './data/crops.js'

export default function App() {
  // Un solo cultivo elegido para la animación, la ficha y la calculadora
  const [cropId, setCropId] = useState(DEFAULT_CROP)
  // Datos que la calculadora pasa a la cotización
  const [prefill, setPrefill] = useState(null)
  const useInQuote = useCallback((values) => setPrefill({ values, at: Date.now() }), [])

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <GrowthStory cropId={cropId} onCropChange={setCropId} />
        <SeedLabel cropId={cropId} onCropChange={setCropId} />
        <Calculator cropId={cropId} onCropChange={setCropId} onUseInQuote={useInQuote} />
        <QuoteForm cropId={cropId} prefill={prefill} />
      </main>
      <Footer />
    </>
  )
}
