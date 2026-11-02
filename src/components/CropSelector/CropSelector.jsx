import { useRef } from 'react'
import { CROP_LIST } from '../../data/crops.js'
import CropIcon from './CropIcon.jsx'
import styles from './CropSelector.module.css'

/**
 * Selector de cultivo como grupo de radio accesible:
 * Tab entra al seleccionado; las flechas mueven y eligen; Inicio y Fin van a los extremos.
 */
export default function CropSelector({ value, onChange, className = '', label = 'Cultivo' }) {
  const refs = useRef([])
  const index = CROP_LIST.findIndex((c) => c.id === value)

  const select = (i) => {
    const n = CROP_LIST.length
    const next = (i + n) % n
    onChange(CROP_LIST[next].id)
    refs.current[next]?.focus()
  }

  const onKeyDown = (e) => {
    const keys = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: CROP_LIST.length - 1,
    }
    if (e.key in keys) {
      e.preventDefault()
      select(keys[e.key])
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={`${styles.group} ${className}`} onKeyDown={onKeyDown}>
      {CROP_LIST.map((c, i) => {
        const checked = c.id === value
        return (
          <button
            key={c.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={styles.option}
            onClick={() => onChange(c.id)}
          >
            <CropIcon id={c.id} className={styles.icon} />
            <span className={styles.label}>{c.nombre}</span>
          </button>
        )
      })}
    </div>
  )
}
