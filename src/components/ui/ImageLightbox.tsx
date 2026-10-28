import { useEffect, useState, type ReactNode } from 'react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/** Full-viewport image viewer. Esc or backdrop click closes. */
export function ImageLightbox({ src, alt = '', open, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-md bg-slate-950/70 px-3 py-1.5 font-display text-sm text-amber-100 hover:bg-slate-900"
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[92vh] max-w-[96vw] object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

interface ExpandableImageProps {
  src: string;
  alt?: string;
  /** Classes for the thumbnail `<img>`. */
  className?: string;
  /** Optional wrapper around the clickable thumbnail (e.g. portrait frame). */
  frameClassName?: string;
  children?: ReactNode;
}

/**
 * Clickable thumbnail that opens a full-image lightbox.
 * Pass `children` to fully control the thumbnail markup; otherwise renders an `<img>`.
 */
export function ExpandableImage({
  src,
  alt = '',
  className,
  frameClassName,
  children,
}: ExpandableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={frameClassName ?? 'block cursor-zoom-in'}
        title="View full image"
        aria-label={alt ? `View full image of ${alt}` : 'View full image'}
      >
        {children ?? <img src={src} alt={alt} className={className} />}
      </button>
      <ImageLightbox src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
