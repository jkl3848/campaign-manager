import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="font-sans text-sm font-medium text-current/85"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-none border-0 border-b border-current/30 bg-transparent px-0.5 py-1.5 text-inherit placeholder:text-current/35 focus:border-brass focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
