import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from './crops.js'
import { getStages } from './stages.js'

for (const id of Object.keys(CROPS)) {
  test(`${id}: 11 etapas completas`, () => {
    const st = getStages(id)
    assert.equal(st.length, 11)
    st.forEach((s) => {
      assert.ok(s.code && s.short && s.name && s.text, `${id} etapa ${s.index}`)
    })
    const days = st.slice(0, 10).map((s) => s.days)
    days.forEach((d, i) => i > 0 && assert.ok(d >= days[i - 1], `${id}: días decrecen en ${i}`))
    assert.equal(st[10].days, null)
  })
}

test('girasol: códigos, nombres y días del spec', () => {
  const st = getStages('girasol')
  assert.deepEqual(st.map((s) => s.code), ['Siembra', 'Germinación', 'VE', 'V4', 'V8', 'R1', 'R4', 'R5.5', 'R7', 'R9', '1 ha'])
  assert.deepEqual(st.map((s) => s.days), [0, 4, 8, 20, 32, 45, 62, 70, 90, 120, null])
  assert.equal(st[5].name, 'Botón floral')
  assert.equal(st[6].name, 'Apertura del capítulo')
})

test('soja: códigos, nombres y días del spec', () => {
  const st = getStages('soja')
  assert.deepEqual(st.map((s) => s.code), ['Siembra', 'Germinación', 'VE', 'V2', 'V5', 'V7', 'R1', 'R2', 'R6', 'R8', '1 ha'])
  assert.deepEqual(st.map((s) => s.days), [0, 3, 7, 18, 30, 40, 48, 55, 95, 133, null])
  assert.deepEqual([st[5].name, st[6].name, st[7].name], ['Ramificación', 'Inicio de floración', 'Floración plena'])
})

test('los seis actuales no cambian', () => {
  assert.equal(getStages('maiz')[6].name, 'Panojamiento')
  assert.equal(getStages('sorgo')[4].name, 'Crecimiento vegetativo')
  assert.equal(getStages('trigo')[4].name, 'Macollaje')
  assert.equal(getStages('cebada')[9].days, 160)
  assert.equal(getStages('trigo')[1].text, 'La semilla absorbe agua y se hincha. En unos días asoma la radícula, la primera raíz.')
})

test('soja: textos de V2 y V5 según Fehr y Caviness (V2 = una trifoliada, V5 = cuatro)', () => {
  const st = getStages('soja')
  assert.match(st[3].text, /la primera trifoliada/)
  assert.match(st[4].text, /^Cuatro trifoliadas/)
})
