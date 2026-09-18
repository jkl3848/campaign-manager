import { useState, type ReactNode } from 'react';
import { cardImageCandidates } from '../../lib/cardAssets';

interface GameCardProps {
  id: string;
  folder: string;
  title: string;
  selected?: boolean;
  onClick?: () => void;
  onInfoClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function GameCard({
  id,
  folder,
  title,
  selected = false,
  onClick,
  onInfoClick,
  children,
  className = '',
}: GameCardProps) {
  const candidates = cardImageCandidates(folder, id);
  const [imgIndex, setImgIndex] = useState(0);
  const imgFailed = imgIndex >= candidates.length;
  const imgSrc = candidates[imgIndex];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      className={`game-card group relative cursor-pointer ${selected ? 'game-card-selected' : ''} ${className}`}
      style={{
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div className="game-card-inner overflow-hidden rounded-[6px] transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative aspect-[5/7] overflow-hidden bg-parchment-deep">
          {!imgFailed ? (
            <img
              src={imgSrc}
              alt={title}
              className="h-full w-full object-cover"
              onError={() => setImgIndex((i) => i + 1)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-parchment px-3 text-center">
              <span className="font-display text-5xl text-oxblood/40">{title.charAt(0)}</span>
              <span className="mt-2 font-display text-lg font-semibold text-ink">{title}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <h4 className="font-display text-lg font-semibold leading-tight text-parchment drop-shadow">
              {title}
            </h4>
          </div>
          {onInfoClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick();
              }}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-parchment/50 bg-ink/70 text-[10px] text-parchment opacity-0 transition-opacity hover:bg-oxblood group-hover:opacity-100"
              aria-label={`Details for ${title}`}
            >
              i
            </button>
          )}
        </div>
        {children && (
          <div className="border-t border-ink/15 bg-parchment px-3 py-2.5 font-serif text-xs leading-relaxed text-ink">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
