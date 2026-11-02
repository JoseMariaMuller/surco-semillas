import { useEffect, useId, useRef, useState } from 'react'
import { CROP_LIST } from '../../data/crops.js'
import { aNumero } from '../../utils/seedCalculator.js'
import styles from './QuoteForm.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const empty = (cultivo) => ({ nombre: '', email: '', localidad: '', cultivo, hectareas: '', mensaje: '' })

// Los errores dicen qué pasó y cómo arreglarlo.
function validar(v) {
  const e = {}
  if (!v.nombre.trim()) e.nombre = 'Escribí tu nombre para saber a quién le respondemos.'
  if (!v.email.trim()) e.email = 'Escribí tu email: ahí te mandamos la cotización.'
  else if (!EMAIL.test(v.email.trim())) e.email = 'El email parece incompleto. Revisalo, por ejemplo: nombre@campo.com.ar.'
  if (!v.localidad.trim()) e.localidad = 'Indicá la localidad del campo, así calculamos el flete.'
  const ha = aNumero(v.hectareas)
  if (!Number.isFinite(ha) || ha <= 0) e.hectareas = 'Indicá las hectáreas con un número mayor que 0.'
  return e
}

const ORDER = ['nombre', 'email', 'localidad', 'cultivo', 'hectareas', 'mensaje']

function Field({ id, name, label, error, hint, children }) {
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  return (
    <div className={`field ${styles[name] ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined,
      })}
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

/** Pedido de cotización. Sin backend: valida y muestra el éxito en el cliente. */
export default function QuoteForm({ cropId, prefill }) {
  const uid = useId()
  const [values, setValues] = useState(() => empty(cropId))
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [sentTo, setSentTo] = useState(null)
  const doneRef = useRef(null)
  const formRef = useRef(null)

  // "Usar en la cotización" completa cultivo, hectáreas y mensaje
  // (se ajusta el estado durante el render cuando llega un pedido nuevo)
  const [appliedAt, setAppliedAt] = useState(null)
  if (prefill && prefill.at !== appliedAt) {
    setAppliedAt(prefill.at)
    setValues((v) => ({ ...v, ...prefill.values }))
    setSentTo(null)
  }

  // llevar al formulario y dejar el foco en el primer dato que falta
  useEffect(() => {
    if (!prefill) return
    requestAnimationFrame(() => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById('cotizacion')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
      formRef.current?.querySelector('[name="nombre"]')?.focus({ preventScroll: true })
    })
  }, [prefill])

  useEffect(() => {
    if (sentTo) doneRef.current?.focus()
  }, [sentTo])

  const set = (k) => (e) => {
    const next = { ...values, [k]: e.target.value }
    setValues(next)
    // después del primer intento, los errores se actualizan mientras se corrige
    if (tried) setErrors(validar(next))
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = validar(values)
    setErrors(errs)
    setTried(true)
    const first = ORDER.find((k) => errs[k])
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus()
      return
    }
    setSentTo(values.email.trim())
  }

  const restart = () => {
    setValues(empty(values.cultivo))
    setErrors({})
    setTried(false)
    setSentTo(null)
  }

  const count = Object.keys(errors).length

  return (
    <section id="cotizacion" className="section" aria-labelledby="cot-titulo">
      <div className={`wrap ${styles.layout}`}>
        <div className="section-head">
          <h2 id="cot-titulo">Pedí tu cotización</h2>
          <p>Te respondemos en el día hábil con precio, disponibilidad del lote y costo de flete a tu campo.</p>
        </div>

        {sentTo ? (
          <div className={styles.done} ref={doneRef} tabIndex={-1} role="status">
            <p className={styles.doneTitle}>
              Recibimos tu pedido. Te escribimos a <strong>{sentTo}</strong> con la cotización.
            </p>
            <button type="button" className="btn btn--ghost" onClick={restart}>
              Hacer otro pedido
            </button>
          </div>
        ) : (
          <form ref={formRef} className={styles.form} onSubmit={submit} noValidate aria-describedby={count ? `${uid}-resumen` : undefined}>
            {count > 0 && (
              <p id={`${uid}-resumen`} className={styles.summary} role="alert">
                {count === 1 ? 'Falta corregir 1 campo.' : `Faltan corregir ${count} campos.`}
              </p>
            )}
            <Field id={`${uid}-nombre`} name="nombre" label="Nombre y apellido" error={errors.nombre}>
              {(p) => <input {...p} name="nombre" className="input" autoComplete="name" value={values.nombre} onChange={set('nombre')} />}
            </Field>
            <Field id={`${uid}-email`} name="email" label="Email" error={errors.email}>
              {(p) => (
                <input {...p} name="email" type="email" className="input" autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} />
              )}
            </Field>
            <Field id={`${uid}-localidad`} name="localidad" label="Localidad del campo" error={errors.localidad}>
              {(p) => (
                <input {...p} name="localidad" className="input" autoComplete="address-level2" value={values.localidad} onChange={set('localidad')} />
              )}
            </Field>
            <Field id={`${uid}-cultivo`} name="cultivo" label="Cultivo">
              {(p) => (
                <select {...p} name="cultivo" className="input" value={values.cultivo} onChange={set('cultivo')}>
                  {CROP_LIST.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field id={`${uid}-hectareas`} name="hectareas" label="Hectáreas" error={errors.hectareas}>
              {(p) => <input {...p} name="hectareas" className="input" inputMode="decimal" value={values.hectareas} onChange={set('hectareas')} />}
            </Field>
            <Field id={`${uid}-mensaje`} name="mensaje" label="Mensaje" hint="Opcional. Contanos variedad, fecha de siembra o lo que necesites.">
              {(p) => <textarea {...p} name="mensaje" className="input" rows={5} value={values.mensaje} onChange={set('mensaje')} />}
            </Field>
            <div className={styles.actions}>
              <button type="submit" className="btn">
                Pedir cotización
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
