/** Card artwork lives in public/{folder}/{id}.webp (or .png fallback). */
export function cardImageUrl(folder: string, id: string): string {
  return `/${folder}/${id}.webp`;
}

export function cardImageFallback(folder: string, id: string): string {
  return `/${folder}/${id}.png`;
}
