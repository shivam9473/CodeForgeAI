// Original CodeForge mark: a hot ingot with code brackets and a quench-blue verified dot.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cf-g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb347" />
          <stop offset="0.6" stopColor="#ff7a2f" />
          <stop offset="1" stopColor="#e5601a" />
        </linearGradient>
      </defs>
      <path d="M16 2l12 7v14l-12 7L4 23V9z" fill="url(#cf-g)" />
      <path d="M12.6 11.8L8.6 16l4 4.2M19.4 11.8l4 4.2-4 4.2" stroke="#0a0f1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.9" fill="#4fd1e8" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[18px] font-extrabold tracking-tight">CodeForge</span>
    </span>
  );
}
