import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aNumero, calcularSemilla, kgPorHa, semillasPorHa, validarSemilla } from './seedCalculator.js'

test('trigo: 300 pl/m², PMS 38, PG 90, logro 85 → ~149 kg/ha', () => {
  const kg = kgPorHa({ plantas: 300, pms: 38, pg: 90, logro: 85 })
  assert.ok(Math.abs(kg - 149) < 0.5, `dio ${kg}`)
})

test('trigo: 100 ha en bolsas de 40 kg', () => {
  const r = calcularSemilla({ cultivo: 'trigo', hectareas: 100, plantas: 300, pms: 38, pg: 90, logro: 85 })
  assert.equal(Math.round(r.kgTotal), 14902)
  assert.equal(r.bolsas, Math.ceil(r.kgTotal / 40))
  assert.deepEqual(r.bolsa, { tipo: 'kg', cantidad: 40 })
})

test('maíz: semillas/ha y bolsas de 80.000 semillas', () => {
  const semHa = semillasPorHa({ plantas: 7.5, pg: 92, logro: 95 })
  assert.equal(Math.round(semHa), 85812)
  const r = calcularSemilla({ cultivo: 'maiz', hectareas: 50, plantas: 7.5, pms: 330, pg: 92, logro: 95 })
  assert.equal(r.bolsas, Math.ceil((semHa * 50) / 80000))
  assert.equal(r.bolsa.tipo, 'semillas')
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
