import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CROPS } from '../data/crops.js'
import { cameraFrame, GROWTH_FRAMES } from '../data/stages.js'
import { nodeHeight } from './dicot/stalkGrowth.js'
import { BOX } from './dimensions.js'
import { buildLayout, neighborPlacements } from './plantLayout.js'

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

// Valores de main (antes de girasol y soja): el cultivo vecino de los seis cultivos de antes no cambia.
const MAIN_NEIGHBORS = {"trigo":{"first":[-0.36883,-0.000644,-0.83191,0,0.011094,0.909921,-0.005623,0,0.831836,-0.012421,-0.368787,0,-0.007018,0,-0.136234,1],"last":[-0.548406,-0.037189,-0.716398,0,-0.007061,0.901994,-0.041417,0,0.717328,-0.019552,-0.548103,0,-1.220672,0,0.087299,1]},"maiz":{"first":[0.17583,-0.036696,-0.95876,0,0.000155,0.974727,-0.037279,0,0.959462,0.006568,0.175708,0,0.000505,0,-0.340446,1],"last":[0.510649,0.004052,-0.898523,0,-0.008793,1.033463,-0.000336,0,0.898489,0.00781,0.510665,0,-1.558898,0,-3.005379,1]},"sorgo":{"first":[-0.838633,0.014366,-0.319025,0,0.021474,0.896978,-0.016058,0,0.318626,-0.022641,-0.838602,0,0.009316,0,-0.185716,1],"last":[0.577836,0.027533,0.911183,0,-0.009358,1.078939,-0.026668,0,-0.911551,0.006377,0.577876,0,-1.552647,0,-1.668163,1]},"cebada":{"first":[0.176257,0.002259,0.833403,0,0.002192,0.851833,-0.002773,0,-0.833403,0.002718,0.176249,0,-0.006122,0,-0.204042,1],"last":[1.039581,-0.045168,-0.281038,0,0.038184,1.076699,-0.031802,0,0.282071,0.020717,1.040075,0,-0.006755,0,-1.518559,1]},"avena":{"first":[0.250765,0.045344,-0.934871,0,-0.011586,0.967919,0.043839,0,0.935898,-0.000167,0.251033,0,-0.011777,0,-0.103202,1],"last":[-0.901611,-0.012104,0.06656,0,-0.013737,0.90378,-0.021729,0,-0.066243,-0.022679,-0.90143,0,-0.182196,0,-1.494863,1]},"centeno":{"first":[0.452319,-0.068634,0.854749,0,0.020679,0.966965,0.066701,0,-0.857251,-0.012888,0.452608,0,-0.003534,0,-0.186786,1],"last":[-0.6676,-0.035916,-0.797174,0,0.001736,1.039294,-0.048278,0,0.797981,-0.032309,-0.66682,0,1.21389,0,-0.280385,1]}}

test('el cultivo vecino de los seis cultivos de antes sigue igual que en main', () => {
  for (const [id, ref] of Object.entries(MAIN_NEIGHBORS)) {
    const p = neighborPlacements(CROPS[id], 170)
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-5)
    assert.ok(near(p[0].elements, ref.first), id + ": primera planta distinta")
    assert.ok(near(p[p.length - 1].elements, ref.last), id + ": última planta distinta")
  }
})

test('soja R1 (etapa 6): la cámara mira a la altura de los nudos en flor', () => {
  const L = buildLayout(CROPS.soja)
  const g = { g: GROWTH_FRAMES[6] }
  const bloom = 0.35 * g.g.cabeza + 0.65 * g.g.polen
  const ys = L.podSites.filter((s) => s.branch < 0 && s.order < bloom).map((s) => nodeHeight(L, s.node, g))
  const look = cameraFrame(6, CROPS.soja, L.headCenter, L.focus).look[1]
  assert.ok(look >= Math.min(...ys) - 0.02 && look <= Math.max(...ys) + 0.02, `mira a ${look}; flores entre ${Math.min(...ys)} y ${Math.max(...ys)}`)
})

test('1 ha: la cámara se acerca un 30 % en los cultivos de surco angosto', () => {
  // distancia original de la consigna: (6, 3.5, 9) × max(H, 1) hacia (0, 0.5H, −4)
  const ratio = (id) => {
    const c = CROPS[id]
    const L = buildLayout(c)
    const f = cameraFrame(10, c, L.headCenter, L.focus)
    const k = Math.max(c.H, 1)
    const base = Math.hypot(6 * k, 3.5 * k - 0.5 * c.H, 9 * k + 4)
    return Math.hypot(f.pos[0] - f.look[0], f.pos[1] - f.look[1], f.pos[2] - f.look[2]) / base
  }
  for (const id of ['trigo', 'cebada', 'avena', 'centeno', 'soja']) assert.ok(Math.abs(ratio(id) - 0.7) < 0.01, `${id}: ${ratio(id)}`)
  for (const id of ['maiz', 'sorgo', 'girasol']) assert.ok(Math.abs(ratio(id) - 1) < 0.01, `${id}: ${ratio(id)}`)
})
