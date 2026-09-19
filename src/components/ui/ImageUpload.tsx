import { useRef, useState } from 'react';
import { Button } from './Button';

interface ImageUploadProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  label?: string;
  frame?: 'default' | 'portrait';
}

export function ImageUpload({
  currentUrl,
  onUpload,
  label = 'Upload Image',
  frame = 'default',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const size = frame === 'portrait' ? 'h-32 w-28' : 'h-24 w-24';

  return (
    <div className="flex flex-col gap-2">
      {currentUrl ? (
        <div className={`${size} rotate-[-1.5deg] bg-parchment p-1.5 shadow-md`}>
          <img
            src={currentUrl}
            alt="Upload preview"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex ${size} rotate-[-1.5deg] items-center justify-center border border-dashed border-current/30 bg-black/5 text-xs text-current/40`}
        >
          Portrait
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-fit"
      >
        {uploading ? 'Uploading...' : label}
      </Button>
    </div>
  );
}
