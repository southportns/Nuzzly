<template>
  <div class="cropper-overlay" @click.self="$emit('cancel')">
    <div class="cropper-modal">
      <div class="cropper-header">
        <h3 class="cropper-title">调整头像</h3>
        <button class="close-btn" @click="$emit('cancel')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="cropper-area" ref="containerRef">
        <canvas ref="canvasRef" class="cropper-canvas"></canvas>
        <div class="crop-circle"></div>
      </div>

      <div class="zoom-controls">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        <input type="range" v-model.number="zoom" min="1" max="3" step="0.1" class="zoom-slider">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </div>

      <div class="cropper-actions">
        <button class="cancel-btn" @click="$emit('cancel')">取消</button>
        <button class="confirm-btn" :disabled="processing" @click="handleConfirm">
          <span v-if="processing">处理中...</span>
          <span v-else>确认裁剪</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  imageSrc: { type: String, required: true }
})

const emit = defineEmits(['confirm', 'cancel'])

const canvasRef = ref(null)
const containerRef = ref(null)
const zoom = ref(1)
const processing = ref(false)

let image = null
let offsetX = 0
let offsetY = 0
let isDragging = false
let lastX = 0
let lastY = 0

function getImageDimensions(size) {
  const imgAspect = image.width / image.height
  const circleRadius = size / 2
  const dim = circleRadius * 2 * zoom.value
  const drawW = imgAspect > 1 ? dim * imgAspect : dim
  const drawH = imgAspect > 1 ? dim : dim / imgAspect
  const x = (size - drawW) / 2 + offsetX
  const y = (size - drawH) / 2 + offsetY
  return { drawW, drawH, x, y }
}

onMounted(() => {
  image = new Image()
  image.crossOrigin = 'anonymous'
  image.onload = drawCanvas
  image.src = props.imageSrc
  setupDrag()
})

watch(zoom, drawCanvas)

function drawCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container || !image) return

  const size = container.clientWidth
  canvas.width = size * 2
  canvas.height = size * 2
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)
  ctx.clearRect(0, 0, size, size)

  const { drawW, drawH, x, y } = getImageDimensions(size)
  const circleRadius = size / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(circleRadius, circleRadius, circleRadius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(image, x, y, drawW, drawH)
  ctx.restore()
}

function setupDrag() {
  const area = containerRef.value
  if (!area) return

  const onStart = (x, y) => {
    isDragging = true
    lastX = x
    lastY = y
  }

  const onMove = (x, y) => {
    if (!isDragging) return
    offsetX += x - lastX
    offsetY += y - lastY
    lastX = x
    lastY = y
    drawCanvas()
  }

  const onEnd = () => { isDragging = false }

  area.addEventListener('mousedown', e => onStart(e.clientX, e.clientY))
  area.addEventListener('mousemove', e => onMove(e.clientX, e.clientY))
  area.addEventListener('mouseup', onEnd)
  area.addEventListener('mouseleave', onEnd)
  area.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  area.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  area.addEventListener('touchend', onEnd)
}

async function handleConfirm() {
  processing.value = true
  try {
    const size = canvasRef.value.width / 2
    const outputSize = 512
    const { drawW, drawH, x, y } = getImageDimensions(size)

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputSize
    outputCanvas.height = outputSize
    const ctx = outputCanvas.getContext('2d')
    const scale = outputSize / size

    ctx.save()
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(image, x * scale, y * scale, drawW * scale, drawH * scale)
    ctx.restore()

    const blob = await new Promise(resolve => outputCanvas.toBlob(resolve, 'image/jpeg', 0.92))
    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
    emit('confirm', file)
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.cropper-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.cropper-modal{width:calc(100% - 40px);max-width:340px;background:var(--card);border-radius:var(--radius-2xl);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.cropper-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.cropper-title{font-family:var(--font-display);font-size:17px;font-weight:600;color:var(--fg)}
.close-btn{width:32px;height:32px;border-radius:50%;background:none;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);transition:background .15s}
.close-btn:active{background:var(--bg)}
.close-btn svg{width:18px;height:18px}
.cropper-area{position:relative;width:100%;aspect-ratio:1;border-radius:var(--radius-xl);overflow:hidden;background:var(--bg);margin-bottom:16px;touch-action:none}
.cropper-canvas{width:100%;height:100%}
.crop-circle{position:absolute;inset:0;border:2px solid rgba(255,255,255,.8);border-radius:50%;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,.4)}
.zoom-controls{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:0 4px}
.zoom-controls svg{width:20px;height:20px;color:var(--muted);flex-shrink:0}
.zoom-slider{flex:1;height:4px;-webkit-appearance:none;appearance:none;background:var(--border);border-radius:2px;outline:none}
.zoom-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--brown);cursor:pointer;box-shadow:0 2px 8px rgba(139,94,70,.3)}
.cropper-actions{display:flex;gap:12px}
.cancel-btn{flex:1;height:44px;border-radius:var(--radius-btn);background:none;border:1px solid var(--border);font-size:15px;font-weight:500;color:var(--fg);cursor:pointer;font-family:var(--font-body);transition:all .15s}
.cancel-btn:active{background:var(--bg);transform:scale(.97)}
.confirm-btn{flex:1;height:44px;border-radius:var(--radius-btn);background:var(--brown);border:none;font-size:15px;font-weight:600;color:#fff;cursor:pointer;font-family:var(--font-body);transition:all .15s;box-shadow:var(--shadow-btn)}
.confirm-btn:active{transform:scale(.97)}
.confirm-btn:disabled{opacity:.5;cursor:default;transform:none}
</style>
