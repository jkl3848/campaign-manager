const IMAGE_EXTS = ['.jpg', '.jpeg', '.webp', '.png'] as const;

/** Card artwork lives in public/{folder}/{id}.{jpg|jpeg|webp|png}. */
export function cardImageCandidates(folder: string, id: string): string[] {
  const slug = id.toLowerCase();
  return IMAGE_EXTS.map((ext) => `/${folder}/${slug}${ext}`);
}

export function cardImageUrl(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[0];
}

export function cardImageFallback(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[1];
}
