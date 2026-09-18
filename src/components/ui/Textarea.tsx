import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="font-sans text-sm font-medium text-current/85"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`ruled-field min-h-[80px] rounded-none border border-current/20 bg-transparent px-2 py-1 text-inherit placeholder:text-current/35 focus:border-brass focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
