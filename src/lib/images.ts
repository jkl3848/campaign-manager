const MAX_SIZE_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1200;

export async function compressImage(file: File): Promise<Blob> {
  if (file.size <= MAX_SIZE_BYTES && file.type !== 'image/png') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

  while (blob.size > MAX_SIZE_BYTES && quality > 0.3) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  if (blob.size > MAX_SIZE_BYTES) {
    const scale = Math.sqrt(MAX_SIZE_BYTES / blob.size) * 0.9;
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    const resizedBitmap = await createImageBitmap(blob);
    scaledCtx.drawImage(resizedBitmap, 0, 0, scaledWidth, scaledHeight);
    resizedBitmap.close();
    blob = await canvasToBlob(scaledCanvas, 'image/jpeg', 0.7);
  }

  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))),
      type,
      quality,
    );
  });
}
