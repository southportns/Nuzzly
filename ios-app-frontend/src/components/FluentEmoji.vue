<template>
  <img
    v-if="emoji"
    :src="url"
    :alt="alt || emoji.name"
    :width="size"
    :height="size"
    class="fluent-emoji"
    loading="lazy"
  />
</template>

<script setup>
import { computed } from 'vue'
import { getFluentEmoji, getFluentEmojiByGlyph, getFluentEmojiByUnicode, getFluentEmojiUrl } from '@/lib/emoji.js'

const props = defineProps({
  name: String,
  glyph: String,
  unicode: String,
  size: { type: Number, default: 24 },
  alt: String,
  context: { type: String, default: 'ios' },
})

const emoji = computed(() => {
  if (props.name) return getFluentEmoji(props.name)
  if (props.glyph) return getFluentEmojiByGlyph(props.glyph)
  if (props.unicode) return getFluentEmojiByUnicode(props.unicode)
  return null
})

const url = computed(() => {
  if (!emoji.value) return ''
  return getFluentEmojiUrl(emoji.value.name)
})
</script>

<style scoped>
.fluent-emoji {
  display: inline-block;
  vertical-align: text-bottom;
  object-fit: contain;
}
</style>
