import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = '', id, children, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="font-sans text-sm font-medium text-current/85"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`rounded-none border-0 border-b border-current/30 bg-transparent px-0.5 py-1.5 text-inherit focus:border-brass focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
