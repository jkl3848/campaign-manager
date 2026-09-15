import { useState } from 'react';
import type { DomainCard } from '../../types';
import domains from '../../config/daggerheart/domains.json';
import { cardImageUrl, cardImageFallback } from '../../lib/cardAssets';

interface DomainCardHandProps {
  cards: DomainCard[];
  onSelect?: (card: DomainCard) => void;
}

export function DomainCardHand({ cards, onSelect }: DomainCardHandProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cards.length === 0) {
    return <p className="text-sm text-slate-500">No domain cards yet.</p>;
  }

  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory">
        {cards.map((card, i) => (
          <DomainCardTile
            key={card.id}
            card={card}
            index={i}
            expanded={expandedId === card.id}
            onClick={() => {
              setExpandedId(expandedId === card.id ? null : card.id);
              onSelect?.(card);
            }}
          />
        ))}
      </div>
      {expandedId && (
        <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-900/80 p-3 text-sm">
          {(() => {
            const card = cards.find((c) => c.id === expandedId);
            if (!card) return null;
            return (
              <>
                <p className="font-medium text-amber-200">{card.name}</p>
                <p className="mt-1 text-slate-400">{card.description}</p>
                {card.recallCost != null && (
                  <p className="mt-1 text-xs text-slate-500">Recall cost: {card.recallCost} Stress</p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function DomainCardTile({
  card,
  index,
  expanded,
  onClick,
}: {
  card: DomainCard;
  index: number;
  expanded: boolean;
  onClick: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(cardImageUrl('domain-cards', card.id));
  const [imgFailed, setImgFailed] = useState(false);
  const domain = domains.find((d) => d.id === card.domainId);
  const rotation = (index % 5 - 2) * 2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`domain-card-tile group shrink-0 snap-start ${expanded ? 'z-10 scale-105' : ''}`}
      style={{ transform: `rotate(${rotation}deg)`, marginTop: Math.abs(rotation) }}
    >
      <div className="relative h-44 w-32 overflow-hidden rounded-lg border-2 border-slate-600/80 bg-slate-900 shadow-lg transition-all duration-200 group-hover:-translate-y-2 group-hover:border-amber-500/60 group-hover:shadow-amber-900/30 group-hover:shadow-xl">
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={() => {
              if (imgSrc.endsWith('.webp')) setImgSrc(cardImageFallback('domain-cards', card.id));
              else setImgFailed(true);
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-2">
            <span className="text-xs uppercase tracking-wider text-amber-600/60">{domain?.name ?? card.domainId}</span>
            <span className="mt-2 text-center font-serif text-sm font-bold text-amber-100/80">{card.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-slate-900/90 text-xs font-bold text-amber-400">
          {card.level}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="truncate font-serif text-xs font-bold text-amber-50">{card.name}</p>
          <p className="text-[10px] uppercase text-slate-400">{card.type ?? 'ability'}</p>
        </div>
      </div>
    </button>
  );
}
