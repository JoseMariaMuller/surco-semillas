// Íconos simples de la cabeza de cada cultivo (24 × 24, trazo en currentColor).
const grainPairs = (n, x, y0, dy, rx = 1.6, ry = 2.4, tilt = 28) =>
  Array.from({ length: n }, (_, i) => {
    const y = y0 + i * dy
    return (
      <g key={i}>
        <ellipse cx={x - 1.9} cy={y} rx={rx} ry={ry} transform={`rotate(-${tilt} ${x - 1.9} ${y})`} />
        <ellipse cx={x + 1.9} cy={y + dy / 2} rx={rx} ry={ry} transform={`rotate(${tilt} ${x + 1.9} ${y + dy / 2})`} />
      </g>
    )
  })

const ICONS = {
  maiz: (
    <>
      <path d="M12 21V3" fill="none" />
      <ellipse cx="12" cy="11" rx="3.4" ry="7" fill="currentColor" stroke="none" />
      <path d="M8.5 6.5v9M15.5 6.5v9" fill="none" opacity="0.5" />
      <path d="M12 21c-4-2-6.5-6-6.2-11.5C7.3 13 9 16 12 17.5M12 21c4-2 6.5-6 6.2-11.5C16.7 13 15 16 12 17.5" fill="none" />
      <path d="M11 4c-.6-1.2-1.6-2-2.8-2.3M13 4c.6-1.2 1.6-2 2.8-2.3" fill="none" />
    </>
  ),
  trigo: (
    <>
      <path d="M12 22V6" fill="none" />
      <g fill="currentColor" stroke="none">{grainPairs(5, 12, 6, 3)}</g>
      <path d="M10 6l-1.4-3M14 6l1.4-3M12 5V2" fill="none" />
    </>
  ),
  cebada: (
    <>
      <path d="M12 22V7" fill="none" />
      <g fill="currentColor" stroke="none">{grainPairs(4, 12, 8, 3.2, 1.3, 2.6, 12)}</g>
      <path d="M10.2 8L8.5 1M13.8 9.6L15.5 1.5M10.2 11.2L7.6 3M13.8 12.8L16.4 4" fill="none" />
    </>
  ),
  avena: (
    <>
      <path d="M12 22V2M12 6l-5 4M12 6l5 4M12 11l-4.5 4M12 11l4.5 4" fill="none" />
      <g fill="currentColor" stroke="none">
        <path d="M7 10c-1 1-1 3 0 4 1-1 1-3 0-4z" />
        <path d="M17 10c-1 1-1 3 0 4 1-1 1-3 0-4z" />
        <path d="M7.5 15c-1 1-1 3 0 4 1-1 1-3 0-4z" />
        <path d="M16.5 15c-1 1-1 3 0 4 1-1 1-3 0-4z" />
        <path d="M12 2c-1 1-1 3 0 4 1-1 1-3 0-4z" />
      </g>
    </>
  ),
  centeno: (
    <>
      <path d="M12 22V8" fill="none" />
      <g fill="currentColor" stroke="none">{grainPairs(6, 12, 7, 2.3, 1.1, 1.9, 18)}</g>
      <path d="M10.6 7L9 1M13.4 8L15 2M12 6V1" fill="none" />
    </>
  ),
  sorgo: (
    <>
      <path d="M12 22V15" fill="none" />
      <g fill="currentColor" stroke="none">
        {[
          [12, 3.5], [10, 5.5], [14, 5.5], [9, 8], [12, 7.5], [15, 8], [9.5, 10.5], [12, 10], [14.5, 10.5],
          [10.5, 13], [13.5, 13], [12, 12.5], [12, 15],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.5" />
        ))}
      </g>
    </>
  ),
  girasol: (
    <>
      <path d="M12 22v-8M12 18c-2.5-.2-4.2-1.4-5-3.2 2.4-.3 4.1.6 5 2.2" fill="none" />
      {Array.from({ length: 12 }, (_, k) => {
        const a = (k * 360) / 12
        return <ellipse key={k} cx="12" cy="3.4" rx="1.1" ry="2.3" fill="currentColor" stroke="none" transform={`rotate(${a} 12 8.6)`} />
      })}
      <circle cx="12" cy="8.6" r="3.2" fill="currentColor" stroke="none" />
    </>
  ),
  soja: (
    <>
      <path d="M12 2.5v3" fill="none" />
      <path d="M12.6 5.4c3.4 1 5 4.6 4.4 8.8-.6 4.2-3.3 7.4-6.8 7.6-1.6.1-2.4-1.1-1.9-2.6 1.2-3.4 2.5-6.6 2.6-10.6 0-1.8.6-3.4 1.7-3.2z" fill="none" />
      <g fill="currentColor" stroke="none">
        <circle cx="13.4" cy="9.4" r="1.7" />
        <circle cx="13.1" cy="13.4" r="1.7" />
        <circle cx="12.1" cy="17.3" r="1.7" />
      </g>
    </>
  ),
}

export default function CropIcon({ id, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[id]}
    </svg>
  )
}
