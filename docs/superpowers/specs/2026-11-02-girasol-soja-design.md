# Girasol y soja: diseño

Fecha: 2026-11-02
Estado: aprobado en conversación, pendiente de revisión del documento

## Objetivo

Sumar **girasol** y **soja** a Surco Semillas con el mismo nivel que los seis cultivos actuales, antes de publicar el repo. "Lo más real posible": la botánica, las escalas fenológicas y los datos agronómicos tienen que poder defenderse ante un público del agro.

Se consideran terminados cuando se cumplen los criterios de la consigna original, ahora para los 8 cultivos:

- Los 8 crecen con el scroll, cada uno con su forma reconocible, y se puede cambiar de cultivo en cualquier etapa.
- La cámara recorre desde la semilla bajo tierra hasta la hectárea, sin saltos bruscos.
- Se ve y se usa bien de 360 a 1920 px, con teclado y con movimiento reducido.
- La calculadora sigue dando ~149 kg/ha para el ejemplo de trigo.
- `pnpm build` sin errores y `pnpm lint` sin advertencias.
- Todo el 3D sigue siendo procedural.
- JS total < 450 KB gzip (hoy ~346 KB).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Enfoque técnico | **A**: un segundo armado de planta para dicotiledóneas (`crop.tipo`), con piezas nuevas para brote, tallo con hojas y cabeza; se reutiliza todo lo demás. Los seis cultivos actuales no se tocan. |
| Selector en mobile | Dos filas de 4. |
| Orden de los cultivos | Por campaña, fina y después gruesa: trigo, cebada, avena, centeno, maíz, sorgo, girasol, soja. Trigo sigue siendo el inicial. |
| Hectárea final | Maduros, como los demás: girasol con capítulos caídos y dorso marrón; soja defoliada, con vainas tostadas. |
| Días por etapa | Número único, como los demás cultivos. Los extremos salen de fuentes; los intermedios son interpolados (ver "Fuentes"). |

## 1. Datos

### Cultivos (`src/data/crops.js`)

| Campo | Girasol | Soja |
|---|---|---|
| `id` | `girasol` | `soja` |
| `cientifico` | *Helianthus annuus* | *Glycine max* |
| `tipo` | `dicotiledonea` | `dicotiledonea` |
| `scale` | `schneiter` | `fehr` |
| `H` | 1.8 m | 0.9 m |
| `d` | 0.05 m | 0.04 m |
| `cabeza` | `capitulo` | `vainas` |
| `siembra` | oct–nov | oct–dic |
| `densidad` | 5 pl/m² | 30 pl/m² |
| `pms` | 60 g | 160 g |
| `ciclo` | 120 días | 133 días |
| `rinde` | 3–4 t/ha | 3,5–4,5 t/ha |
| `macollos` | 0 | 0 |
| `surco` | 0.70 m | 0.42 m |
| `pg` | 92 | 92 |
| `logro` | 90 | 80 |
| `bolsa` | `{ tipo: 'semillas', cantidad: 180000 }` | `{ tipo: 'kg', cantidad: 40 }` |
| `variedades` | Surco GS Quebracho (Híbrido alto oleico); Surco GS Lapacho (Híbrido convencional) | Surco SJ Timbó (Grupo de madurez IV); Surco SJ Ñandubay (Grupo de madurez V) |
| `semilla` | `aquenio` | `redonda` |
| `paleta` | hoja `#4E8A34`, maduro `#7A5A32`, grano `#2F2A26`, flor `#F2B705` | hoja `#3F7F3A`, maduro `#A88452`, grano `#E5CF8A`, flor `#9C6FC4` |

- `tipo: 'graminea'` se agrega a los seis existentes.
- `paleta.flor` es nueva; solo la usan girasol (liguladas) y soja (flores).
- Las paletas son punto de partida: se ajustan en la revisión visual.
- `CROP_ORDER` pasa a `['trigo', 'cebada', 'avena', 'centeno', 'maiz', 'sorgo', 'girasol', 'soja']`.

### Calculadora (`src/utils/seedCalculator.js`)

- `calcularSemilla` deja de decidir con `cultivo === 'maiz'`: recibe la `bolsa` del cultivo (`{ tipo, cantidad }`) y divide por semillas o por kg según `bolsa.tipo`.
- Se quitan las constantes `BOLSA_KG` y `BOLSA_SEMILLAS` si ya no las usa nadie.
- Resultados esperados (para los tests): girasol, 5 pl/m², PMS 60, PG 92, logro 90 → ~3,6 kg/ha y ~60.386 semillas/ha; soja, 30 pl/m², PMS 160, PG 92, logro 80 → ~65,2 kg/ha.

### Etapas (`src/data/stages.js`)

Se mantienen las 11 etapas, el riel y la tabla de crecimiento compartida.

| # | Girasol: código | Nombre | Días | Soja: código | Nombre | Días |
|---|---|---|---|---|---|---|
| 0 | Siembra (S) | Siembra | 0 | Siembra (S) | Siembra | 0 |
| 1 | Germinación (G) | Germinación | 4 | Germinación (G) | Germinación | 3 |
| 2 | VE | Emergencia | 8 | VE | Emergencia | 7 |
| 3 | V4 | Primeras hojas | 20 | V2 | Primeras hojas | 18 |
| 4 | V8 | Crecimiento vegetativo | 32 | V5 | Crecimiento vegetativo | 30 |
| 5 | R1 | **Botón floral** | 45 | V7 | **Ramificación** | 40 |
| 6 | R4 | **Apertura del capítulo** | 62 | R1 | **Inicio de floración** | 48 |
| 7 | R5.5 | Floración | 70 | R2 | **Floración plena** | 55 |
| 8 | R7 | Llenado de grano | 90 | R6 | Llenado de grano | 95 |
| 9 | R9 | Madurez | 120 | R8 | Madurez | 133 |
| 10 | 1 ha | Una hectárea | — | 1 ha | Una hectárea | — |

- Los nombres por cultivo pasan a una tabla de datos (`NAMES[cropId][i]`) en lugar de `if` sueltos; maíz ("Panojamiento") y "Crecimiento vegetativo" (sin macollos) se migran a esa tabla.
- `DAYS` suma `girasol` y `soja` con los valores de la tabla.
- `TEXTS` suma `girasol` y `soja` con textos propios para las etapas 0 a 9 (2 o 3 oraciones, voseo, verbos simples). La 0 también cambia: en las dicotiledóneas las reservas están en los cotiledones. Contenido mínimo por etapa:
  - **Girasol**: 0 aquenio y cotiledones con reservas; 1 imbibición y radícula; 2 el hipocótilo sale en gancho y abre los cotiledones; 3 cuatro hojas verdaderas y raíz pivotante profunda; 4 crecimiento rápido de hojas y tallo; 5 asoma el botón floral en estrella (R1); 6 el capítulo se abre y muestra las liguladas (R4); 7 las flores del disco se abren en anillos de afuera hacia adentro y las abejas lo polinizan (R5); 8 el dorso del capítulo se pone amarillo y los aquenios se llenan (R7); 9 brácteas marrones, capítulo caído, madurez fisiológica (R9).
  - **Soja**: 0 semilla y cotiledones; 1 imbibición y radícula; 2 el hipocótilo en gancho arrastra los cotiledones fuera de la tierra; 3 hojas unifoliadas y primeras trifoliadas, nódulos con bacterias que fijan nitrógeno; 4 trifoliadas sucesivas, nódulos activos; 5 ramas desde los nudos de abajo; 6 primera flor en cualquier nudo (R1); 7 flor abierta en uno de los dos nudos de arriba (R2), la flor se autopoliniza antes de abrir; 8 vainas con granos que llenan la cavidad (R6), el período que más define el rinde; 9 95 % de vainas con color maduro y planta sin hojas (R8).
- La tabla `GROWTH_TABLE` no cambia. Cada pieza nueva interpreta las claves así:

| Clave | Girasol | Soja |
|---|---|---|
| `semilla` | hinchazón del aquenio | hinchazón de la semilla |
| `raiz` | raíz pivotante | raíz pivotante; nódulos desde 0,5 |
| `brote` | gancho del hipocótilo (0–0,6) y apertura de cotiledones (0,6–1) | igual |
| `hojas` | hojas desplegadas, en orden | unifoliadas y después trifoliadas, en orden |
| `tallo` | alargamiento; botón floral desde 0,5 | alargamiento; ramas desde 0,5 |
| `cabeza` | capítulo que crece y se abre | flores que aparecen de los nudos medios hacia arriba |
| `polen` | antesis en anillos, del borde al centro; partículas de polen | todas las flores abiertas; sin partículas |
| `grano` | liguladas marchitas, aquenios oscuros | caen las flores, crecen y se llenan las vainas |
| `madurez` | cuello curvado hacia abajo, dorso amarillo → marrón, hojas secas | vainas tostadas; hojas amarillas que caen de abajo hacia arriba |
| `campo` | hectárea | hectárea |

## 2. Modelado 3D

### Armado (`src/three/Plant.jsx`)

- Según `crop.tipo`, `Plant` arma la planta con las piezas de gramínea (sin cambios) o con las de dicotiledónea.
- Comparten: `Seed`, `Roots`, `SwapGroup`, `Neighbors`, `Pollen`, `Field`, el viento (`applyWind`) y `growthState`.
- La planta de dicotiledónea expone un `groupRef` del tallo para que `Neighbors` la copie igual que hoy.

### Piezas nuevas (`src/three/dicot/`)

- **`Hypocotyl.jsx`**: tubo curvo en gancho que sube desde la semilla. Con `brote` 0–0,6 cruza la tierra con los cotiledones cerrados; con 0,6–1 se endereza sobre el suelo y los cotiledones se abren. Cotiledones ovalados (girasol) o gruesos y verde amarillentos (soja). Después amarillean y caen cuando la planta tiene varias hojas. El tegumento queda bajo tierra.
- **`Stalk.jsx`**: tallo sin vainas, con nudos; hojas con pecíolo en cada nudo.
  - Girasol: tallo de ~2 cm de diámetro; ~16 hojas (12 en mobile); primeros pares opuestos y después alternas en espiral.
  - Soja: par de unifoliadas opuestas en el primer nudo y trifoliadas alternas después; ~12 nudos; 2 o 3 ramas desde los nudos de abajo, que crecen con `tallo` > 0,5.
  - Madurez: hojas que amarillean y caen de abajo hacia arriba (soja: sin hojas en R8; girasol: secas y colgando).
- **`broadLeafGeometry.js`**: lámina ancha propia (BufferGeometry): contorno acorazonado con borde aserrado (girasol) u ovalado (folíolo de soja), nervadura central plegada, caída hacia la punta, colores por vértice. Reutiliza el patrón de `leafGeometry.js`.
- **`Capitulum.jsx`** (girasol):
  - Botón en estrella de brácteas desde R1 (`tallo` > 0,5, antes de que suba `cabeza`).
  - Disco de ~22 cm con brácteas verdes atrás y 30–35 liguladas amarillas (`InstancedMesh`).
  - Flores del disco y aquenios: `InstancedMesh` en espiral de Vogel (ángulo áureo), 600 en desktop y 250 en mobile.
  - Mira al este, del lado de la cámara de las etapas 6 y 7; en madurez el cuello se curva y el capítulo queda hacia abajo.
- **`SoyNodes.jsx`** (soja): por nudo (tallo y ramas), 2 a 4 flores violetas chiquitas y después 2 o 3 vainas pubescentes con los granos marcados; ~40 vainas en total. Vainas: verde → amarillo → tostado.

### Cambios en piezas existentes

- **`parts/Seed.jsx`**: formas `aquenio` (lágrima aplanada con rayas por vértice) y `redonda` (esfera apenas achatada con hilo oscuro).
- **`plantLayout.js`**:
  - `MORPH.girasol` y `MORPH.soja` (hojas, nudos, radio de tallo, raíz, semilla, tamaño de cabeza).
  - `buildRoots` con variante `pivotante`: raíz principal gruesa casi recta y 15–20 laterales más horizontales y largas; en soja, posiciones de nódulos sobre las laterales de arriba.
  - `buildLayout` devuelve `focus` (punto que mira la cámara en las etapas 6–8): capítulo en girasol, tercio medio del tallo en soja, choclo en maíz y cabeza en el resto. Reemplaza el caso especial `ear` de `cameraFrame`.
- **`parts/Roots.jsx`**: radio por raíz (la pivotante es más gruesa) y nódulos instanciados (soja) que aparecen con `raiz` > 0,5.
- **`stages.js` / `cameraFrame`**: usa `focus` del layout en lugar del caso especial de maíz.
- **`Plant.jsx` / `pollenEmitter`**: girasol emite desde el disco; soja devuelve `null` y `Pollen` no se monta.
- **`NEIGHBOR_COUNT`**: girasol `{ high: 60, low: 22 }`, soja `{ high: 160, low: 48 }`.
- **`Field.jsx` / `simplePlant`**: girasol con tallo, dos hojas secas colgando y capítulo caído de dorso marrón; soja como arbusto de tallo y ramas con racimos de vainas tostadas, sin hojas.

### Rendimiento

- El capítulo copiado en 60 vecinos (600 × 60) es comparable al choclo de maíz (640 × 70), que hoy funciona.
- Si la medición muestra caídas de cuadros, los vecinos usan menos aquenios: el capítulo marca la mayoría como `noMirror` y deja una versión reducida para las copias.
- Estimado: +15–20 KB gzip de JS.

## 3. Interfaz y textos

- **`CropSelector`**: desde 1100 px, una fila de 8; por debajo de 1100 px (mobile incluido), grilla de 4 columnas en dos filas. El corte exacto se ajusta en la revisión visual si a 1100 px la fila pisa el riel.
- **Ficha técnica (`SeedLabel`)**: selector de 4×2; los campos salen de los datos.
- **Calculadora y cotización**: toman `CROP_LIST`; la calculadora muestra la bolsa del cultivo ("bolsas de 180.000 semillas", "bolsas de 40 kg").
- **`CropIcon`**: girasol (capítulo de frente con pétalos) y soja (vaina con tres granos), con el mismo trazo que los actuales.
- **`StaticFallback`**: SVG por etapa para los dos: cotiledones (etapas 2–3), hojas anchas o trifoliadas, capítulo que se dobla al madurar, flores y vainas en los nudos.
- **Textos con la lista de cultivos**: meta description, Open Graph y Twitter (`index.html`), footer y README pasan a nombrar los 8 en orden de campaña.
- **`public/og.jpg`**: se regenera con la etiqueta nueva; la imagen sigue siendo el trigo maduro.
- **README**: capturas nuevas de girasol y soja (una desktop y una mobile) y texto actualizado.

## 4. Pruebas

- **Calculadora**: tests para girasol (bolsas por semillas) y soja (bolsas de 40 kg); los existentes siguen pasando.
- **Etapas**: test nuevo (`src/data/stages.test.js`) que verifica, para los 8 cultivos, 11 códigos, días no decrecientes de la etapa 0 a la 9, nombre y texto en cada etapa. El script `test` corre los dos archivos.
- **Visual (Playwright)**: girasol y soja en las 11 etapas a 1440×900 y 390×844; consola sin errores; recorrida por los 8 cultivos para confirmar que los seis actuales no cambiaron; selector a 360, 768 y 1024 px.
- **Cierre**: `pnpm lint`, `pnpm build`, JS < 450 KB gzip, Lighthouse accesibilidad y buenas prácticas ≥ 90.

## Fuera de alcance

- Abejas u otros insectos.
- Girasol confitero y soja de segunda.
- Cambios en los seis cultivos actuales, salvo el orden, los textos compartidos y la migración de nombres de etapa a la tabla de datos.

## Fuentes

Confirmados con fuente:

- Girasol, densidad ~50.000 pl/ha: [Engormix](https://www.engormix.com/agricultura/siembra-girasol/implantacion-girasol_a26489/), [Corteva](https://www.corteva.com/es/agronomia-y-servicios/Guia-Girasol/Densidad-de-plantas-en-girasol.html).
- Girasol, siembra desde el 10–15 de octubre en el centro-norte bonaerense y rindes por fecha (INTA Chivilcoy): [Engormix](https://www.engormix.com/agricultura/siembra-girasol/implantacion-girasol_a26489/), [Bichos de Campo](https://bichosdecampo.com/dos-meses-de-atraso-casi-la-mitad-del-rinde-un-ensayo-del-inta-mostro-cuanto-puede-perder-el-girasol-cuando-se-demora-la-siembra/).
- Girasol, altura ~1,8 m, 63–75 días a floración y 111–122 a madurez fisiológica: [Nuseed X4334 CL](https://nuseed.com/ar/producto/x4334-cl/), [Nusol 4175 CL](https://nuseed.com/ar/producto/nusol-4175-cl/), [Nusol 4180 CL Plus](https://nuseed.com/ar/producto/nusol-4180-cl-plus/).
- Girasol, PMS 40–80 g: [Nuseed](https://nuseed.com/es/proteccion-del-rendimiento/).
- Girasol, bolsa de 180.000 semillas: [Campo Simple](https://www.camposimple.com.ar/default/semillas/girasol.html).
- Girasol, rinde 2024/25 (promedio nacional 2,34 t/ha; núcleo norte 2,8 t/ha): [Bichos de Campo](https://bichosdecampo.com/2025-el-ano-del-girasol-con-rendimientos-por-encima-de-los-historicos-y-una-produccion-mayor-que-la-esperada-el-cultivo-esta-de-festejos/).
- Girasol, escala de Schneiter y Miller (1981): [Pioneer](https://www.pioneer.com/CMRoot/International/Argentina/productos_y_servicios/Girasol_boletin.pdf).
- Soja, densidad 24–36 pl/m² (INTA Pergamino) y ~30 en grupos CREA: [Engormix](https://www.engormix.com/agricultura/siembra-soja/densidad-siembra-cultivo-soja_f15227/).
- Soja, PMS 129–177 g: [UCA](https://repositorio.uca.edu.ar/bitstream/123456789/19742/1/influencia-polinizacion-entomofila.pdf).
- Soja, bolsa de 40 kg: [Infocampo](https://www.infocampo.com.ar/?p=228382).
- Soja, ciclo de GM IV largo de primera, 133 días: [INTA Rafaela](https://repositorio.inta.gob.ar/bitstream/handle/20.500.12123/10785/INTA_CRSantaFe_EEARafaela_informacion_tecnica_produccion_vegetal_2021.pdf?sequence=1&isAllowed=y).
- Soja, siembra de GM IV desde el 10 de octubre (INTA Oliveros) y ensayo sembrado el 20 de noviembre (INTA Pergamino): [argentina.gob.ar](https://www.argentina.gob.ar/noticias/cultivo-de-soja-fecha-de-siembra-y-grupo-de-madurez-para-potenciar-el-rendimiento), [INTA Pergamino](https://www.argentina.gob.ar/sites/default/files/2024/08/inta_crbsasnorte_eeapergamino_ensayo_comparativo_de_rendimiento_soja_0.pdf).
- Soja, escala de Fehr y Caviness: [planthealth.info](https://planthealth.info/diag_soygrowth.htm).

Sin fuente (prácticas habituales, a confirmar con un agrónomo de la zona):

- Distancia entre surcos: 70 cm girasol, 42 cm soja (también se usa 52 cm en los dos).
- Profundidad de siembra: 5 cm girasol, 4 cm soja.
- Logro de implantación: 90 % girasol, 80 % soja.
- Rinde potencial de soja: 3,5–4,5 t/ha.
- Días de las etapas intermedias: interpolados entre los extremos con fuente.
- Variedades: inventadas, como las demás.
