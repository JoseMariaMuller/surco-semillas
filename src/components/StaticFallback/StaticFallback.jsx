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

/** Ilustración estática por etapa, para navegadores sin WebGL. */
export default function StaticFallback({ crop, stage }) {
  const g = GROWTH_FRAMES[stage]
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
                  <PlantSvg crop={crop} g={g} scale={0.6} simple />
                </g>
              )
            }),
          ).reverse()
        ) : (
          <>
            {roots.map((a, i) => {
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
            <PlantSvg crop={crop} g={g} />
          </>
        )}
      </svg>
    </div>
  )
}
