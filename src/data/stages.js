import { CROPS } from './crops.js'

export const STAGE_COUNT = 11 // etapas 0 a 10

const STAGE_NAMES = [
  'Siembra',
  'Germinación',
  'Emergencia',
  'Primeras hojas',
  'Macollaje',
  'Encañazón',
  'Espigazón',
  'Floración',
  'Llenado de grano',
  'Madurez',
  'Una hectárea',
]

// Códigos por escala
const CODES = {
  zadoks: ['Z00', 'Z05', 'Z10', 'Z13', 'Z23', 'Z32', 'Z55', 'Z65', 'Z75', 'Z92', '1 ha'],
  vr: ['Siembra', 'Germinación', 'VE', 'V3', 'V8', 'V12', 'VT', 'R1', 'R3', 'R6', '1 ha'],
  vanderlip: ['Siembra', 'Germinación', 'Etapa 0', 'Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 5', 'Etapa 6', 'Etapa 7', 'Etapa 9', '1 ha'],
}

// Versión corta para el riel de progreso
const SHORT = { Siembra: 'S', 'Germinación': 'G', 'Etapa 0': 'E0', 'Etapa 1': 'E1', 'Etapa 2': 'E2', 'Etapa 3': 'E3', 'Etapa 5': 'E5', 'Etapa 6': 'E6', 'Etapa 7': 'E7', 'Etapa 9': 'E9' }
export function stageShortCode(crop, i) {
  const c = CODES[crop.scale][i]
  return SHORT[c] ?? c
}

// Días desde la siembra
const DAYS = {
  trigo: [0, 3, 10, 25, 50, 90, 120, 130, 145, 170, null],
  maiz: [0, 3, 7, 18, 35, 50, 65, 68, 90, 130, null],
  sorgo: [0, 3, 7, 15, 25, 40, 60, 70, 90, 115, null],
}

const TEXTS = {
  base: [
    'La semilla seca espera bajo unos centímetros de tierra. Adentro guarda el embrión y las reservas que lo van a alimentar hasta que tenga hojas.',
    'La semilla absorbe agua y se hincha. En unos días asoma la radícula, la primera raíz.',
    'El coleoptile rompe la costra y la primera hoja sale a la luz. Abajo, las raíces seminales ya buscan agua.',
    'Ya hay tres hojas desplegadas y la planta hace fotosíntesis por su cuenta. Las reservas del grano están casi agotadas.',
    'Desde la base salen macollos, tallos hermanos que pueden llevar su propia espiga. Las raíces se ramifican y profundizan.',
    'Los entrenudos se estiran y aparecen los nudos sobre el suelo. Adentro de la vaina, la espiga sube con el tallo.',
    'La espiga asoma de la vaina de la hoja bandera. Ya está definido cuántas espiguillas va a tener.',
    'Cuelgan las anteras amarillas y sueltan el polen. Unos días de calor fuerte ahora pueden costar granos.',
    'Los granos se llenan con lo que fabrican las hojas. Pasan de lechosos a pastosos y las hojas de abajo empiezan a secarse.',
    'El grano llegó a su peso final y está duro. La planta se seca entera y queda lista para la cosecha.',
    'La misma planta, repetida en hileras. Así se ve una hectárea lograda.',
  ],
  maiz: {
    2: 'El coleoptile asoma y despliega la primera hoja (VE). El punto de crecimiento todavía está bajo tierra, protegido de las heladas.',
    3: 'Tres hojas con el cuello visible. La raíz seminal sostiene la planta mientras empiezan a formarse las raíces definitivas.',
    4: 'Ocho hojas y el tallo empieza a estirarse. Desde los nudos de abajo salen las raíces de la corona, que anclan la planta.',
    5: 'Doce hojas y un tallo grueso, con nudos marcados. Ahora se define cuántas hileras y cuántos granos va a tener el choclo.',
    6: 'La panoja asoma arriba de todo, con sus ramas abiertas. Está a punto de largar el polen.',
    7: 'La barba sale de la chala: cada hilo es un grano posible. El polen que cae de la panoja tiene que llegar a cada uno.',
    8: 'Los granos del choclo se llenan de un líquido lechoso. La barba se pone marrón y la chala empieza a aflojarse.',
    9: 'Se forma la capa negra en la base de cada grano: ya no suma peso. La chala y las hojas se secan.',
  },
  sorgo: {
    2: 'La plántula emerge con su primera hoja. El sorgo arranca lento y necesita suelo caliente.',
    3: 'Tres hojas con el cuello visible. La raíz se afirma antes de que la planta crezca en serio.',
    4: 'Cinco hojas y crecimiento rápido. El sorgo no macolla en este cultivo: todo va al tallo principal.',
    5: 'El punto de crecimiento pasa a ser reproductivo. Se empieza a formar la panoja adentro del tallo.',
    6: 'La panoja sale de la vaina de la hoja bandera, compacta y todavía verde.',
    7: 'La panoja florece de arriba hacia abajo durante varios días.',
    8: 'Los granos se llenan y toman su color rojizo. La panoja gana peso.',
    9: 'Aparece la capa negra en la base del grano: madurez fisiológica. El grano se oscurece.',
  },
}

export function stageNameFor(crop, i) {
  if (crop.macollos === 0 && i === 4) return 'Crecimiento vegetativo'
  if (crop.id === 'maiz' && i === 6) return 'Panojamiento'
  return STAGE_NAMES[i]
}

export function stageCode(crop, i) {
  return CODES[crop.scale][i]
}

export function stageDays(crop, i) {
  if (crop.id === 'maiz') return DAYS.maiz[i]
  if (crop.id === 'sorgo') return DAYS.sorgo[i]
  const d = DAYS.trigo[i]
  if (d == null) return null
  return Math.round((d * crop.ciclo) / CROPS.trigo.ciclo)
}

export function stageText(crop, i) {
  return TEXTS[crop.id]?.[i] ?? TEXTS.base[i]
}

export function getStages(cropId) {
  const crop = CROPS[cropId]
  return Array.from({ length: STAGE_COUNT }, (_, i) => ({
    index: i,
    code: stageCode(crop, i),
    short: stageShortCode(crop, i),
    name: stageNameFor(crop, i),
    days: stageDays(crop, i),
    text: stageText(crop, i),
  }))
}

// Fotogramas clave de crecimiento, 0 a 1
export const GROWTH_KEYS = [
  'semilla', 'raiz', 'brote', 'hojas', 'macollos', 'tallo',
  'cabeza', 'polen', 'grano', 'madurez', 'campo',
]

const GROWTH_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0.2, 0.05, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0.35, 1, 0.15, 0, 0, 0, 0, 0, 0, 0],
  [1, 0.5, 1, 0.4, 0, 0, 0, 0, 0, 0, 0],
  [1, 0.7, 1, 0.6, 1, 0.1, 0, 0, 0, 0, 0],
  [1, 0.85, 1, 0.9, 1, 0.75, 0, 0, 0, 0, 0],
  [1, 0.95, 1, 1, 1, 1, 1, 0, 0.1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 0.2, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0.3, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
]

export const GROWTH_FRAMES = GROWTH_TABLE.map((row) =>
  Object.fromEntries(GROWTH_KEYS.map((k, j) => [k, row[j]])),
)

// Cámara por etapa. `head` es el centro de la cabeza; `ear` el choclo (maíz).
export function cameraFrame(i, crop, head, ear) {
  const { H, d } = crop
  const focus = crop.id === 'maiz' && (i === 7 || i === 8) ? ear : head
  switch (i) {
    case 0: return { pos: [0, -d, 0.12], look: [0, -d, 0] }
    case 1: return { pos: [0.03, -d - 0.03, 0.22], look: [0, -d - 0.04, 0] }
    case 2: return { pos: [0.08, -0.02, 0.38], look: [0, -0.01, 0] }
    case 3: return { pos: [0.25, 0.08, 0.7], look: [0, 0.06, 0] }
    case 4: return { pos: [0.45, 0.18, 1.0], look: [0, 0.12, 0] }
    case 5: return { pos: [0.9 * H, 0.45 * H, 1.6 * H], look: [0, 0.4 * H, 0] }
    case 6: return { pos: [0.35 * H, 0.95 * H, 0.6 * H], look: head }
    case 7:
      return crop.id === 'maiz'
        ? { pos: [focus[0] + 0.25 * H * 0.5, focus[1] + 0.05, focus[2] + 0.45 * H * 0.5], look: focus }
        : { pos: [0.25 * H, 0.95 * H, 0.45 * H], look: focus }
    case 8:
      return crop.id === 'maiz'
        ? { pos: [focus[0] - 0.3 * H * 0.5, focus[1] + 0.02, focus[2] + 0.5 * H * 0.5], look: focus }
        : { pos: [-0.3 * H, 0.9 * H, 0.5 * H], look: focus }
    case 9: return { pos: [0.6 * H, 0.8 * H, 1.2 * H], look: [0, 0.75 * H, 0] }
    default: {
      const k = Math.max(H, 1)
      return { pos: [6 * k, 3.5 * k, 9 * k], look: [0, 0.5 * H, -4] }
    }
  }
}

// Campo visual por etapa: más cerrado bajo tierra para ver la semilla de cerca.
export const FOV_FRAMES = [22, 31, 34, 38, 38, 38, 38, 38, 38, 38, 40]

// Cielo, niebla y luz por etapa
export const SKY_FRAMES = [
  { sky: '#3b2a1e', fog: [0.6, 2.5], sun: 0.25, hemi: 0.55, sunColor: '#ffcf9a' },
  { sky: '#47321f', fog: [0.6, 2.5], sun: 0.3, hemi: 0.6, sunColor: '#ffcf9a' },
  { sky: '#e9b98f', fog: [4, 30], sun: 1.1, hemi: 0.7, sunColor: '#ffc58a' },
  { sky: '#d4dfd9', fog: [6, 40], sun: 1.6, hemi: 0.8, sunColor: '#fff1d8' },
  { sky: '#c3d9e2', fog: [6, 45], sun: 1.9, hemi: 0.85, sunColor: '#fff6e8' },
  { sky: '#b8d4e2', fog: [8, 50], sun: 2.0, hemi: 0.9, sunColor: '#ffffff' },
  { sky: '#b4d2e2', fog: [8, 50], sun: 2.0, hemi: 0.9, sunColor: '#ffffff' },
  { sky: '#b4d2e2', fog: [8, 50], sun: 2.0, hemi: 0.9, sunColor: '#fffaf0' },
  { sky: '#d6d4bf', fog: [8, 50], sun: 1.8, hemi: 0.85, sunColor: '#ffe9c2' },
  { sky: '#e6c486', fog: [8, 45], sun: 1.7, hemi: 0.75, sunColor: '#ffcf86' },
  { sky: '#e9c88e', fog: [10, 70], sun: 1.6, hemi: 0.75, sunColor: '#ffcf86' },
]
