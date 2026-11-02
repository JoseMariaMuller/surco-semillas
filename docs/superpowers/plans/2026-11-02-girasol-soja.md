# Girasol y soja: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar girasol y soja a Surco Semillas con el mismo nivel que los seis cultivos actuales: datos, etapas, 3D procedural, interfaz y textos.

**Architecture:** Un segundo armado de planta para dicotiledóneas, elegido por `crop.tipo`. Las piezas nuevas (hipocótilo, tallo con hojas pecioladas, capítulo, flores y vainas) viven en `src/three/dicot/`. Semilla, raíces, cultivo vecino, hectárea, polen, viento, cámara y la tabla de crecimiento se comparten. Los seis cultivos actuales no cambian de comportamiento.

**Tech Stack:** React 19 + Vite, `three` + `@react-three/fiber` v9 (sin drei), CSS Modules, `node:test`, oxlint, Playwright (MCP) para la revisión visual.

**Spec:** `docs/superpowers/specs/2026-11-02-girasol-soja-design.md`. Todos los valores (datos de cultivos, códigos, días, paletas, cantidades de instancias) salen de ahí; este plan no los repite salvo donde un test los fija.

## Global Constraints

- Rama de trabajo: `feat/girasol-soja` desde `main`. Un commit por tarea, mensajes `feat: …` / `fix: …` / `docs: …` / `test: …`, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Todo el 3D es procedural: sin modelos, texturas ni imágenes externas. Sin `@react-three/drei`.
- Aleatoriedad siempre con `createRng(\`<pieza>-${crop.id}\`)` de `src/utils/random.js`: cada cultivo sale siempre igual.
- Cada `useMemo` que crea geometrías o materiales tiene su `useEffect` de `dispose()`, como en `parts/Leaf.jsx`.
- `quality === 'low'` (mobile): menos segmentos e instancias, sin sombras. Las cantidades `high`/`low` de cada pieza están en el spec.
- Materiales de partes aéreas pasan por `applyWind()` (`src/three/wind.js`).
- Movimiento reducido: sin viento ni polen (ya resuelto en `Pollen` y `GrowthScene`; las piezas nuevas no agregan animaciones propias fuera de `useGrowth()`).
- Textos en español rioplatense, con voseo, verbos simples y mayúscula solo al inicio.
- Los seis cultivos actuales se ven igual que en `main`, salvo el orden del selector y los textos compartidos.
- JS total < 450 KB gzip. `pnpm lint` sin advertencias. `pnpm build` sin errores.

## Review Focus

1. **Cambiar de cultivo entre una gramínea y una dicotiledónea en medio del scroll** (p. ej. trigo en floración → girasol → soja → trigo): la transición de encogido funciona, no quedan piezas del cultivo anterior y la memoria de geometrías vuelve a la base. Test en la Tarea 8.
2. **Movimiento reducido con girasol y soja**: la cámara salta entre etapas, no hay polen, y el gancho, los cotiledones y el capítulo quedan en su estado final de cada etapa. Test en la Tarea 6.
3. **Pantalla angosta en vertical** (390×844, 360×740): el girasol de 1,8 m entra completo en la etapa 5 y las vainas de soja se ven por encima de la tarjeta en las etapas 6–8. Test en la Tarea 7.
4. **Sin WebGL**: girasol y soja muestran su ilustración en las 11 etapas (cotiledones, hojas anchas o trifoliadas, capítulo o vainas). Test en la Tarea 9.
5. **Calculadora con girasol**: al pasar de maíz a girasol, el texto de bolsas y el mensaje de "Usar en la cotización" dicen "bolsas de 180.000 semillas", y la cotización tiene girasol y soja en el desplegable. Test en la Tarea 1 (unidad) y en la Tarea 9 (Playwright).

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/data/crops.js` | Modificar | `tipo`, girasol, soja, `paleta.flor`, orden de campaña |
| `src/utils/seedCalculator.js` (+ test) | Modificar | Bolsas según `crop.bolsa` |
| `src/components/Calculator/Calculator.jsx` | Modificar | Texto de bolsas desde los datos |
| `src/data/stages.js` | Modificar | Escalas `schneiter` y `fehr`, nombres por tabla, días, textos, `cameraFrame` con `focus` |
| `src/data/stages.test.js` | Crear | Integridad de etapas para los 8 cultivos |
| `src/three/plantLayout.js` | Modificar | `MORPH` de girasol y soja, raíz pivotante, nódulos, hojas de dicotiledónea, ramas, `focus` |
| `src/three/plantLayout.test.js` | Crear | Forma del layout de dicotiledóneas y `focus` |
| `src/three/CameraRig.jsx` | Modificar | Usa `layout.focus` |
| `src/three/parts/Seed.jsx` | Modificar | Formas `aquenio` y `redonda` |
| `src/three/parts/Roots.jsx` | Modificar | Radio por raíz y nódulos |
| `src/three/dicot/Hypocotyl.jsx` | Crear | Gancho y cotiledones |
| `src/three/dicot/broadLeafGeometry.js` | Crear | Lámina ancha (acorazonada u ovalada) |
| `src/three/dicot/BroadLeaf.jsx` | Crear | Hoja con pecíolo; simple o trifoliada |
| `src/three/dicot/Stalk.jsx` | Crear | Tallo, nudos, hojas, ramas, punto de la cabeza |
| `src/three/dicot/Capitulum.jsx` | Crear | Capítulo de girasol |
| `src/three/dicot/SoyNodes.jsx` | Crear | Flores y vainas de soja |
| `src/three/Plant.jsx` | Modificar | Elige armado por `crop.tipo`; emisor de polen; vecinos |
| `src/three/Field.jsx` | Modificar | Planta simplificada de girasol y soja |
| `src/three/GrowthScene.jsx` | Modificar | Hook de depuración de memoria solo en desarrollo |
| `src/components/CropSelector/*` | Modificar | Grilla de 4 por debajo de 1100 px; íconos nuevos |
| `src/components/GrowthStory/*.module.css` | Modificar | Riel mobile debajo del selector de dos filas |
| `src/components/SeedLabel/SeedLabel.module.css` | Modificar | Selector 4×2 |
| `src/components/StaticFallback/StaticFallback.jsx` | Modificar | Ilustración de dicotiledóneas |
| `index.html`, `Footer.jsx`, `README.md`, `public/og.jpg`, `docs/capturas/` | Modificar | Textos y capturas con 8 cultivos |
| `package.json` | Modificar | `test` corre todos los `*.test.js` |

---

### Task 1: Datos de girasol y soja, y calculadora por bolsa del cultivo

**Files:**
- Modify: `src/data/crops.js`
- Modify: `src/utils/seedCalculator.js`, `src/utils/seedCalculator.test.js`
- Modify: `src/components/Calculator/Calculator.jsx:68-80`

**Interfaces:**
- Produces: `CROPS.girasol`, `CROPS.soja` con todos los campos de la tabla del spec; `tipo: 'graminea' | 'dicotiledonea'` en los 8; `paleta.flor` en girasol y soja.
- Produces: `calcularSemilla({ bolsa, hectareas, plantas, pms, pg, logro })` → `{ kgHa, kgTotal, semillasHa, semillasTotal, bolsas, bolsa }`, donde `bolsa` es `{ tipo: 'kg' | 'semillas', cantidad }` y se devuelve tal cual.
- Produces: `textoBolsa(bolsa) → string` en `seedCalculator.js`: `"bolsas de 180.000 semillas"`, `"bolsas de 40 kg"` (miles con punto, `es-AR`).
- `CROP_ORDER` **no cambia en esta tarea** (los cultivos nuevos todavía no se pueden dibujar; entran al selector en la Tarea 4).

- [ ] **Step 1: Crear la rama**

Run: `git switch -c feat/girasol-soja`

- [ ] **Step 2: Escribir los tests que fallan** en `seedCalculator.test.js`

Cambiar las llamadas existentes de `cultivo: 'trigo'` / `cultivo: 'maiz'` a `bolsa: CROPS.trigo.bolsa` / `bolsa: CROPS.maiz.bolsa` (mismas aserciones). Agregar:

```js
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
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `pnpm test`
Expected: FAIL (`CROPS.girasol` indefinido, `textoBolsa` no exportado).

- [ ] **Step 4: Implementar**

- `crops.js`: agregar `tipo: 'graminea'` a los seis; agregar `girasol` y `soja` con los valores del spec (sección 1, tabla "Cultivos").
- `seedCalculator.js`: `calcularSemilla` usa `bolsa.tipo === 'semillas'` para elegir; exportar `textoBolsa(bolsa)` con `Intl.NumberFormat('es-AR')`. Quitar `BOLSA_KG` y `BOLSA_SEMILLAS` y el comentario sobre maíz; actualizar el comentario de la cabecera.
- `Calculator.jsx`: pasar `bolsa: crop.bolsa` en lugar de `cultivo: cropId`; `bagText = textoBolsa(crop.bolsa)`; borrar `isMaize`.

- [ ] **Step 5: Correr y ver que pasan**

Run: `pnpm test && pnpm lint`
Expected: todos los tests en PASS (7 + 4 nuevos); lint sin salida de errores.

- [ ] **Step 6: Commit**

```bash
git add src/data/crops.js src/utils/seedCalculator.js src/utils/seedCalculator.test.js src/components/Calculator/Calculator.jsx
git commit -m "feat: datos de girasol y soja, y bolsas según el cultivo"
```

---

### Task 2: Etapas de girasol y soja

**Files:**
- Modify: `src/data/stages.js`
- Create: `src/data/stages.test.js`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Consumes: `CROPS.girasol`, `CROPS.soja` (`scale: 'schneiter'`, `'fehr'`).
- Produces: `getStages(cropId)` funciona para los 8; `stageNameFor`, `stageCode`, `stageDays`, `stageText` sin `if` por cultivo salvo el reescalado de días de los cereales de invierno.
- `cameraFrame` **no cambia en esta tarea** (Tarea 3).

- [ ] **Step 1: Cambiar el script de tests**

`package.json`: `"test": "node --test \"src/**/*.test.js\""`. Run: `pnpm test` → siguen pasando los de la Tarea 1.

- [ ] **Step 2: Escribir el test que falla** `src/data/stages.test.js`

```js
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
```

- [ ] **Step 3: Correr y ver que falla**

Run: `pnpm test` → FAIL en girasol y soja (`CODES[crop.scale]` indefinido).

- [ ] **Step 4: Implementar en `stages.js`**

- `CODES.schneiter` y `CODES.fehr` según el spec; `SHORT` no necesita entradas nuevas (`Siembra`→`S` y `Germinación`→`G` ya están).
- `NAMES = { maiz: { 6: 'Panojamiento' }, girasol: { 4: …, 5: 'Botón floral', 6: 'Apertura del capítulo' }, soja: { 4: …, 5: 'Ramificación', 6: 'Inicio de floración', 7: 'Floración plena' } }`; `stageNameFor` = `NAMES[id]?.[i] ?? (macollos === 0 && i === 4 ? 'Crecimiento vegetativo' : STAGE_NAMES[i])`.
- `DAYS.girasol`, `DAYS.soja`; `stageDays` usa `DAYS[crop.id]` si existe y reescala trigo para el resto (como hoy).
- `TEXTS.girasol` y `TEXTS.soja` para las etapas 0 a 9, con el contenido mínimo listado en el spec (sección 1, "Etapas"). Dos o tres oraciones cada uno, mismo tono y largo que `TEXTS.base`.

- [ ] **Step 5: Correr y ver que pasa**

Run: `pnpm test && pnpm lint` → PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json src/data/stages.js src/data/stages.test.js
git commit -m "feat: etapas de girasol (Schneiter y Miller) y soja (Fehr y Caviness)"
```

---

### Task 3: Layout de dicotiledóneas y foco de cámara

**Files:**
- Modify: `src/three/plantLayout.js`
- Create: `src/three/plantLayout.test.js`
- Modify: `src/data/stages.js` (`cameraFrame`), `src/three/CameraRig.jsx:16`

**Interfaces:**
- Consumes: `CROPS` (Tarea 1).
- Produces en `buildLayout(crop)` para dicotiledóneas (los campos actuales siguen para gramíneas):
  - `m`: `MORPH.girasol` / `MORPH.soja` con `{ leaves, nodes: number[] /* fracciones de stemLen */, stemR, headLen, rootDepth, laterals: [min, max], seed: { len, w, h }, petiole: [min, max], blade: [min, max] }`; soja suma `branches: number /* 2 o 3 */`.
  - `roots`: mismo formato que hoy (`{ curve, delay, primary, laterals }`), más `radius: number` (multiplicador) en cada raíz; una sola `primary`.
  - `nodules`: `Vector3[]` (soja: 30–60 puntos sobre las laterales de arriba; girasol: `[]`).
  - `leaves`: `{ k, node, azimuth, petiole, blade, kind: 'acorazonada' | 'unifoliada' | 'trifoliada', droop }[]`.
  - `branches` (soja): `{ node, azimuth, tilt, len, leaves: number }[]`; girasol `[]`.
  - `stemLen`, `headLen`, `headCenter`, `headAzimuth`, `tillers: []`.
- Produces para los 8: `focus: [x, y, z]` = capítulo (girasol, `headCenter`), tercio medio del tallo (soja, `[0, 0.5 * crop.H, 0]` desplazado hacia la cámara 0,05 m en +x), `earCenter` (maíz), `headCenter` (resto).
- Produces: `cameraFrame(i, crop, head, focus)` usa `focus` en las etapas 7 y 8 en lugar de `ear`; maíz y soja usan el encuadre de primer plano de media altura que hoy tiene maíz.

- [ ] **Step 1: Escribir el test que falla** `src/three/plantLayout.test.js`

```js
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
  assert.ok(L.nodules.length >= 30 && L.nodules.length <= 60)
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
```

- [ ] **Step 2: Correr y ver que falla**

Run: `pnpm test` → FAIL (`MORPH.girasol` indefinido).

- [ ] **Step 3: Implementar en `plantLayout.js`**

- `MORPH.girasol` / `MORPH.soja` con los tamaños del spec (girasol: 16 hojas, `stemR` 0,01, disco de 0,22 m como `headLen`; soja: 12 nudos, `stemR` 0,003, `branches: 3`).
- `buildRoots` con rama `crop.tipo === 'dicotiledonea'`: una raíz principal (`radius: 1.8`, ángulo casi vertical, largo `rootDepth`) y laterales con ángulo de 1,1–1,5 rad respecto de la principal y largo 0,06–0,16 m, que decrece con la profundidad. Las gramíneas ponen `radius` según lo que hoy decide `Roots.jsx` (`primary` 1.15, `crown` 1.45, resto 1), así `Roots` deja de decidirlo.
- `nodules` (soja): puntos sobre las laterales con `u < 0.5` de la mitad superior de la raíz, con `createRng(\`nodulos-${crop.id}\`)`.
- Hojas de girasol: pares opuestos en los 3 primeros nudos y después filotaxis en espiral (ángulo áureo); `droop` crece hacia abajo. Soja: par unifoliado en el primer nudo y trifoliadas alternas (180° ± 0,35).
- `focus` según la regla de Interfaces.
- `stages.js`: renombrar el cuarto parámetro de `cameraFrame` a `focus` y usarlo para maíz **y soja** en las etapas 7 y 8. `CameraRig.jsx` pasa `layout.focus`.

- [ ] **Step 4: Correr y ver que pasa**

Run: `pnpm test && pnpm lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/three/plantLayout.js src/three/plantLayout.test.js src/data/stages.js src/three/CameraRig.jsx
git commit -m "feat: layout de dicotiledóneas (raíz pivotante, hojas, ramas) y foco de cámara"
```

---

### Task 4: Semilla, raíz pivotante, nódulos y germinación epigea

**Files:**
- Modify: `src/three/parts/Seed.jsx`, `src/three/parts/Roots.jsx`
- Create: `src/three/dicot/Hypocotyl.jsx`
- Modify: `src/three/Plant.jsx`
- Modify: `src/data/crops.js` (`CROP_ORDER`)

**Interfaces:**
- Consumes: `layout.roots[].radius`, `layout.nodules`, `layout.m.seed` (Tarea 3).
- Produces: `<Hypocotyl crop layout quality />` (sin hijos; se posiciona en la semilla).
- Produces: en `Plant.jsx`, rama `crop.tipo === 'dicotiledonea'` que monta `Seed`, `Roots`, `Hypocotyl` y deja un `<group ref={stalkRef} />` vacío para la Tarea 5.
- Produces: `CROP_ORDER = ['trigo', 'cebada', 'avena', 'centeno', 'maiz', 'sorgo', 'girasol', 'soja']`.

- [ ] **Step 1: `Seed.jsx`**: formas `aquenio` (lágrima aplanada: punta en un extremo de X, achatado en Z; rayas longitudinales oscuras por vértice, alternando `#2b2622` y `#8c8780`) y `redonda` (esfera achatada 0,85 en Y; mancha oscura alargada del hilo por vértice). El tinte del curasemilla se aplica igual que hoy multiplicando el color base.

- [ ] **Step 2: `Roots.jsx`**: radio de cada tubo = `R * r.radius`; las laterales de dicotiledóneas, `R * 0.55`. Nódulos: `InstancedMesh` de esferas (radio 0,0018 m, color `#d9b3a0`, 10×8 segmentos en `high`, 6×5 en `low`) en `layout.nodules`, escala `clamp01((raiz - 0.5) / 0.3)`.

- [ ] **Step 3: `Hypocotyl.jsx`**: con `brote` de 0 a 0,6, un tubo (`TubeGeometry` sobre una curva con forma de gancho) se revela con `setDrawRange` desde la semilla hasta 0,01 m sobre el suelo, con los cotiledones cerrados en la curva del gancho. De 0,6 a 1, la curva se recalcula interpolando hacia una recta (gancho → vertical) y los dos cotiledones (elipsoides achatados: girasol 0,025 × 0,012 m, soja 0,02 × 0,014 m más gruesos) giran de juntos a horizontales. Desde `hojas` > 0,5 amarillean y desde 0,8 caen (escala → 0). Colores: tallo `#c9d79a`, cotiledones `paleta.hoja` aclarado (soja, mezclado 40 % con `#d9d27a`).

- [ ] **Step 4: `Plant.jsx`**: rama por `crop.tipo`. Para dicotiledóneas no se montan `Coleoptile`, `Culm` ni macollos.

- [ ] **Step 5: `CROP_ORDER`** de campaña.

- [ ] **Step 6: Verificar en el navegador**

Run: `pnpm build && pnpm preview --port 4173` (en segundo plano). Con Playwright a 1440×900 y 390×844, para girasol y soja en las etapas 0, 1, 2 y 3 (esperar ~5 s por etapa; en 390×844, ~14 s), captura en el scratchpad.
Expected: semilla con su forma; raíz pivotante con laterales; nódulos en soja desde la etapa 3; en la etapa 2 el gancho arriba del suelo con los cotiledones abriéndose; consola sin errores. Los seis actuales siguen igual en la etapa 2 (comparar trigo y maíz con `docs/capturas/desktop-germinacion.jpg`).

- [ ] **Step 7: Commit**

```bash
git add src/three/parts/Seed.jsx src/three/parts/Roots.jsx src/three/dicot/Hypocotyl.jsx src/three/Plant.jsx src/data/crops.js
git commit -m "feat: girasol y soja germinan: semilla, raíz pivotante, nódulos y gancho con cotiledones"
```

---

### Task 5: Tallo y hojas de dicotiledóneas

**Files:**
- Create: `src/three/dicot/broadLeafGeometry.js`, `src/three/dicot/BroadLeaf.jsx`, `src/three/dicot/Stalk.jsx`
- Modify: `src/three/Plant.jsx`

**Interfaces:**
- Consumes: `layout.leaves`, `layout.branches`, `layout.m` (Tarea 3).
- Produces: `createBroadLeafGeometry(segments, shape: 'acorazonada' | 'ovalada') → BufferGeometry` y `shapeBroadLeaf(geo, params, grow, open)`, con el mismo contrato que `createLeafGeometry` / `shapeLeaf` en `parts/leafGeometry.js` (colores por vértice, base más clara, `DoubleSide`).
- Produces: `<BroadLeaf leaf count palette quality stemR />`: pecíolo (cilindro fino) y lámina; `kind: 'trifoliada'` arma tres folíolos `ovalada` (el central con peciolulo). Crece en su turno con `hojas × count - k`, como `Leaf.jsx`.
- Produces: `<Stalk crop layout quality head groupRef />`: tallo con nudos, hojas y ramas; `head` se renderiza en un grupo que sigue la punta del tallo (igual que `Culm`). Expone `groupRef` para `Neighbors`.

- [ ] **Step 1: `broadLeafGeometry.js`**: grilla de `segments` a lo largo × 6 a lo ancho. Contorno acorazonado (base con dos lóbulos, punta aguda, borde aserrado con 9–12 dientes por lado) u ovalado (folíolo de soja, punta apenas aguda). Pliegue en V suave en la nervadura; la lámina cae hacia la punta según `droop` y se abre de la vertical con `open`.

- [ ] **Step 2: `BroadLeaf.jsx`**: material con `applyWind`, `vertexColors`, `DoubleSide`. Madurez: amarillea de abajo hacia arriba como `Leaf.jsx`; en soja, con `madurez` > 0,6 + 0,3 × (k / count) la hoja cae (escala → 0 y baja 0,02 m); en girasol queda colgando (`droop` + 0,8) y marrón.

- [ ] **Step 3: `Stalk.jsx`**: cilindro afinado hacia arriba (girasol más grueso, verde con pubescencia sugerida por un color más mate); largo = `brote * 0.02 + tallo * stemLen` más un tramo final con `cabeza` (girasol) para el cuello; nudos visibles desde `tallo` > 0,15. Ramas de soja: tallos secundarios desde `branch.node`, inclinados `tilt`, que crecen con `clamp01((tallo - 0.5) / 0.5)` y llevan `branch.leaves` trifoliadas. Madurez: color hacia `paleta.maduro`.

- [ ] **Step 4: `Plant.jsx`** monta `<Stalk>` en el `stalkRef` de la Tarea 4 y suma `<Neighbors sourceRef={stalkRef} placements={neighbors} />` para las dicotiledóneas (los vecinos copian tallo, hojas, cotiledones visibles y cabeza).

- [ ] **Step 5: Verificar en el navegador**

Igual que en la Tarea 4, etapas 3, 4 y 5, a 1440×900 y 390×844.
Expected: girasol con hojas acorazonadas aserradas, opuestas abajo y en espiral arriba; soja con dos unifoliadas opuestas y trifoliadas alternas; ramas de soja en la etapa 5; cultivo vecino visible detrás; consola sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/three/dicot/broadLeafGeometry.js src/three/dicot/BroadLeaf.jsx src/three/dicot/Stalk.jsx src/three/Plant.jsx
git commit -m "feat: tallo, hojas acorazonadas y trifoliadas, y ramas de soja"
```

---

### Task 6: Capítulo de girasol

**Files:**
- Create: `src/three/dicot/Capitulum.jsx`
- Modify: `src/three/Plant.jsx` (`HEADS`, `pollenEmitter`)

**Interfaces:**
- Consumes: `layout.headLen` (diámetro del disco), `layout.headAzimuth`, `crop.paleta.flor`, `crop.paleta.grano`.
- Produces: `<Capitulum crop layout quality />`, montado como `head` de `Stalk`.
- Produces: `pollenEmitter(crop, layout)` devuelve `{ center: layout.headCenter, half: 0.02, radius: headLen * 0.4 }` para girasol y `null` para soja; `Plant` no monta `<Pollen>` si es `null`.

- [ ] **Step 1: `Capitulum.jsx`**:
  - Botón: con `tallo` > 0,5 y `cabeza` = 0, brácteas en estrella cerradas, escala `clamp01((tallo - 0.5) / 0.5) * 0.3`.
  - Disco: `cabeza` lleva la escala de 0,3 a 1 y abre las brácteas.
  - Flores del disco / aquenios: `InstancedMesh` en espiral de Vogel (`r = c·√n`, `θ = n · 137,508°`), 600 en `high` y 250 en `low`. Color por instancia: verde amarillento; con `polen`, el anillo `n / total > 1 - polen` pasa a amarillo con polen (de afuera hacia adentro); con `grano`, a gris oscuro con rayas (`paleta.grano`).
  - Liguladas: 32 en `InstancedMesh`, `paleta.flor`; se abren con `cabeza` y se marchitan (escala y color marrón) con `grano` > 0,5.
  - Orientación: mira hacia `headAzimuth` (del lado de la cámara de las etapas 6 y 7), inclinado 20° hacia arriba; con `madurez`, el cuello se curva y el disco gira hasta mirar al suelo (rotación de 0 a 160° sobre su eje horizontal) y el dorso pasa de verde a amarillo (`madurez` 0–0,5) y a marrón (0,5–1).
  - Los aquenios llevan `userData.noMirror = true` solo si la medición de la Tarea 8 lo pide (no en esta tarea).

- [ ] **Step 2: `Plant.jsx`**: `HEADS.capitulo = Capitulum`; emisor de polen según Interfaces.

- [ ] **Step 3: Verificar en el navegador**

Girasol en las etapas 5 a 9, a 1440×900 y 390×844. Después, con `browser_emulate_media({ reducedMotion: 'reduce' })`, recorrer las etapas 5 a 9 de girasol y soja.
Expected: botón en estrella en la 5; capítulo abierto con liguladas en la 6 y mirando a la cámara; anillos de antesis y polen en la 7; dorso amarillo en la 8 (la cámara está del otro lado); capítulo caído y marrón en la 9. Con movimiento reducido: sin partículas de polen, la cámara salta entre etapas y cada pieza muestra el estado final de la etapa. Consola sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/three/dicot/Capitulum.jsx src/three/Plant.jsx
git commit -m "feat: capítulo de girasol con antesis en espiral y madurez"
```

---

### Task 7: Flores y vainas de soja

**Files:**
- Create: `src/three/dicot/SoyNodes.jsx`
- Modify: `src/three/plantLayout.js` (posiciones de flores y vainas), `src/three/plantLayout.test.js`, `src/three/Plant.jsx` (`HEADS`), `src/three/dicot/Stalk.jsx` (`nodePosition`, monta `SoyNodes`)

**Interfaces:**
- Consumes: `layout.leaves`, `layout.branches`, `layout.m.nodes`, `crop.paleta.flor`.
- Produces en `buildLayout` (soja): `podSites: { node, branch: number | -1, azimuth, flowers: 2..4, pods: 2..3, order: 0..1 }[]`, donde `order` es el orden de aparición (nudos medios primero).
- Produces: `nodePosition(layout, site, g, out: Vector3) → Vector3`, exportada de `Stalk.jsx`: posición actual del nudo `site.node` (en el tallo si `site.branch === -1`, o a lo largo de la rama `site.branch`) con el mismo crecimiento que usa `Stalk` (`nodes[i] * tallo * stemLen`). `Stalk` la usa para sus nudos y `SoyNodes` para flores y vainas.
- Produces: `<SoyNodes crop layout quality />`, que `Stalk` monta dentro de su grupo cuando `crop.cabeza === 'vainas'` (así `Neighbors` también lo copia).

- [ ] **Step 1: Test que falla** en `plantLayout.test.js`

```js
test('soja: 35–45 vainas repartidas entre el tallo y las ramas', () => {
  const L = buildLayout(CROPS.soja)
  const pods = L.podSites.reduce((s, p) => s + p.pods, 0)
  assert.ok(pods >= 35 && pods <= 45, `vainas: ${pods}`)
  assert.ok(L.podSites.some((p) => p.branch >= 0))
  assert.ok(L.podSites.every((p) => p.order >= 0 && p.order <= 1))
})
```

Run: `pnpm test` → FAIL. Implementar `podSites` en `plantLayout.js`. Run: `pnpm test` → PASS.

- [ ] **Step 2: `SoyNodes.jsx`**: dos `InstancedMesh`.
  - Flores: corola pequeña (≈6 mm) con estandarte, `paleta.flor`; aparecen cuando `cabeza > order`; todas abiertas con `polen` = 1; caen con `grano` > 0,3.
  - Vainas: cápsula achatada (≈45 × 9 mm) con 2–3 abultamientos y color con pubescencia (más claro en el borde); crecen con `clamp01((grano - 0.2) / 0.6)`; color verde → amarillo (`madurez` 0–0,5) → `paleta.maduro` tostado (0,5–1).

- [ ] **Step 3: `Stalk.jsx` y `Plant.jsx`**: extraer `nodePosition` en `Stalk.jsx` y montar `<SoyNodes>` cuando `crop.cabeza === 'vainas'`; en `Plant.jsx`, la soja no pasa `head` a `Stalk` (no hay cabeza en la punta).

- [ ] **Step 4: Verificar en el navegador**

Soja en las etapas 5 a 9 a 1440×900, 390×844 y 360×740 (vertical). Girasol en la etapa 5 a 390×844 y 360×740.
Expected: flores violetas desde la 6, todas en la 7; vainas verdes llenas en la 8; planta sin hojas con vainas tostadas en la 9; en vertical, el girasol entra completo en la etapa 5 y las vainas de soja quedan por encima de la tarjeta en las etapas 6–8. Consola sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/three/dicot/SoyNodes.jsx src/three/plantLayout.js src/three/plantLayout.test.js src/three/Plant.jsx src/three/dicot/Stalk.jsx
git commit -m "feat: flores y vainas de soja, con defoliación en la madurez"
```

---

### Task 8: Cultivo vecino, hectárea y rendimiento

**Files:**
- Modify: `src/three/Plant.jsx` (`NEIGHBOR_COUNT`), `src/three/Field.jsx` (`simplePlant`), `src/three/GrowthScene.jsx`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `window.__surcoGL` (el `WebGLRenderer`) solo con `import.meta.env.DEV`, asignado en `onCreated` del `<Canvas>`.

- [ ] **Step 1: `NEIGHBOR_COUNT`**: girasol `{ high: 60, low: 22 }`, soja `{ high: 160, low: 48 }`.

- [ ] **Step 2: `simplePlant`** en `Field.jsx`: girasol (tallo, dos hojas `createBroadLeafGeometry(4, 'acorazonada')` secas y colgando, disco `CylinderGeometry` de 6 lados mirando al suelo, dorso marrón); soja (tallo, 3 ramas, 6–8 racimos de vainas como elipsoides tostados de 6 × 4 segmentos, sin hojas).

- [ ] **Step 3: Hook de memoria** en `GrowthScene.jsx`.

- [ ] **Step 4: Verificar rendimiento y memoria**

Run: `pnpm dev` (en segundo plano). Con Playwright a 1440×900: etapa 7; leer `__surcoGL.info.memory.geometries` con trigo; cambiar trigo → girasol → soja → maíz → trigo esperando 3 s entre cada uno; volver a leer.
Expected: la cuenta final de geometrías es igual a la inicial (±2). Etapa 10 de girasol y soja: lote maduro sin huecos raros, consola sin errores. Medir FPS en la etapa 7 de girasol (`requestAnimationFrame` durante 3 s): si queda por debajo del de maíz en la misma etapa por más de 20 %, marcar los aquenios con `userData.noMirror` y agregar a `Capitulum` un disco texturizado por color de vértice para las copias.

- [ ] **Step 5: Commit**

```bash
git add src/three/Plant.jsx src/three/Field.jsx src/three/GrowthScene.jsx src/three/dicot/Capitulum.jsx
git commit -m "feat: hectárea de girasol y soja, y vecinos ajustados por cultivo"
```

---

### Task 9: Interfaz: selector, íconos, ficha y versión sin WebGL

**Files:**
- Modify: `src/components/CropSelector/CropSelector.module.css`, `src/components/CropSelector/CropIcon.jsx`
- Modify: `src/components/GrowthStory/GrowthStory.module.css`, `src/components/GrowthStory/ProgressRail.module.css`
- Modify: `src/components/SeedLabel/SeedLabel.module.css:15-16`
- Modify: `src/components/StaticFallback/StaticFallback.jsx`

**Interfaces:**
- Consumes: `CROP_ORDER` (Tarea 4), `crop.tipo`, `crop.paleta.flor`.

- [ ] **Step 1: Selector**: por debajo de 1100 px, `.group` pasa a `display: grid; grid-template-columns: repeat(4, 1fr)`; en mobile las opciones mantienen ícono arriba y nombre abajo. El riel mobile (`ProgressRail.module.css`, `top: calc(var(--header-h) + 4.4rem)`) baja la altura de la fila extra.

- [ ] **Step 2: Íconos** en `CropIcon.jsx`: `girasol` (disco con 10–12 pétalos alrededor, centro relleno) y `soja` (vaina curva con tres granos), 24 × 24, trazo 1,5 en `currentColor`, como los existentes.

- [ ] **Step 3: Ficha**: grilla del selector `repeat(4, 1fr)`.

- [ ] **Step 4: `StaticFallback`**: si `crop.tipo === 'dicotiledonea'`: raíz pivotante (una central y laterales cortas) en lugar del abanico; gancho y cotiledones en las etapas 2–3; hojas anchas (girasol: corazones; soja: tres folíolos) en lugar de cintas; `Head` con `capitulo` (disco con pétalos `paleta.flor`, que gira hacia abajo con `madurez`) y `vainas` (flores violetas con `polen`, vainas en los nudos con `grano`, sin hojas con `madurez` = 1).

- [ ] **Step 5: Verificar en el navegador**

Con Playwright:
- Selector a 360, 390, 768, 1024, 1100 y 1440 px: sin desbordes ni superposición con el riel; navegación con flechas por los 8.
- Sin WebGL (`page.addInitScript` que haga devolver `null` a `HTMLCanvasElement.prototype.getContext` para `webgl` y `webgl2`): girasol y soja en las 11 etapas.
- Calculadora: elegir maíz, editar plantas, elegir girasol → texto "bolsas de 180.000 semillas"; "Usar en la cotización" → el mensaje lo dice y el desplegable de la cotización muestra girasol; soja → "bolsas de 40 kg".

Expected: todo lo anterior sin errores en consola.

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "feat: selector de 8 cultivos, íconos y versión sin WebGL de girasol y soja"
```

---

### Task 10: Textos, imagen para redes, README y cierre

**Files:**
- Modify: `index.html`, `src/components/Footer/Footer.jsx:12`, `README.md`, `public/og.jpg`, `docs/capturas/*`

- [ ] **Step 1: Textos**: las listas de cultivos de `index.html` (description, og:description), `Footer.jsx` y `README.md` pasan a "trigo, cebada, avena, centeno, maíz, sorgo, girasol y soja"; `twitter:description` dice "ocho cultivos".

- [ ] **Step 2: `og.jpg`**: regenerar como en el commit `a68f2b6` (escena de trigo en la etapa 9 sin interfaz + composición HTML en el scratchpad), con la etiqueta "Trigo · Cebada · Avena · Centeno · Maíz · Sorgo · Girasol · Soja · Pergamino". Si no entra en una línea a 20 px, bajar a 18 px. JPEG calidad 84, < 300 KB.

- [ ] **Step 3: Capturas del README**: `desktop-girasol-floracion.jpg` (1440×900, etapa 7) y `mobile-soja-llenado.jpg` (390×844, etapa 8), con `scroll-behavior: auto` forzado y `about:blank` antes de cada carga. Sumarlas a las tablas del README y actualizar "Qué tiene" (8 cultivos, dicotiledóneas con germinación epigea, capítulo y vainas).

- [ ] **Step 4: Verificación final**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: sin advertencias; todos los tests en PASS; build sin errores. Sumar los `gzip` de los `.js` de `dist/assets` → < 450 KB.

Con Playwright, recorrer los 8 cultivos en las etapas 2, 7 y 10 a 1440×900 y compararlos con las capturas de `main` para los seis actuales. Lighthouse (mobile y desktop) en `pnpm preview`: accesibilidad y buenas prácticas ≥ 90.

- [ ] **Step 5: Commit**

```bash
git add index.html src/components/Footer/Footer.jsx README.md public/og.jpg docs/capturas
git commit -m "docs: textos, imagen para redes y README con girasol y soja"
```
