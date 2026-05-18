<template>
  <Teleport to="body">
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 font-quicksand"
  >
    <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="emit('close')" />

    <div
      class="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border font-quicksand shadow-2xl transition-colors sm:flex-row"
      :class="
        isDarkMode
          ? 'border-gray-700 bg-gray-900 text-gray-100'
          : 'border-gray-200 bg-white text-gray-900'
      "
    >
      <button
        type="button"
        class="absolute right-4 top-4 z-10 rounded-lg p-2 transition-colors sm:hidden"
        :class="
          isDarkMode
            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        "
        aria-label="Close settings"
        @click="emit('close')"
      >
        <Icon name="ri:close-line" size="24" />
      </button>

      <aside
        class="flex w-full shrink-0 flex-col border-b sm:w-56 sm:border-b-0 sm:border-r"
        :class="isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'"
      >
        <div class="hidden p-5 pb-3 sm:block">
          <h2 class="text-lg font-bold font-quicksand">Settings</h2>
        </div>

        <div class="p-4 sm:hidden">
          <label class="sr-only" for="settings-mobile-nav">Settings section</label>
          <select
            id="settings-mobile-nav"
            :value="activeTab"
            class="w-full rounded-lg border px-3 py-2.5 text-sm font-quicksand focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="
              isDarkMode
                ? 'border-gray-600 bg-gray-800 text-gray-100'
                : 'border-gray-200 bg-white text-gray-900'
            "
            @change="onMobileNavChange"
          >
            <option v-for="item in navItems" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>
        </div>

        <nav class="hidden flex-1 flex-col gap-0.5 overflow-y-auto p-3 sm:flex">
          <button
            v-for="item in navItems"
            :key="item.id"
            type="button"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium font-quicksand transition-colors"
            :class="
              activeTab === item.id
                ? isDarkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-blue-700 shadow-sm'
                : isDarkMode
                  ? 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            "
            @click="emit('update:activeTab', item.id)"
          >
            <Icon :name="item.icon" size="18" />
            {{ item.label }}
          </button>

          <div class="mt-auto space-y-1 border-t pt-3" :class="isDarkMode ? 'border-gray-800' : 'border-gray-200'">
            <NuxtLink
              to="/developers?from=dashboard"
              class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium font-quicksand transition-colors"
              :class="
                isDarkMode
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              "
              @click="emit('close')"
            >
              <Icon name="ri:code-s-slash-line" size="18" />
              Developer docs
            </NuxtLink>
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium font-quicksand transition-colors"
              :class="
                isDarkMode
                  ? 'text-red-400 hover:bg-red-900/20'
                  : 'text-red-600 hover:bg-red-50'
              "
              @click="emit('logout')"
            >
              <Icon name="ri:logout-box-line" size="18" />
              Sign out
            </button>
          </div>
        </nav>

        <div
          class="flex gap-2 border-t p-4 sm:hidden"
          :class="isDarkMode ? 'border-gray-800' : 'border-gray-200'"
        >
          <NuxtLink
            to="/developers?from=dashboard"
            class="flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium font-quicksand"
            :class="
              isDarkMode
                ? 'border-gray-700 text-gray-300'
                : 'border-gray-200 text-gray-700'
            "
            @click="emit('close')"
          >
            Developer docs
          </NuxtLink>
          <button
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-sm font-medium font-quicksand"
            :class="isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'"
            @click="emit('logout')"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          class="hidden items-center justify-between border-b px-6 py-4 sm:flex"
          :class="isDarkMode ? 'border-gray-800' : 'border-gray-200'"
        >
          <h3 class="text-xl font-semibold font-quicksand">{{ title }}</h3>
          <button
            type="button"
            class="rounded-lg p-2 transition-colors"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            "
            aria-label="Close settings"
            @click="emit('close')"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <slot />
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SETTINGS_NAV_ITEMS, settingsTabTitle, type SettingsTabId } from './settingsNav'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  open: boolean
  activeTab: SettingsTabId
  isDarkMode: boolean
}>()

const emit = defineEmits<{
  close: []
  logout: []
  'update:activeTab': [tab: SettingsTabId]
}>()

const navItems = SETTINGS_NAV_ITEMS
const title = computed(() => settingsTabTitle(props.activeTab))

function onMobileNavChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value as SettingsTabId
  emit('update:activeTab', value)
}
</script>
