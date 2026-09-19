import { useState } from 'react';
import type { DomainCard } from '../../types';
import domains from '../../config/daggerheart/domains.json';
import { cardImageCandidates } from '../../lib/cardAssets';

interface DomainCardHandProps {
  cards: DomainCard[];
  onSelect?: (card: DomainCard) => void;
}

export function DomainCardHand({ cards, onSelect }: DomainCardHandProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cards.length === 0) {
    return <p className="font-serif text-sm text-ink-faint">No domain cards yet.</p>;
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
        <div className="mt-2 border border-ink/15 bg-black/[0.03] p-3 font-serif text-sm">
          {(() => {
            const card = cards.find((c) => c.id === expandedId);
            if (!card) return null;
            return (
              <>
                <p className="font-display text-lg font-semibold text-ink">{card.name}</p>
                <p className="mt-1 text-ink-muted">{card.description}</p>
                {card.recallCost != null && (
                  <p className="mt-1 text-xs text-ink-faint">Recall cost: {card.recallCost} Stress</p>
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
  const candidates = cardImageCandidates('domain-cards', card.id);
  const [imgIndex, setImgIndex] = useState(0);
  const imgFailed = imgIndex >= candidates.length;
  const imgSrc = candidates[imgIndex];
  const domain = domains.find((d) => d.id === card.domainId);
  const rotation = (index % 5 - 2) * 2.4;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`domain-card-tile group shrink-0 snap-start ${expanded ? 'z-10 scale-105' : ''}`}
      style={{ transform: `rotate(${rotation}deg)`, marginTop: Math.abs(rotation) }}
    >
      <div className="relative h-44 w-[7.25rem] overflow-hidden rounded-[5px] border-[3px] border-ink bg-parchment shadow-[0_0_0_1px_#c9a45c,0_8px_16px_rgba(0,0,0,0.28)] transition-transform duration-200 group-hover:-translate-y-2">
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={() => setImgIndex((i) => i + 1)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-parchment p-2">
            <span className="font-display text-[10px] uppercase tracking-[0.18em] text-oxblood/70">{domain?.name ?? card.domainId}</span>
            <span className="mt-2 text-center font-display text-sm font-semibold text-ink">{card.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center border border-parchment/50 bg-ink/80 font-display text-xs font-semibold text-parchment">
          {card.level}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
          <p className="truncate font-display text-xs font-semibold text-parchment">{card.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-parchment/70">{card.type ?? 'ability'}</p>
        </div>
      </div>
    </button>
  );
}
