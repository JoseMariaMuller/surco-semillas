import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from '../data/crops.js'
import { aNumero, calcularSemilla, kgPorHa, semillasPorHa, textoBolsa, validarSemilla } from './seedCalculator.js'

test('trigo: 300 pl/m², PMS 38, PG 90, logro 85 → ~149 kg/ha', () => {
  const kg = kgPorHa({ plantas: 300, pms: 38, pg: 90, logro: 85 })
  assert.ok(Math.abs(kg - 149) < 0.5, `dio ${kg}`)
})

test('trigo: 100 ha en bolsas de 40 kg', () => {
  const r = calcularSemilla({ bolsa: CROPS.trigo.bolsa, hectareas: 100, plantas: 300, pms: 38, pg: 90, logro: 85 })
  assert.equal(Math.round(r.kgTotal), 14902)
  assert.equal(r.bolsas, Math.ceil(r.kgTotal / 40))
  assert.deepEqual(r.bolsa, { tipo: 'kg', cantidad: 40 })
})

test('maíz: semillas/ha y bolsas de 80.000 semillas', () => {
  const semHa = semillasPorHa({ plantas: 7.5, pg: 92, logro: 95 })
  assert.equal(Math.round(semHa), 85812)
  const r = calcularSemilla({ bolsa: CROPS.maiz.bolsa, hectareas: 50, plantas: 7.5, pms: 330, pg: 92, logro: 95 })
  assert.equal(r.bolsas, Math.ceil((semHa * 50) / 80000))
  assert.equal(r.bolsa.tipo, 'semillas')
})

test('girasol: bolsas de 180.000 semillas', () => {
  const r = calcularSemilla({ bolsa: CROPS.girasol.bolsa, hectareas: 100, plantas: 5, pms: 60, pg: 92, logro: 90 })
  assert.ok(Math.abs(r.kgHa - 3.62) < 0.01, `dio ${r.kgHa}`)
  assert.equal(Math.round(r.semillasHa), 60386)
  assert.equal(r.bolsas, Math.ceil((r.semillasHa * 100) / 180000))
  assert.deepEqual(r.bolsa, { tipo: 'semillas', cantidad: 180000 })
})

test('soja: ~65 kg/ha en bolsas de 40 kg', () => {
  const r = calcularSemilla({ bolsa: CROPS.soja.bolsa, hectareas: 10, plantas: 30, pms: 160, pg: 92, logro: 80 })
  assert.ok(Math.abs(r.kgHa - 65.2) < 0.1, `dio ${r.kgHa}`)
  assert.equal(r.bolsas, Math.ceil(r.kgTotal / 40))
})

test('texto de la bolsa según el cultivo', () => {
  assert.equal(textoBolsa(CROPS.girasol.bolsa), 'bolsas de 180.000 semillas')
  assert.equal(textoBolsa(CROPS.maiz.bolsa), 'bolsas de 80.000 semillas')
  assert.equal(textoBolsa(CROPS.soja.bolsa), 'bolsas de 40 kg')
})

test('los 8 cultivos tienen tipo y bolsa válidos', () => {
  for (const c of Object.values(CROPS)) {
    assert.ok(['graminea', 'dicotiledonea'].includes(c.tipo), c.id)
    assert.ok(['kg', 'semillas'].includes(c.bolsa.tipo) && c.bolsa.cantidad > 0, c.id)
  }
  assert.equal(Object.keys(CROPS).length, 8)
})

test('acepta coma decimal', () => {
  assert.equal(aNumero('7,5'), 7.5)
  assert.ok(Number.isNaN(aNumero('')))
})

test('valida rangos y campos vacíos', () => {
  const ok = validarSemilla({ hectareas: '10', plantas: '300', pms: '38', pg: '92', logro: '85' })
  assert.deepEqual(ok, {})
  const mal = validarSemilla({ hectareas: '0', plantas: '', pms: '38', pg: '120', logro: '85' })
  assert.deepEqual(Object.keys(mal).sort(), ['hectareas', 'pg', 'plantas'])
})
