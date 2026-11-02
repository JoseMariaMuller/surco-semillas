export default function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 28" aria-hidden="true" focusable="false">
      <path
        d="M2 20c6-5 12-5 18 0s12 5 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2 26c6-4 12-4 18 0s12 4 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <ellipse cx="20" cy="9.5" rx="4.6" ry="6.6" fill="var(--curasemilla)" />
      <path d="M20 4.5v10" stroke="var(--tierra)" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}
