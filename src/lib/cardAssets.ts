const IMAGE_EXTS = ['.jpg', '.jpeg', '.webp', '.png'] as const;
const PNG_FIRST_EXTS = ['.png', '.webp', '.jpg', '.jpeg'] as const;

/** Card artwork lives in public/{folder}/{id}.{ext}. */
export function cardImageCandidates(
  folder: string,
  id: string,
  options?: { preferPng?: boolean },
): string[] {
  const slug = id.toLowerCase();
  const exts = options?.preferPng ? PNG_FIRST_EXTS : IMAGE_EXTS;
  return exts.map((ext) => `/${folder}/${slug}${ext}`);
}

export function cardImageUrl(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[0];
}

export function cardImageFallback(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[1];
}
