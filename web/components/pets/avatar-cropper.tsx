"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ZoomIn, ZoomOut, Check, X } from "lucide-react"

interface AvatarCropperProps {
  imageSrc: string
  onConfirm: (file: File) => void
  onCancel: () => void
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 512
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  canvas.width = outputSize
  canvas.height = outputSize

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }))
    }, "image/jpeg", 0.92)
  })
}

export function AvatarCropper({ imageSrc, onConfirm, onCancel }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropping, setCropping] = useState(false)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setCropping(true)
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels)
      onConfirm(file)
    } finally {
      setCropping(false)
    }
  }, [imageSrc, croppedAreaPixels, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#111111]">调整头像</h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-full text-[#9A9A95] hover:bg-[#F7F6F3] hover:text-[#111111]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative mb-5 aspect-square overflow-hidden rounded-[16px] bg-[#F7F6F3]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom controls */}
        <div className="mb-5 flex items-center gap-3">
          <ZoomOut className="size-4 shrink-0 text-[#9A9A95]" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="size-4 shrink-0 text-[#9A9A95]" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-full border-[rgba(0,0,0,0.08)]"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={cropping}
            className={cn(
              "flex-1 rounded-full bg-[#FF7A59] text-white shadow-[0_4px_12px_rgba(255,122,89,0.25)] hover:bg-[#E86A4A]",
              cropping && "opacity-60"
            )}
          >
            <Check className="mr-1.5 size-4" />
            {cropping ? "处理中..." : "确认裁剪"}
          </Button>
        </div>
      </div>
    </div>
  )
}
