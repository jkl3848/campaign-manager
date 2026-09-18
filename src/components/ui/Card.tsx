import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  variant?: 'folio' | 'paper';
}

export function Card({
  title,
  children,
  className = '',
  actions,
  variant = 'folio',
}: CardProps) {
  const surface =
    variant === 'paper'
      ? 'paper-sheet rounded-sm'
      : 'folio rounded-sm';
  const titleClass =
    variant === 'paper'
      ? 'font-display text-xl font-semibold text-oxblood tracking-wide'
      : 'font-display text-xl font-semibold text-amber-100 tracking-wide';
  const divider =
    variant === 'paper'
      ? 'border-b border-oxblood/25'
      : 'border-b border-brass/20';

  return (
    <div className={`${surface} ${className}`}>
      {(title || actions) && (
        <div className={`flex items-center justify-between px-5 py-4 ${divider}`}>
          {title && <h3 className={titleClass}>{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
