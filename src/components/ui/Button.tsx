import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary:
    'bg-seal text-parchment shadow-[0_2px_0_#3d1210] hover:bg-oxblood border border-black/20',
  secondary:
    'bg-transparent text-brass border border-brass/70 hover:bg-brass/10 hover:border-brass',
  danger:
    'bg-oxblood/90 hover:bg-oxblood text-parchment border border-black/20',
  ghost:
    'bg-transparent hover:bg-black/15 text-current/70 border border-transparent',
};

const sizes = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm font-medium tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
