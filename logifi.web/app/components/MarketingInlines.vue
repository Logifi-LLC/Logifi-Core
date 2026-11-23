<template>
  <template v-for="(part, index) in inlines" :key="index">
    <strong v-if="part.type === 'strong'" class="font-bold text-gray-100">{{ part.text }}</strong>
    <code v-else-if="part.type === 'code'" class="text-sm text-gray-100">{{ part.text }}</code>
    <a
      v-else-if="part.type === 'link' && externalHref(part.href)"
      :href="externalHref(part.href) || undefined"
      target="_blank"
      rel="noopener noreferrer"
      :class="linkClass"
    >{{ part.text }}</a>
    <NuxtLink
      v-else-if="part.type === 'link' && internalHref(part.href)"
      :to="internalHref(part.href) || '/'"
      :class="linkClass"
    >{{ part.text }}</NuxtLink>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<script setup lang="ts">
import { safeLink, type Inline } from '../../shared/marketingPages'

defineProps<{
  inlines: Inline[]
}>()

const linkClass =
  'text-blue-400 underline decoration-blue-400/40 underline-offset-2 hover:decoration-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded-sm'

function internalHref(href: string): string | null {
  const link = safeLink(href)
  if (!link || link.external) return null
  return link.href
}

function externalHref(href: string): string | null {
  const link = safeLink(href)
  if (!link?.external) return null
  return link.href
}
</script>
