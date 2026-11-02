import { useId, useMemo, useState } from 'react'
import { CROP_LIST, CROPS, NOTA_VALORES } from '../../data/crops.js'
import { aNumero, calcularSemilla, validarSemilla } from '../../utils/seedCalculator.js'
import styles from './Calculator.module.css'

const fmt0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const fmt1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

// Valores iniciales de cada campo según el cultivo
const defaults = (crop) => ({
  plantas: String(crop.densidad).replace('.', ','),
  pms: String(crop.pms),
  pg: String(crop.pg),
  logro: String(crop.logro),
})

function NumberField({ id, label, hint, unit, value, error, onChange }) {
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={styles.withUnit}>
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className={styles.unit} aria-hidden="true">{unit}</span>}
      </div>
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errId} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * ¿Cuánta semilla necesitás? Se actualiza en vivo.
 * kg/ha = plantas/m² × PMS × 100 / (PG% × logro%)
 */
export default function Calculator({ cropId, onCropChange, onUseInQuote }) {
  const uid = useId()
  const crop = CROPS[cropId]
  const [hectareas, setHectareas] = useState('100')
  // valores editados por cultivo; si no se tocaron, se usan los del cultivo
  const [edits, setEdits] = useState({})
  const values = { ...defaults(crop), ...edits[cropId], hectareas }
  const setField = (k) => (v) => setEdits((e) => ({ ...e, [cropId]: { ...e[cropId], [k]: v } }))

  const errors = validarSemilla(values)
  const valid = Object.keys(errors).length === 0
  const result = useMemo(() => {
    if (!valid) return null
    return calcularSemilla({
      cultivo: cropId,
      hectareas: aNumero(values.hectareas),
      plantas: aNumero(values.plantas),
      pms: aNumero(values.pms),
      pg: aNumero(values.pg),
      logro: aNumero(values.logro),
    })
  }, [valid, cropId, values.hectareas, values.plantas, values.pms, values.pg, values.logro])

  const reset = () => setEdits((e) => ({ ...e, [cropId]: undefined }))
  const isMaize = cropId === 'maiz'
  const bagText = isMaize ? 'bolsas de 80.000 semillas' : 'bolsas de 40 kg'

  const useInQuote = () => {
    if (!result) return
    const ha = fmt1.format(aNumero(values.hectareas))
    onUseInQuote({
      cultivo: cropId,
      hectareas: values.hectareas,
      mensaje:
        `Necesito semilla de ${crop.nombre.toLowerCase()} para ${ha} ha: ` +
        `${fmt0.format(result.kgTotal)} kg (${fmt1.format(result.kgHa)} kg/ha), ` +
        `${fmt0.format(result.bolsas)} ${bagText}. ` +
        `Calculado con ${values.plantas} pl/m², PMS ${values.pms} g, PG ${values.pg} % y logro ${values.logro} %.`,
    })
  }

  return (
    <section id="calculadora" className="section" aria-labelledby="calc-titulo">
      <div className="wrap">
        <div className="section-head">
          <h2 id="calc-titulo">¿Cuánta semilla necesitás?</h2>
          <p>Cargá tu lote y tu densidad objetivo. El resultado cambia mientras escribís.</p>
        </div>

        <div className={styles.layout}>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()} noValidate aria-label="Datos del lote">
            <div className="field">
              <label htmlFor={`${uid}-cultivo`}>Cultivo</label>
              <select
                id={`${uid}-cultivo`}
                className="input"
                value={cropId}
                onChange={(e) => onCropChange(e.target.value)}
              >
                {CROP_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <NumberField id={`${uid}-ha`} label="Hectáreas" unit="ha" value={values.hectareas} error={errors.hectareas} onChange={setHectareas} />
            <NumberField
              id={`${uid}-pl`}
              label="Plantas objetivo"
              unit="pl/m²"
              hint={`Sugerido para ${crop.nombre.toLowerCase()}: ${fmt1.format(crop.densidad)}`}
              value={values.plantas}
              error={errors.plantas}
              onChange={setField('plantas')}
            />
            <NumberField id={`${uid}-pms`} label="Peso de mil semillas (PMS)" unit="g" value={values.pms} error={errors.pms} onChange={setField('pms')} />
            <NumberField
              id={`${uid}-pg`}
              label="Poder germinativo"
              unit="%"
              hint="Figura en el rótulo de la bolsa."
              value={values.pg}
              error={errors.pg}
              onChange={setField('pg')}
            />
            <NumberField
              id={`${uid}-logro`}
              label="Logro de implantación"
              unit="%"
              hint="Plantas que esperás que se establezcan."
              value={values.logro}
              error={errors.logro}
              onChange={setField('logro')}
            />
            <button type="button" className={`btn btn--ghost ${styles.reset}`} onClick={reset}>
              Volver a los valores del cultivo
            </button>
          </form>

          <div className={styles.result}>
            <p className={styles.resultTitle}>Para {crop.nombre.toLowerCase()}</p>
            <div aria-live="polite" aria-atomic="true">
              {result ? (
                <dl className={styles.figures}>
                  <div className={styles.main}>
                    <dt>Semilla por hectárea</dt>
                    <dd className="num">
                      {fmt1.format(result.kgHa)} <span>kg/ha</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Semilla total</dt>
                    <dd className="num">
                      {fmt0.format(result.kgTotal)} <span>kg</span>
                    </dd>
                  </div>
                  {isMaize && (
                    <div>
                      <dt>Semillas por hectárea</dt>
                      <dd className="num">{fmt0.format(result.semillasHa)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Bolsas</dt>
                    <dd className="num">
                      {fmt0.format(result.bolsas)} <span>{bagText}</span>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className={styles.empty}>Corregí los campos marcados para ver el resultado.</p>
              )}
            </div>
            <button type="button" className="btn" onClick={useInQuote} disabled={!result}>
              Usar en la cotización
            </button>
            <p className={styles.formula}>
              kg/ha = plantas/m² × PMS × 100 ÷ (PG % × logro %). {NOTA_VALORES}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
