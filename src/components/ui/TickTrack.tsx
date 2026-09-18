export type TickVariant = 'dot' | 'box' | 'diamond';

interface TickTrackProps {
  current: number;
  max: number;
  variant?: TickVariant;
  className?: string;
}

export function TickTrack({
  current,
  max,
  variant = 'dot',
  className = '',
}: TickTrackProps) {
  const safeMax = Math.max(0, max);
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: safeMax }).map((_, i) => (
        <span
          key={i}
          className={`tick tick-${variant} ${i < current ? 'tick-filled' : ''}`}
          aria-hidden
        />
      ))}
    </div>
  );
}
