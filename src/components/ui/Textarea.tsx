import type { Ref, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, className = '', id, ref, ...props }: TextareaProps) {
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
        ref={ref}
        id={textareaId}
        className={`ruled-field min-h-[80px] rounded-none border border-current/50 bg-transparent px-2 py-1 text-inherit placeholder:text-current/65 focus:border-brass focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
