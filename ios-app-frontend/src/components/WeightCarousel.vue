<template>
  <div class="weight-carousel" ref="containerRef">
    <div class="carousel-track" ref="trackRef"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      :style="trackStyle"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id ?? index"
        class="carousel-item"
        :class="{ active: activeIndex === index }"
        :style="itemStyle(index)"
      >
        <div class="item-icon" :style="{ background: item.color || 'rgba(139,94,70,.1)' }">
          <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="item-avatar" />
          <span v-else class="item-emoji">{{ item.emoji || '🐾' }}</span>
        </div>
        <div class="item-body">
          <div class="item-weight">{{ item.weight ?? '--' }}<span class="item-unit">kg</span></div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-label">今日体重</div>
        </div>
      </div>
    </div>

    <!-- 指示器 -->
    <div class="carousel-indicators" v-if="items.length > 1">
      <button
        v-for="(_, index) in items"
        :key="index"
        class="indicator"
        :class="activeIndex === index ? 'active' : 'inactive'"
        @click="goTo(index)"
        :aria-label="`切换到 ${index + 1}`"
      />
    </div>

    <!-- 记录按钮 -->
    <div class="carousel-action" @click="$emit('record')">
      记录
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  baseWidth: { type: Number, default: 155 },
  autoplay: { type: Boolean, default: true },
  autoplayDelay: { type: Number, default: 3000 }
})

defineEmits(['record'])

const GAP = 8
const containerRef = ref(null)
const trackRef = ref(null)
const activeIndex = ref(0)
const touchStart = ref({ x: 0, y: 0 })
const touchDelta = ref(0)
const isDragging = ref(false)

const trackStyle = computed(() => {
  const offset = -activeIndex.value * (props.baseWidth + GAP)
  const translate = offset + touchDelta.value
  return {
    transform: `translateX(${translate}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

function itemStyle(index) {
  const dist = Math.abs(index - activeIndex.value)
  const scale = dist === 0 ? 1 : dist === 1 ? 0.92 : 0.82
  const opacity = dist === 0 ? 1 : dist === 1 ? 0.6 : 0.3
  return {
    transform: `scale(${scale})`,
    opacity,
    width: `${props.baseWidth}px`
  }
}

function onTouchStart(e) {
  touchStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  touchDelta.value = 0
  isDragging.value = true
}

function onTouchMove(e) {
  if (!isDragging.value) return
  const dx = e.touches[0].clientX - touchStart.value.x
  const dy = e.touches[0].clientY - touchStart.value.y
  if (Math.abs(dy) > Math.abs(dx)) return
  touchDelta.value = dx
}

function onTouchEnd() {
  isDragging.value = false
  const threshold = props.baseWidth * 0.2
  if (touchDelta.value < -threshold && activeIndex.value < props.items.length - 1) {
    activeIndex.value++
  } else if (touchDelta.value > threshold && activeIndex.value > 0) {
    activeIndex.value--
  }
  touchDelta.value = 0
}

function goTo(index) {
  activeIndex.value = index
}

// 自动轮播
let autoplayTimer = null
function startAutoplay() {
  stopAutoplay()
  if (!props.autoplay || props.items.length <= 1) return
  autoplayTimer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % props.items.length
  }, props.autoplayDelay)
}
function stopAutoplay() {
  if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null }
}

watch(() => props.items.length, () => {
  activeIndex.value = 0
  startAutoplay()
}, { immediate: true })

defineExpose({ startAutoplay, stopAutoplay })
</script>

<style scoped>
.weight-carousel {
  position: relative;
  overflow: hidden;
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  padding: 16px;
  width: clamp(130px,40vw,155px);
  height: clamp(130px,40vw,155px);
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.weight-carousel:active {
  cursor: grabbing;
}

.carousel-track {
  display: flex;
  gap: 8px;
  height: calc(100% - 28px);
}

.carousel-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.item-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.item-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.item-emoji {
  font-size: 22px;
  line-height: 1;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-weight {
  font-family: var(--font-num);
  font-size: clamp(24px,7vw,36px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-fg);
}

.item-unit {
  font-size: 16px;
  font-weight: 400;
  color: var(--color-muted);
  margin-left: 2px;
}

.item-name {
  font-size: 14px;
  color: var(--color-muted);
  letter-spacing: 0.01em;
  margin-top: 2px;
}

.item-label {
  font-size: 14px;
  color: var(--color-muted);
  letter-spacing: 0.01em;
}

/* 指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.indicator {
  height: 6px;
  width: 6px;
  border: none;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.indicator.active {
  background-color: var(--color-fg);
  transform: scale(1.2);
}

.indicator.inactive {
  background-color: rgba(0, 0, 0, 0.15);
}

/* 记录按钮 */
.carousel-action {
  position: absolute;
  bottom: 10px;
  right: 16px;
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}

.carousel-action svg {
  width: 12px;
  height: 12px;
}
</style>
