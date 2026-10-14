/**
 * Utility to generate optimized image URLs for cards, thumbnails, and detail views.
 * Supports Supabase Storage image transformations and CDN resizing parameters.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  {
    width = 600,
    quality = 75,
    format = 'webp'
  }: {
    width?: number
    quality?: number
    format?: 'webp' | 'avif' | 'origin'
  } = {}
): string {
  if (!url) return ''

  // 1. Supabase Storage: Use Supabase image transformation if available
  // e.g. /storage/v1/render/image/public/bucket/file.jpg or /storage/v1/object/public/bucket/file.jpg
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    // If Supabase Transformations are enabled on the project, the render endpoint provides on-the-fly resizing:
    const renderUrl = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )
    return `${renderUrl}?width=${width}&quality=${quality}&format=${format}`
  }

  // 2. Unsplash Images: append imgix query parameters
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0]
    return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`
  }

  return url
}
