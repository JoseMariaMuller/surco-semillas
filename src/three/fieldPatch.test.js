import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from '../data/crops.js'
import { buildLayout } from './plantLayout.js'
import { patchGeometry } from './fieldPatch.js'

const density = (id, quality) => {
  const crop = CROPS[id]
  const p = patchGeometry(crop, buildLayout(crop), quality)
  p.patch.dispose()
  return p.plants / (p.width * p.len)
}

test('hectárea: los cultivos de surco angosto tienen el doble de plantas en desktop', () => {
  for (const id of ['trigo', 'cebada', 'avena', 'centeno']) assert.ok(density(id, 'high') >= 45, `${id}: ${density(id, 'high')}`)
  assert.ok(density('soja', 'high') >= 18, `soja: ${density('soja', 'high')}`)
})

test('hectárea: en mobile la densidad queda como estaba (costo)', () => {
  assert.ok(density('trigo', 'low') < 30, `trigo low: ${density('trigo', 'low')}`)
})

test('hectárea: maíz, sorgo y girasol no cambian', () => {
  for (const [id, plants] of [['maiz', 30], ['sorgo', 18], ['girasol', 15]]) {
    const crop = CROPS[id]
    const p = patchGeometry(crop, buildLayout(crop), 'high')
    p.patch.dispose()
    assert.equal(p.plants, plants, id)
  }
})
