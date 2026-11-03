import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_FRAMES, GROWTH_KEYS } from '../../data/stages.js'
import { discAnthesis, discSpent } from './capitulumState.js'

// Estado interpolado entre dos etapas, como el que recorre el scroll
const lerpFrame = (a, b, t) => ({ g: Object.fromEntries(GROWTH_KEYS.map((k) => [k, a[k] + (b[k] - a[k]) * t])) })
const at = (i) => ({ g: GROWTH_FRAMES[i] })

test('R5.5 (etapa 7): cerca de la mitad del disco en antesis', () => {
  const a = discAnthesis(at(7))
  assert.ok(a > 0.4 && a < 0.65, `antesis: ${a}`)
  assert.equal(discSpent(at(7)), 0)
})

test('antes de abrir no hay antesis; en R7 todo el disco ya pasó', () => {
  assert.equal(discAnthesis(at(6)), 0)
  assert.equal(discAnthesis(at(8)), 1)
  assert.equal(discSpent(at(8)), 1)
})

test('la antesis nunca retrocede y lo pasado no supera lo abierto (etapas 6 a 9)', () => {
  let prev = -1
  for (let i = 6; i < 9; i++) {
    for (let k = 0; k <= 20; k++) {
      const g = lerpFrame(GROWTH_FRAMES[i], GROWTH_FRAMES[i + 1], k / 20)
      const a = discAnthesis(g)
      assert.ok(a >= prev - 1e-9, `retrocede en ${i}+${k / 20}`)
      assert.ok(discSpent(g) <= a + 1e-9, `pasado > abierto en ${i}+${k / 20}`)
      prev = a
    }
  }
})
