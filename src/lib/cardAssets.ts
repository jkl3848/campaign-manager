const IMAGE_EXTS = ['.jpg', '.jpeg', '.webp', '.png'] as const;

/**
 * Bump when artwork bytes change but the filename stays the same.
 * Hosting cached the old Git LFS pointer responses under these URLs.
 */
const ASSET_REV = '2';

/** Card artwork lives in public/{folder}/{id}.{ext}. */
export function cardImageCandidates(folder: string, id: string): string[] {
  const slug = (id ?? '').toLowerCase();
  if (!slug) return [];
  return IMAGE_EXTS.map((ext) => `/${folder}/${slug}${ext}?v=${ASSET_REV}`);
}

export function cardImageUrl(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[0];
}

export function cardImageFallback(folder: string, id: string): string {
  return cardImageCandidates(folder, id)[1];
}
