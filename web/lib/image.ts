// Image preprocessing utilities
// All image uploads are redrawn on canvas to strip EXIF metadata.

export interface PreprocessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  type?: "image/jpeg" | "image/png" | "image/webp"
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("图片加载失败"))
    }
    img.src = url
  })
}

function calculateSize(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight }
  }
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  }
}

/**
 * Redraw an image on a canvas to strip EXIF/metadata and resize it.
 * Returns a File named avatar.jpg suitable for upload.
 */
export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {}
): Promise<File> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.92,
    type = "image/jpeg",
  } = options

  const img = await loadImage(file)
  const { width, height } = calculateSize(img.width, img.height, maxWidth, maxHeight)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("无法创建 canvas 上下文")

  // White background for JPEG
  if (type === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片处理失败"))
          return
        }
        resolve(new File([blob], "avatar.jpg", { type }))
      },
      type,
      quality
    )
  })
}
