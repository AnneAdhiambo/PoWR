export function SquircleLoader({ size = 28, color = "#ff6a1a", label = "Loading" }: { size?: number; color?: string; label?: string }) {
  return <span role="status" aria-label={label} className="inline-grid place-items-center" style={{ width: size, height: size }}>
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      <rect x="5" y="5" width="30" height="30" rx="10" stroke={color} strokeOpacity=".12" strokeWidth="5" />
      <rect x="5" y="5" width="30" height="30" rx="10" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray="15 85">
        <animate attributeName="stroke-dashoffset" values="0;-100" dur="0.9s" repeatCount="indefinite" />
      </rect>
    </svg>
  </span>;
}
