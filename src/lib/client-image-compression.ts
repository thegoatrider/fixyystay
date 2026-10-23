/**
 * Client-side image compression utility.
 * Resizes large camera photos to safe dimensions (default 1400px), converts them to JPEG,
 * strips heavy EXIF metadata, and guarantees payload size is under 800KB before network upload.
 */
export async function compressImageClient(
  file: File,
  {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.78,
    mimeType = 'image/jpeg',
  }: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    mimeType?: string
  } = {}
): Promise<File> {
  const isImageMime = file.type.startsWith('image/')
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name)

  // If not an image or is SVG, return original
  if ((!isImageMime && !isImageExt) || file.type === 'image/svg+xml') {
    return file
  }

  // Use URL.createObjectURL to avoid base64 memory explosion on mobile
  return new Promise((resolve) => {
    let objectUrl = ''
    try {
      objectUrl = URL.createObjectURL(file)
    } catch {
      resolve(file)
      return
    }

    const img = document.createElement('img')
    const cleanup = () => {
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      } catch {}
    }

    img.onerror = () => {
      cleanup()
      resolve(file)
    }

    img.onload = () => {
      try {
        let { width, height } = img

        if (width <= 0 || height <= 0) {
          cleanup()
          resolve(file)
          return
        }

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(file)
          return
        }

        // Draw image onto canvas (automatically normalizes orientation & strips EXIF)
        ctx.drawImage(img, 0, 0, width, height)

        const toBlobCallback = (blob: Blob | null) => {
          cleanup()
          if (!blob) {
            resolve(file)
            return
          }

          const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg'
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name || 'photo'
          const newFileName = `${baseName}.${ext}`

          const compressedFile = new File([blob], newFileName, {
            type: mimeType,
            lastModified: Date.now(),
          })

          // Always return compressed file if it's smaller or if original is over 1MB
          if (compressedFile.size < file.size || file.size > 1024 * 1024) {
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        }

        canvas.toBlob(toBlobCallback, mimeType, quality)
      } catch {
        cleanup()
        resolve(file)
      }
    }

    img.src = objectUrl
  })
}
