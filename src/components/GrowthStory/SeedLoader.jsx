import styles from './GrowthStory.module.css'

// Se muestra mientras carga la escena 3D: la semilla en la tierra.
export default function SeedLoader({ hidden = false }) {
  return (
    <div className={styles.loader} role="status" data-hidden={hidden} aria-hidden={hidden || undefined}>
      <svg viewBox="0 0 120 80" aria-hidden="true">
        <path d="M0 22 Q30 16 60 22 T120 22 V80 H0Z" fill="#3a2a1d" />
        <ellipse cx="60" cy="48" rx="9" ry="5.2" fill="#b8406c" transform="rotate(-12 60 48)" />
        <path d="M53 49 Q60 46 67 47" stroke="#7d2648" strokeWidth="1.2" fill="none" />
      </svg>
      <span className="visually-hidden">Cargando la animación</span>
    </div>
  )
}
