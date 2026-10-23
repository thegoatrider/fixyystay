/**
 * Client-side image compression utility.
 * Resizes large photos to a max width (default 1600px), converts them to WebP,
 * and strips EXIF metadata before network upload.
 */
export async function compressImageClient(
  file: File,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = 'image/webp',
  }: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    mimeType?: string
  } = {}
): Promise<File> {
  // If the file is not an image or is SVG, return as is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(file)
    reader.onload = (event) => {
      const img = document.createElement('img')
      img.onerror = () => resolve(file)
      img.onload = () => {
        let { width, height } = img

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
          resolve(file)
          return
        }

        // Draw image onto canvas (automatically strips EXIF metadata)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            // Derive new filename matching selected mimeType
            const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('png') ? 'png' : 'webp'
            const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            const newFileName = `${originalName}.${ext}`

            const compressedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now(),
            })

            // Only return compressed file if it actually reduced the size
            if (compressedFile.size < file.size) {
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          mimeType,
          quality
        )
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
