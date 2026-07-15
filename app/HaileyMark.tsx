export default function HaileyMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hm-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00d4ff" />
          <stop offset="1" stopColor="#7b2fff" />
        </linearGradient>
      </defs>
      {/* Hexagonal chassis */}
      <path d="M18 1.5 L32 9.5 V26.5 L18 34.5 L4 26.5 V9.5 Z" fill="rgba(0,212,255,0.06)" stroke="url(#hm-grad)" strokeWidth="1.4" />
      {/* Circuit nodes on each vertex */}
      <circle cx="18" cy="1.5" r="1.1" fill="#00d4ff" />
      <circle cx="32" cy="9.5" r="1.1" fill="#7b2fff" />
      <circle cx="32" cy="26.5" r="1.1" fill="#7b2fff" />
      <circle cx="18" cy="34.5" r="1.1" fill="#ff006e" />
      <circle cx="4" cy="26.5" r="1.1" fill="#00d4ff" />
      <circle cx="4" cy="9.5" r="1.1" fill="#00d4ff" />
      {/* Inner visor / H bars */}
      <rect x="12" y="12" width="3.2" height="12" rx="1.2" fill="url(#hm-grad)" />
      <rect x="20.8" y="12" width="3.2" height="12" rx="1.2" fill="url(#hm-grad)" />
      <rect x="12" y="16.4" width="12" height="3.2" rx="1.2" fill="url(#hm-grad)" />
      {/* Scan line accent */}
      <rect x="9" y="17.4" width="18" height="1.2" fill="white" opacity="0.5" />
    </svg>
  );
}
