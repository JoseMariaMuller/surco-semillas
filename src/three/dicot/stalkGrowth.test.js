import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from '../../data/crops.js'
import { GROWTH_FRAMES } from '../../data/stages.js'
import { visibleLeaves } from './stalkGrowth.js'

const at = (i) => ({ g: GROWTH_FRAMES[i] })

test('girasol: 4 hojas en V4 (etapa 3) y 8 en V8 (etapa 4)', () => {
  assert.equal(Math.floor(visibleLeaves(CROPS.girasol, at(3), 16)), 4)
  assert.equal(Math.floor(visibleLeaves(CROPS.girasol, at(4), 16)), 8)
})

test('soja: V2 = 2 unifoliadas + 1 trifoliada; V5 = 2 unifoliadas + 4 trifoliadas', () => {
  assert.equal(Math.floor(visibleLeaves(CROPS.soja, at(3), 13)), 3)
  assert.equal(Math.floor(visibleLeaves(CROPS.soja, at(4), 13)), 6)
})

test('soja: en el llenado ya están todos los nudos; en la emergencia, ninguna hoja verdadera', () => {
  assert.equal(visibleLeaves(CROPS.soja, at(8), 13), 13)
  assert.equal(visibleLeaves(CROPS.soja, at(2), 13), 0)
})
