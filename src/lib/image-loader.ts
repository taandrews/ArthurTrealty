/**
 * next/image loader for the static export. Unsplash photos are requested at the width the
 * browser actually needs (with WebP/AVIF), so phones don't download 1920px heroes.
 * Other images are served as-is.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!src.startsWith('https://images.unsplash.com/')) return src;
  const url = new URL(src);
  url.searchParams.set('w', String(Math.min(width, 2400)));
  url.searchParams.set('q', String(quality ?? Number(url.searchParams.get('q') ?? 75)));
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'crop');
  return url.toString();
}
