import Logo from '../Header/Logo.jsx'
import { NOTA_VALORES } from '../../data/crops.js'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.brand}>
          <Logo className={styles.logo} />
          <p className={styles.name}>Surco Semillas</p>
          <p>Semilla de maíz, trigo, cebada, avena, centeno y sorgo para la región pampeana.</p>
        </div>

        <div>
          <h2 className={styles.h}>Dónde estamos</h2>
          <address className={styles.address}>
            Ruta 8 km 221
            <br />
            Pergamino, Buenos Aires
          </address>
        </div>

        <div>
          <h2 className={styles.h}>Horario</h2>
          <p>
            Lunes a viernes, de 7 a 17 h
            <br />
            Sábados, de 8 a 12 h
          </p>
          <p className={styles.small}>En siembra fina y gruesa ampliamos el horario de despacho.</p>
        </div>

        <nav aria-label="Pie de página">
          <h2 className={styles.h}>Secciones</h2>
          <ul className={styles.links}>
            <li>
              <a href="#crecimiento">Cultivos</a>
            </li>
            <li>
              <a href="#ficha">Ficha técnica</a>
            </li>
            <li>
              <a href="#calculadora">Calculadora</a>
            </li>
            <li>
              <a href="#cotizacion">Cotización</a>
            </li>
          </ul>
        </nav>
      </div>

      <div className={`wrap ${styles.bottom}`}>
        <p>Proyecto ficticio de portfolio. Diseño y desarrollo: Jose Muller.</p>
        <p>{NOTA_VALORES}</p>
      </div>
    </footer>
  )
}
