"use client";

export function StreetScoreCircle({ points, size = 92, compact = false }: { points: number; size?: number; compact?: boolean }) {
  const normalized = Math.min(100, Math.max(0, points));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  return <div className="flex items-center gap-3">
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg className="absolute -rotate-90" width={size} height={size}>
        <defs><linearGradient id={`street-${size}`}><stop stopColor="#ffbd66" /><stop offset=".55" stopColor="#ff7b54" /><stop offset="1" stopColor="#e64da1" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#street-${size})`} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - normalized / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="relative text-center"><div className={`${compact ? "text-lg" : "text-2xl"} font-semibold text-[#ffad72]`}>{points}</div>{!compact && <div className="text-[9px] uppercase tracking-wide text-[#6f7580]">points</div>}</div>
    </div>
    {!compact && <div><div className="text-sm font-semibold">Street Score</div><div className="mt-1 text-[11px] text-[#717680]">Verified OSS work</div></div>}
  </div>;
}
