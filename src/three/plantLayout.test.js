import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from '../data/crops.js'
import { cameraFrame } from '../data/stages.js'
import { BOX } from './dimensions.js'
import { buildLayout } from './plantLayout.js'

test('girasol: raíz pivotante, sin nódulos, hojas acorazonadas', () => {
  const L = buildLayout(CROPS.girasol)
  assert.equal(L.roots.filter((r) => r.primary).length, 1)
  const lat = L.roots.find((r) => r.primary).laterals.length
  assert.ok(lat >= 15 && lat <= 20, `laterales: ${lat}`)
  assert.equal(L.nodules.length, 0)
  assert.ok(L.leaves.every((l) => l.kind === 'acorazonada'))
  assert.deepEqual(L.focus, L.headCenter)
})

test('soja: unifoliadas opuestas, trifoliadas, ramas y nódulos', () => {
  const L = buildLayout(CROPS.soja)
  assert.deepEqual(L.leaves.slice(0, 2).map((l) => l.kind), ['unifoliada', 'unifoliada'])
  assert.equal(L.leaves[0].node, L.leaves[1].node)
  assert.ok(L.leaves.slice(2).every((l) => l.kind === 'trifoliada'))
  assert.ok(L.branches.length >= 2 && L.branches.length <= 3)
  assert.ok(L.nodules.length >= 30 && L.nodules.length <= 60, `nódulos: ${L.nodules.length}`)
  assert.ok(Math.abs(L.focus[1] - 0.45) < 0.01)
})

test('maíz: el foco es el choclo; trigo: la espiga', () => {
  assert.deepEqual(buildLayout(CROPS.maiz).focus, buildLayout(CROPS.maiz).earCenter)
  assert.deepEqual(buildLayout(CROPS.trigo).focus, buildLayout(CROPS.trigo).headCenter)
})

test('cámara: posiciones finitas en las 11 etapas de los 8 cultivos', () => {
  for (const c of Object.values(CROPS)) {
    const L = buildLayout(c)
    for (let i = 0; i < 11; i++) {
      const f = cameraFrame(i, c, L.headCenter, L.focus)
      assert.ok([...f.pos, ...f.look].every(Number.isFinite), `${c.id} etapa ${i}`)
    }
  }
})

test('raíces dentro del rizotrón', () => {
  for (const id of ['girasol', 'soja']) {
    for (const r of buildLayout(CROPS[id]).roots) {
      for (const p of r.curve.getPoints(20)) {
        assert.ok(Math.abs(p.x) <= BOX.w / 2 && p.y >= -BOX.depth, `${id} se sale`)
      }
    }
  }
})

test('soja: 35–45 vainas repartidas entre el tallo y las ramas', () => {
  const L = buildLayout(CROPS.soja)
  const pods = L.podSites.reduce((s, p) => s + p.pods, 0)
  assert.ok(pods >= 35 && pods <= 45, `vainas: ${pods}`)
  assert.ok(L.podSites.some((p) => p.branch >= 0))
  assert.ok(L.podSites.every((p) => p.order >= 0 && p.order <= 1))
  assert.ok(L.podSites.every((p) => p.flowers >= 2 && p.flowers <= 4 && p.pods >= 2 && p.pods <= 3))
})

test('girasol: sin sitios de vainas', () => {
  assert.equal(buildLayout(CROPS.girasol).podSites.length, 0)
})
