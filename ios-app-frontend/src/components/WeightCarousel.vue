<template>
  <div class="weight-carousel" ref="containerRef">
    <!-- Threads 背景动画 -->
    <Threads
      :color="'rgb(120, 50, 10)'"
      :amplitude="3"
      :distance="0.5"
      :enable-mouse-interaction="false"
      class="weight-threads"
    />

    <div
      class="carousel-track"
      :style="trackStyle"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id ?? index"
        class="carousel-item"
      >
        <div class="item-left">
          <div class="item-label-row">今日体重</div>
          <div class="item-weight">{{ item.weight ?? '--' }}<span class="item-unit">kg</span></div>
          <div class="item-name">{{ item.name }}</div>
        </div>
        <div class="item-right">
          <div class="item-icon" :style="{ background: item.color || 'rgba(139,94,70,.12)' }">
            <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="item-avatar" />
            <span v-else class="item-emoji">{{ item.emoji || '🐾' }}</span>
          </div>
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
    <div class="carousel-action" @click="$emit('record')">记录</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Threads from './Threads.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  autoplay: { type: Boolean, default: true },
  autoplayDelay: { type: Number, default: 3500 }
})

defineEmits(['record'])

const activeIndex = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragCurrentX = ref(0)

const trackStyle = computed(() => ({
  transform: `translateX(calc(-${activeIndex.value * 100}% + ${isDragging.value ? dragCurrentX.value - dragStartX.value : 0}px))`,
  transition: isDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
}))

function onTouchStart(e) {
  if (props.items.length <= 1) return
  isDragging.value = true
  dragStartX.value = e.touches[0].clientX
  dragCurrentX.value = e.touches[0].clientX
  stopAutoplay()
}

function onTouchMove(e) {
  if (!isDragging.value) return
  dragCurrentX.value = e.touches[0].clientX
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  const deltaX = dragCurrentX.value - dragStartX.value
  const threshold = 40
  if (deltaX < -threshold && activeIndex.value < props.items.length - 1) {
    activeIndex.value++
  } else if (deltaX > threshold && activeIndex.value > 0) {
    activeIndex.value--
  }
  startAutoplay()
}

function goTo(index) {
  activeIndex.value = Math.max(0, Math.min(index, props.items.length - 1))
  startAutoplay()
}

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
</script>

<style scoped>
.weight-carousel {
  position: relative;
  overflow: hidden;
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: 0px 4px 16px 5px #b6b4b4;
  border: 1px solid var(--border);
  padding: 16px 16px 13px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  top: auto;
}

.weight-threads {
  opacity: 0.12;
  pointer-events: none;
}

.carousel-track {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  will-change: transform;
}

.carousel-item {
  flex: 0 0 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.item-left {
  flex: 0 0 48%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 3px;
}

.item-label-row {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.item-weight {
  font-family: var(--font-num);
  font-size: clamp(28px, 8vw, 42px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--fg);
}

.item-unit {
  font-size: 20px;
  font-weight: 500;
  color: var(--muted);
  margin-left: 2px;
}

.item-name {
  font-size: 14px;
  color: var(--fg);
  font-weight: 500;
}

.item-right {
  width: 48%;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.item-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.item-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}

.item-emoji {
  font-size: 36px;
  line-height: 1;
}

/* 指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 1;
}

.indicator {
  height: 6px;
  width: 6px;
  border: none;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.15s;
}

.indicator.active {
  background-color: var(--fg);
  transform: scale(1.2);
}

.indicator.inactive {
  background-color: rgba(0, 0, 0, 0.18);
}

/* 记录按钮 */
.carousel-action {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 13px;
  color: var(--brown);
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 10px;
  transition: background-color 0.2s;
  z-index: 1;
}

.carousel-action:active {
  background-color: rgba(139, 94, 70, 0.08);
}
</style>
