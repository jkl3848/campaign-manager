import { useState } from 'react';
import type { DomainCard } from '../../types';
import domains from '../../config/daggerheart/domains.json';
import { cardImageCandidates } from '../../lib/cardAssets';
import { FormattedText } from '../ui/FormattedText';

interface DomainCardHandProps {
  cards: DomainCard[];
  onSelect?: (card: DomainCard) => void;
  onRemove?: (cardId: string) => void;
}

export function DomainCardHand({ cards, onSelect, onRemove }: DomainCardHandProps) {
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
            onRemove={onRemove ? () => onRemove(card.id) : undefined}
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
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-semibold text-ink">{card.name}</p>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(card.id);
                        setExpandedId(null);
                      }}
                      className="shrink-0 font-sans text-xs text-ink-faint hover:text-oxblood"
                    >
                      Remove from hand
                    </button>
                  )}
                </div>
                <FormattedText
                  source={card.description}
                  className="mt-1 font-serif text-sm text-ink-muted"
                />
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
  onRemove,
}: {
  card: DomainCard;
  index: number;
  expanded: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const candidates = cardImageCandidates('domain-cards', card.domainId, { preferPng: true });
  const [imgIndex, setImgIndex] = useState(0);
  const imgFailed = imgIndex >= candidates.length;
  const imgSrc = candidates[imgIndex];
  const domain = domains.find((d) => d.id === card.domainId);
  const rotation = (index % 5 - 2) * 2.4;

  return (
    <div
      className={`domain-card-tile group relative shrink-0 snap-start ${expanded ? 'z-10 scale-105' : ''}`}
      style={{ transform: `rotate(${rotation}deg)`, marginTop: Math.abs(rotation) }}
    >
      <button type="button" onClick={onClick} className="block">
        <div className="relative flex h-44 w-[7.25rem] flex-col overflow-hidden rounded-[5px] border-[3px] border-ink bg-parchment shadow-[0_0_0_1px_#c9a45c,0_8px_16px_rgba(0,0,0,0.28)] transition-transform duration-200 group-hover:-translate-y-2">
          <div className="relative flex shrink-0 items-center justify-between gap-1 border-b border-ink/15 px-1.5 py-1">
            <span className="truncate font-display text-[9px] uppercase tracking-[0.14em] text-oxblood">
              {domain?.name ?? card.domainId}
            </span>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-ink/40 bg-ink/85 font-display text-[10px] font-semibold text-parchment">
              {card.level}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/[0.03]">
            {!imgFailed ? (
              <img
                src={imgSrc}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgIndex((i) => i + 1)}
              />
            ) : (
              <span className="font-display text-[10px] uppercase tracking-wider text-ink-faint/50">
                Art
              </span>
            )}
          </div>

          <div className="shrink-0 border-t border-ink/15 bg-ink/90 px-1.5 py-1.5 text-left">
            <p className="truncate font-display text-[11px] font-semibold leading-tight text-parchment">
              {card.name}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-parchment/70">
              {card.type ?? 'ability'}
            </p>
          </div>
        </div>
      </button>
      {onRemove && (
        <button
          type="button"
          title="Remove from hand"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-ink/30 bg-parchment text-[10px] text-ink-muted opacity-0 shadow-sm transition-opacity hover:border-oxblood hover:text-oxblood group-hover:opacity-100 focus:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
