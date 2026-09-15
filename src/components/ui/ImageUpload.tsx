import { useRef, useState } from 'react';
import { Button } from './Button';

interface ImageUploadProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  label?: string;
}

export function ImageUpload({ currentUrl, onUpload, label = 'Upload Image' }: ImageUploadProps) {
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

  return (
    <div className="flex flex-col gap-2">
      {currentUrl && (
        <img
          src={currentUrl}
          alt="Upload preview"
          className="w-24 h-24 object-cover rounded-lg border border-slate-600"
        />
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
      >
        {uploading ? 'Uploading...' : label}
      </Button>
    </div>
  );
}
