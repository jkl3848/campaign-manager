interface D12DieProps {
  value: number | string;
  color: 'white' | 'black';
  rolling?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-14 h-[4rem]',
  md: 'w-20 h-[5.5rem]',
  lg: 'w-24 h-[7rem]',
};

export function D12Die({ value, color, rolling = false, size = 'md' }: D12DieProps) {
  const isWhite = color === 'white';
  const bodyFill = isWhite ? '#e2e8f0' : '#1e293b';
  const facetFill = isWhite ? '#f8fafc' : '#334155';
  const stroke = isWhite ? '#94a3b8' : '#475569';
  const textFill = isWhite ? '#0f172a' : '#f1f5f9';

  return (
    <svg
      viewBox="0 0 80 92"
      className={`${sizes[size]} drop-shadow-lg ${rolling ? 'animate-bounce' : ''}`}
      aria-label={`d12 showing ${value}`}
    >
      {/* Base pentagon — stylized d12 face */}
      <polygon
        points="40,6 72,28 62,82 18,82 8,28"
        fill={bodyFill}
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Top-left facet */}
      <polygon points="40,6 8,28 40,48" fill={facetFill} stroke={stroke} strokeWidth="1" />
      {/* Top-right facet */}
      <polygon points="40,6 72,28 40,48" fill={isWhite ? '#cbd5e1' : '#475569'} stroke={stroke} strokeWidth="1" />
      {/* Bottom-left facet */}
      <polygon points="8,28 18,82 40,68" fill={isWhite ? '#cbd5e1' : '#475569'} stroke={stroke} strokeWidth="1" />
      {/* Bottom-right facet */}
      <polygon points="72,28 62,82 40,68" fill={facetFill} stroke={stroke} strokeWidth="1" />
      {/* Center face */}
      <polygon
        points="40,48 72,28 62,82 18,82 8,28"
        fill={bodyFill}
        fillOpacity="0.85"
        stroke={stroke}
        strokeWidth="1"
      />
      <text
        x="40"
        y="58"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textFill}
        fontSize="22"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {value}
      </text>
    </svg>
  );
}
