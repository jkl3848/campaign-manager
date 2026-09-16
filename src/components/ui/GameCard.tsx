import { useState, type ReactNode } from 'react';
import { cardImageUrl, cardImageFallback } from '../../lib/cardAssets';

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
  const [imgSrc, setImgSrc] = useState(cardImageUrl(folder, id));
  const [imgFailed, setImgFailed] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
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
      <div className="game-card-inner overflow-hidden rounded-xl border-2 border-slate-600/80 bg-slate-900 shadow-lg transition-all duration-200 group-hover:border-amber-500/60 group-hover:shadow-amber-900/30 group-hover:shadow-xl">
        <div className="relative aspect-[3/4] overflow-hidden">
          {!imgFailed ? (
            <img
              src={imgSrc}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => {
                if (imgSrc.endsWith('.webp')) {
                  setImgSrc(cardImageFallback(folder, id));
                } else {
                  setImgFailed(true);
                }
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="font-serif text-4xl text-amber-600/40">{title.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="font-serif text-lg font-bold text-amber-100 drop-shadow-lg">{title}</h4>
          </div>
          {onInfoClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick();
              }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-xs text-amber-300 opacity-0 transition-opacity hover:bg-amber-900/80 group-hover:opacity-100"
              aria-label={`Details for ${title}`}
            >
              i
            </button>
          )}
        </div>
        {children && (
          <div className="border-t border-slate-700/60 bg-slate-900/90 p-3 text-xs text-slate-300">
            {children}
          </div>
        )}
      </div>
      {selected && (
        <div className="pointer-events-none absolute -inset-1 rounded-xl border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]" />
      )}
    </div>
  );
}
