import { useEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import styles from './Header.module.css'

const LINKS = [
  { href: '#crecimiento', label: 'Cultivos' },
  { href: '#ficha', label: 'Ficha técnica' },
  { href: '#calculadora', label: 'Calculadora' },
  { href: '#cotizacion', label: 'Cotización' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const navRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onClick = (e) => {
      if (!navRef.current?.contains(e.target) && !toggleRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onClick)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#inicio" className={styles.brand} onClick={close}>
          <Logo className={styles.logo} />
          <span>Surco Semillas</span>
        </a>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="menu-principal"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.burger} aria-hidden="true" data-open={open} />
          Menú
        </button>

        <nav
          ref={navRef}
          id="menu-principal"
          className={styles.nav}
          data-open={open}
          aria-label="Principal"
        >
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={close}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#cotizacion" className={`btn ${styles.cta}`} onClick={close}>
            Pedir cotización
          </a>
        </nav>
      </div>
    </header>
  )
}
