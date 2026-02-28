// Default 26th MEU logo component
// This is used as the hardcoded default when no custom logo is uploaded.
// The actual unit insignia should be uploaded via Settings > Logo Upload.

export default function MeuLogo({ className = '', size = 32 }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield background */}
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c41e3a" />
          <stop offset="100%" stopColor="#8b0000" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#daa520" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#borderGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="44" fill="#0a1628" />

      {/* Shield shape */}
      <path
        d="M50 15 L75 25 L75 55 Q75 75 50 88 Q25 75 25 55 L25 25 Z"
        fill="url(#shieldGrad)"
        stroke="url(#borderGrad)"
        strokeWidth="2"
      />

      {/* Eagle/Globe/Anchor simplified */}
      <circle cx="50" cy="50" r="12" fill="none" stroke="#daa520" strokeWidth="1.5" />
      <line x1="50" y1="38" x2="50" y2="66" stroke="#daa520" strokeWidth="1.5" />
      <line x1="38" y1="50" x2="62" y2="50" stroke="#daa520" strokeWidth="1.5" />

      {/* 26 text */}
      <text x="50" y="78" textAnchor="middle" fill="#daa520" fontSize="10" fontFamily="serif" fontWeight="bold">
        26
      </text>

      {/* MEU text on top arc */}
      <text x="50" y="12" textAnchor="middle" fill="#daa520" fontSize="6" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">
        MEU
      </text>
    </svg>
  );
}
