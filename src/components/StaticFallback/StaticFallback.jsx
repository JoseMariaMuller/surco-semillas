import { GROWTH_FRAMES, SKY_FRAMES } from '../../data/stages.js'
import styles from './StaticFallback.module.css'

// Mezcla de dos colores hex
function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

const GROUND = 210
const LEAVES = { maiz: 12, sorgo: 9, default: 7 }

function Head({ crop, x, y, g, color, grain }) {
  if (g.cabeza <= 0) return null
  switch (crop.cabeza) {
    case 'espiga': {
      const long = crop.id === 'centeno' ? 26 : 20
      const awn = crop.id === 'cebada' ? 26 : crop.id === 'centeno' ? 12 : 5
      const bend = crop.id === 'cebada' ? g.madurez * 70 : 0
      return (
        <g transform={`rotate(${bend} ${x} ${y})`}>
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <ellipse cx={x - 3} cy={y - 4 - i * (long / 7)} rx="2.6" ry="4" fill={grain} transform={`rotate(-25 ${x - 3} ${y - 4 - i * (long / 7)})`} />
              <ellipse cx={x + 3} cy={y - 6 - i * (long / 7)} rx="2.6" ry="4" fill={grain} transform={`rotate(25 ${x + 3} ${y - 6 - i * (long / 7)})`} />
              <path d={`M${x - 4} ${y - 7 - i * (long / 7)}l-3 ${-awn}M${x + 4} ${y - 9 - i * (long / 7)}l3 ${-awn}`} stroke={grain} strokeWidth="0.7" />
            </g>
          ))}
        </g>
      )
    }
    case 'panoja-abierta':
      return (
        <g stroke={color} strokeWidth="1" fill={grain}>
          <path d={`M${x} ${y}v-34`} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path d={`M${x} ${y - 6 - i * 8}l-${14 - i * 2} ${8}M${x} ${y - 6 - i * 8}l${14 - i * 2} ${8}`} fill="none" />
              <path d={`M${x - 14 + i * 2} ${y + 2 - i * 8}c-2 3-2 6 0 8 2-2 2-5 0-8z`} stroke="none" />
              <path d={`M${x + 14 - i * 2} ${y + 2 - i * 8}c-2 3-2 6 0 8 2-2 2-5 0-8z`} stroke="none" />
            </g>
          ))}
        </g>
      )
    case 'panoja-compacta':
      return <ellipse cx={x} cy={y - 16} rx="9" ry="18" fill={grain} />
    default:
      // maíz: panoja arriba
      return (
        <g stroke={color} strokeWidth="1.2" fill="none">
          <path d={`M${x} ${y}v-26`} />
          {[-1, 1].map((s) => (
            <path key={s} d={`M${x} ${y - 6}q${s * 10} -6 ${s * 16} 6M${x} ${y - 12}q${s * 8} -5 ${s * 13} 4`} />
          ))}
        </g>
      )
  }
}

function PlantSvg({ crop, g, x = 240, scale = 1, simple = false }) {
  const green = crop.paleta.hoja
  const color = mix(green, crop.paleta.maduro, g.madurez)
  const grain = mix('8bb35a', crop.paleta.grano.slice(1), Math.max(g.grano * 0.6, g.madurez))
  // altura según el cultivo, para que el maíz entre en el cuadro
  const h = 118 * scale * (0.5 + 0.5 * Math.min(1, crop.H / 2.4))
  const top = GROUND - (g.brote * 8 + g.tallo * h)
  const n = LEAVES[crop.id] ?? LEAVES.default
  const shown = simple ? 3 : Math.floor(g.hojas * n + 0.001)
  const wide = crop.id === 'maiz' || crop.id === 'sorgo'
  const stems = crop.macollos > 0 && g.macollos > 0 ? [-14, 14] : []

  return (
    <g>
      {stems.map((a) => (
        <g key={a} transform={`rotate(${a} ${x} ${GROUND})`} opacity="0.85">
          <path d={`M${x} ${GROUND}V${top + 14}`} stroke={color} strokeWidth="2" />
          <Head crop={crop} x={x} y={top + 14} g={g} color={color} grain={grain} />
        </g>
      ))}
      {g.brote > 0 && !simple && (
        <path d={`M${x} ${GROUND + 12}V${GROUND}`} stroke="#e9e4bd" strokeWidth="1.6" />
      )}
      {g.brote > 0 && <path d={`M${x} ${GROUND}V${top}`} stroke={color} strokeWidth={wide ? 4 : 2.2} />}
      {Array.from({ length: shown }, (_, k) => {
        const side = k % 2 ? 1 : -1
        const y = GROUND - 2 - (k / n) * (GROUND - top) * 0.85
        const len = ((wide ? 34 : 24) + (k / n) * (wide ? 40 : 28)) * (simple ? 0.5 : 1)
        return (
          <path
            key={k}
            d={`M${x} ${y}q${side * len * 0.45} ${-len * 0.55} ${side * len} ${len * 0.15}`}
            stroke={color}
            strokeWidth={(wide ? 5 : 3) * (simple ? 0.6 : 1)}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}
      {crop.id === 'maiz' && g.cabeza > 0 && (
        <ellipse cx={x + 9} cy={GROUND - (GROUND - top) * 0.45} rx="5" ry="15" fill={mix('7ea24e', crop.paleta.maduro.slice(1), g.madurez)} transform={`rotate(20 ${x + 9} ${GROUND - (GROUND - top) * 0.45})`} />
      )}
      <Head crop={crop} x={x} y={top} g={g} color={color} grain={grain} />
      {g.polen > 0 &&
        [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={x + 8 + i * 9} cy={top - 10 + (i % 3) * 7} r="1.6" fill="#f3d55a" />)}
    </g>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
// Igual que en el 3D (stalkGrowth.js): hojas verdaderas después de los cotiledones,
// alargamiento por cultivo y la soja verde hasta R7.
const leafProgress = (g) => clamp01((g.hojas - 0.15) / 0.85)
const stemFraction = (crop, g) =>
  crop.id === 'soja' ? clamp01(0.2 * g.hojas + 0.35 * g.tallo + 0.45 * g.grano) : clamp01(0.25 * g.hojas + 0.75 * g.tallo)
const senescence = (crop, g) => (crop.id === 'soja' ? clamp01((g.madurez - 0.35) / 0.65) : g.madurez)

// Hoja acorazonada de girasol (base en 0,0, apunta hacia +x)
const heart = (len) =>
  `M0 0c${len * 0.15} ${-len * 0.45} ${len * 0.75} ${-len * 0.4} ${len} ${len * 0.05}c${-len * 0.3} ${len * 0.35} ${-len * 0.85} ${len * 0.45} ${-len} ${-len * 0.05}z`

/** Girasol y soja: gancho y cotiledones, hojas anchas o trifoliadas, capítulo o vainas. */
function DicotSvg({ crop, g, x = 240, scale = 1, simple = false }) {
  const pal = crop.paleta
  const sen = senescence(crop, g)
  const color = mix(pal.hoja, pal.maduro, sen)
  const soy = crop.id === 'soja'
  const h = 118 * scale * (0.5 + 0.5 * Math.min(1, crop.H / 2.4))
  const top = GROUND - 8 - stemFraction(crop, g) * h
  const lp = leafProgress(g)
  const n = soy ? 13 : 16
  const fallen = soy && g.madurez >= 1
  const shown = fallen ? 0 : simple ? 3 : Math.floor(lp * n + 0.001)
  const stemW = soy ? 1.8 : 3.4

  // Antes de emerger: gancho bajo tierra
  if (g.brote < 1) {
    if (g.brote <= 0 || simple) return null
    const yA = GROUND + 12 - 14 * g.brote
    return <path d={`M${x} ${GROUND + 12}V${yA}q4 -4 7 2`} stroke="#c9d79a" strokeWidth="1.6" fill="none" />
  }

  const cotyColor = soy ? '#b9c25a' : mix(pal.hoja, 'e3eab0', 0.25)
  const showCoty = g.hojas < 0.8 && !simple
  const bloom = g.cabeza * 0.35 + g.polen * 0.65
  const podC = mix('7aa045', pal.maduro.slice(1), clamp01((g.madurez - 0.35) / 0.65))

  return (
    <g>
      <path d={`M${x} ${GROUND}V${lp > 0 ? top : GROUND - 8}`} stroke={lp > 0 ? color : '#c9d79a'} strokeWidth={stemW} />
      {showCoty &&
        [-1, 1].map((sd) => (
          <ellipse key={sd} cx={x + sd * 8} cy={GROUND - 8} rx="7" ry="2.6" fill={cotyColor} />
        ))}
      {Array.from({ length: shown }, (_, k) => {
        const side = k % 2 ? 1 : -1
        const y = GROUND - 10 - (k / n) * (GROUND - 10 - top)
        // en el dibujo, el girasol muestra una hoja de cada dos para que no se empasten
        if (!soy && k % 2 === 1) return null
        const len = (soy ? 10 : 11 + 8 * Math.sin(Math.PI * Math.min(1, 0.15 + (k / n) * 0.9))) * (simple ? 0.6 : 1)
        const leafColor = mix(pal.hoja, pal.maduro, clamp01(sen * 1.5 - (k / n) * 0.5))
        if (!soy) {
          return <path key={k} d={heart(len)} fill={leafColor} transform={`translate(${x} ${y}) scale(${side} 1) rotate(${20 + 25 * sen})`} />
        }
        // soja: unifoliadas abajo y trifoliadas después, con pecíolo
        const px = x + side * len * 0.8
        const py = y - 3
        return (
          <g key={k} fill={leafColor}>
            <path d={`M${x} ${y}L${px} ${py}`} stroke={leafColor} strokeWidth="0.8" />
            {k < 2 ? (
              <ellipse cx={px + side * 4} cy={py} rx="5" ry="3" />
            ) : (
              <>
                <ellipse cx={px + side * 5} cy={py} rx="4.5" ry="2.4" />
                <ellipse cx={px + side * 1} cy={py - 4} rx="2.4" ry="4" />
                <ellipse cx={px + side * 1} cy={py + 4} rx="2.4" ry="4" />
              </>
            )}
          </g>
        )
      })}
      {soy &&
        Array.from({ length: 8 }, (_, k) => {
          const order = Math.min(1, Math.abs(k / 8 - 0.35) / 0.65)
          const y = GROUND - 14 - ((k + 1) / 9) * (GROUND - 14 - top)
          const side = k % 2 ? 1 : -1
          const flower = bloom > order && g.grano < 0.3 + 0.3 * order
          const pod = clamp01((g.grano - 0.2 - 0.3 * order) / 0.4)
          return (
            <g key={k}>
              {flower && <circle cx={x + side * 3} cy={y} r="1.8" fill={pal.flor} />}
              {pod > 0 && (
                <path d={`M${x} ${y}q${side * 3} ${4 * pod} ${side * 2} ${10 * pod}`} stroke={podC} strokeWidth={2.6 * pod + 0.5} strokeLinecap="round" fill="none" />
              )}
            </g>
          )
        })}
      {!soy && <Capitulo x={x} y={top} g={g} pal={pal} simple={simple} />}
      {!soy && g.polen > 0 &&
        [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={x + 14 + i * 8} cy={top - 6 + (i % 3) * 6} r="1.4" fill="#f3d55a" />)}
    </g>
  )
}

// Capítulo de girasol: botón, disco abierto con liguladas, dorso amarillo y caído al madurar.
function Capitulo({ x, y, g, pal, simple }) {
  const bud = clamp01((g.tallo - 0.5) / 0.5)
  if (bud <= 0) return null
  const r = 2 + 10 * g.cabeza
  const droop = clamp01((g.madurez - 0.15) / 0.85)
  const disc = mix('7d8a34', pal.grano.slice(1), clamp01((g.grano - 0.2) / 0.6))
  const rays = g.cabeza > 0.3 && g.grano < 0.85 && !simple
  return (
    <g transform={`translate(${x + 4 + 6 * droop} ${y - r * (1 - droop) + 4 * droop}) rotate(${droop * 75})`}>
      {rays &&
        Array.from({ length: 14 }, (_, k) => (
          <ellipse key={k} cx="0" cy={-r - 3} rx="1.6" ry="4" fill={mix(pal.flor.slice(1), '5b3d26', clamp01((g.grano - 0.35) / 0.5))} transform={`rotate(${(k * 360) / 14})`} />
        ))}
      <ellipse cx="0" cy="0" rx={r * (1 - 0.6 * droop)} ry={r} fill={droop > 0.3 ? mix('d9c25a', '6b4a2c', clamp01((g.madurez - 0.3) / 0.7)) : disc} />
    </g>
  )
}

/** Ilustración estática por etapa, para navegadores sin WebGL. */
export default function StaticFallback({ crop, stage }) {
  const g = GROWTH_FRAMES[stage]
  const dicot = crop.tipo === 'dicotiledonea'
  const Plant = dicot ? DicotSvg : PlantSvg
  const sky = SKY_FRAMES[stage].sky
  const roots = [-0.55, -0.25, 0, 0.25, 0.55]
  const rootLen = Math.pow(g.raiz, 1.5) * 120

  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg viewBox="0 0 480 360" preserveAspectRatio="xMidYMid slice" className={styles.svg}>
        <rect width="480" height={GROUND} fill={sky} />
        <rect y={GROUND} width="480" height={360 - GROUND} fill="#3a281c" />
        <rect y={GROUND + 70} width="480" height={360 - GROUND - 70} fill="#5a4231" />
        {/* surcos */}
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${GROUND - 2 + i * 0.3}H480`} stroke="#2a1d14" strokeWidth="0.6" opacity="0.4" />
        ))}

        {g.campo > 0 ? (
          // la hectárea: hileras de plantas que se achican hacia el horizonte
          Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 18 }, (_, i) => {
              // escala alrededor de la base de la planta (240, GROUND)
              const s = 1 - r * 0.12
              const tx = -200 + i * 34 + (r % 2) * 17 + 240 * (1 - s)
              const ty = -r * 14 + GROUND * (1 - s)
              return (
                <g key={`${r}-${i}`} transform={`translate(${tx} ${ty}) scale(${s})`}>
                  <Plant crop={crop} g={g} scale={0.6} simple />
                </g>
              )
            }),
          ).reverse()
        ) : (
          <>
            {dicot ? (
              // raíz pivotante: una principal y laterales cortas
              <g stroke="#efe4c8" fill="none">
                <path d={`M240 ${GROUND + 12}q2 ${rootLen * 0.5} -2 ${rootLen * 1.1}`} strokeWidth="1.8" />
                {Array.from({ length: Math.floor(rootLen / 14) }, (_, i) => {
                  const yy = GROUND + 20 + i * 13
                  const s = i % 2 ? 1 : -1
                  return <path key={i} d={`M240 ${yy}q${s * 10} 2 ${s * (22 - i * 1.5)} 9`} strokeWidth="0.9" />
                })}
              </g>
            ) : roots.map((a, i) => {
              const len = rootLen * (i === 2 ? 1 : 0.8)
              const ex = 240 + Math.sin(a) * len
              const ey = GROUND + 12 + Math.cos(a) * len
              return (
                <path
                  key={i}
                  d={`M240 ${GROUND + 12}Q${240 + Math.sin(a) * len * 0.3 + (i % 2 ? 6 : -6)} ${GROUND + 12 + len * 0.5} ${ex} ${ey}`}
                  stroke="#efe4c8"
                  strokeWidth="1.4"
                  fill="none"
                />
              )
            })}
            <ellipse
              cx="240"
              cy={GROUND + 12}
              rx={6 * (1 + 0.25 * g.semilla)}
              ry={3.6 * (1 + 0.25 * g.semilla)}
              fill={g.semilla > 0 ? '#e597b2' : '#b8406c'}
            />
            <Plant crop={crop} g={g} />
          </>
        )}
      </svg>
    </div>
  )
}
