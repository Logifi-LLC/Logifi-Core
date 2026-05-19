<template>
  <textarea
    :id="inputId"
    ref="textareaRef"
    v-model="model"
    rows="1"
    :placeholder="placeholder"
    :class="[
      inputClass,
      'min-h-[2.75rem] resize-none overflow-hidden',
    ]"
    @input="resize"
  />
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  inputClass?: string
  inputId?: string
  placeholder?: string
}>()

const model = defineModel<string>({ default: '' })

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(model, () => nextTick(resize))

let visibilityObserver: IntersectionObserver | undefined

onMounted(() => {
  nextTick(resize)
  const el = textareaRef.value
  if (!el || typeof IntersectionObserver === 'undefined') return
  visibilityObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) nextTick(resize)
  })
  visibilityObserver.observe(el)
})

onUnmounted(() => visibilityObserver?.disconnect())

defineExpose({ resize })
</script>
