import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SearchableOption {
  value: string;
  label: string;
  detail?: string;
  group?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SearchableOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
}

export function SearchableSelect({
  label,
  placeholder = 'Search...',
  options,
  onSelect,
  disabled = false,
  emptyText = 'No matches',
  className = '',
}: SearchableSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.detail?.toLowerCase().includes(q) ||
        o.group?.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={listId} className="font-sans text-sm font-medium text-current/85">
          {label}
        </label>
      )}
      <input
        id={listId}
        type="text"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="rounded-none border-0 border-b border-current/30 bg-transparent px-0.5 py-1.5 text-inherit placeholder:text-current/35 focus:border-brass focus:outline-none disabled:opacity-50"
      />
      {open && !disabled && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto border border-ink/20 bg-parchment shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-xs italic text-ink-faint">{emptyText}</li>
          ) : (
            filtered.map((option) => (
              <li key={`${option.group ?? ''}:${option.value}`}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left hover:bg-oxblood/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(option.value);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <span className="text-sm text-ink">
                    {option.label}
                    {option.group && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-ink-faint">
                        {option.group}
                      </span>
                    )}
                  </span>
                  {option.detail && (
                    <span className="line-clamp-2 text-[11px] text-ink-muted">{option.detail}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
