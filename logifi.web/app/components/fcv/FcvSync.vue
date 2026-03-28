<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRoute } from 'vue-router'

/** Must match dashboard theme; avoid `dark:` here so OS dark mode does not fight white settings cards. */
const props = defineProps<{
  isDarkMode: boolean
}>()

interface FcvMappedEntry {
  fcv_flight_id: string
  date: string
  role: string
  aircraft_category_class: string
  aircraft_make_model: string
  registration: string
  departure: string
  destination: string
  flight_time: Record<string, unknown>
  [key: string]: unknown
}

const { session, isAuthenticated } = useAuth()

const connected = ref<boolean>(false)
const loadingStatus = ref(false)
const loadingFetch = ref(false)
const loadingImport = ref(false)
const error = ref<string | null>(null)

const dateFrom = ref('')
const dateTo = ref('')
const includeDeadheads = ref(false)

const previewFlights = ref<FcvMappedEntry[]>([])
const showPreviewModal = ref(false)

function authHeaders(): Record<string, string> {
  const token = session.value?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function checkStatus() {
  if (!isAuthenticated.value) return
  loadingStatus.value = true
  error.value = null
  try {
    const data = await $fetch<{ connected: boolean }>('/api/fcv/status', {
      headers: authHeaders(),
    })
    connected.value = data.connected
  } catch (e) {
    connected.value = false
    error.value = e instanceof Error ? e.message : 'Failed to check FC View status'
  } finally {
    loadingStatus.value = false
  }
}

async function connectFcv() {
  error.value = null
  try {
    const data = await $fetch<{ redirectUrl: string }>('/api/fcv/auth', {
      headers: authHeaders(),
    })
    if (data?.redirectUrl) {
      window.location.href = data.redirectUrl
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start FC View connection'
  }
}

async function fetchFlights() {
  if (!isAuthenticated.value) return
  loadingFetch.value = true
  error.value = null
  previewFlights.value = []
  try {
    const data = await $fetch<{ success: boolean; flights: FcvMappedEntry[]; count: number }>(
      '/api/fcv/fetch',
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: {
          dateFrom: dateFrom.value || new Date().toISOString().slice(0, 10),
          dateTo: dateTo.value || new Date().toISOString().slice(0, 10),
          includeDeadheads: includeDeadheads.value,
        },
      }
    )
    if (data?.success && Array.isArray(data.flights)) {
      previewFlights.value = data.flights
      showPreviewModal.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch flights from FC View'
  } finally {
    loadingFetch.value = false
  }
}

async function confirmImport() {
  if (previewFlights.value.length === 0) return
  loadingImport.value = true
  error.value = null
  try {
    await $fetch('/api/fcv/import', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: { flights: previewFlights.value },
    })
    showPreviewModal.value = false
    previewFlights.value = []
    await checkStatus()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import flights'
  } finally {
    loadingImport.value = false
  }
}

function closePreview() {
  showPreviewModal.value = false
}

const totalTime = computed(() => {
  let t = 0
  for (const f of previewFlights.value) {
    const ft = f.flight_time as { total?: number }
    if (typeof ft?.total === 'number') t += ft.total
  }
  return t
})

onMounted(() => {
  if (isAuthenticated.value) checkStatus()
})

const route = useRoute()
watch(
  () => route.query.fcv,
  (val) => {
    if (val === 'connected' && isAuthenticated.value) {
      error.value = null
      checkStatus()
      return
    }

    if (val === 'error') {
      const reason = route.query.reason
      error.value =
        typeof reason === 'string' && reason.trim()
          ? reason
          : 'FC View connection failed. Please verify your FC View client setup and try again.'
    }
  },
  { immediate: true }
)

/** Logifi brand: plane blue + sun (warm gradient on hover). */
const btnConnectFcvClass = computed(() =>
  [
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-semibold transition-all duration-200',
    'text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    'bg-[#415AAB] hover:shadow-[0_6px_22px_rgba(65,90,171,0.45)]',
    'hover:bg-[linear-gradient(135deg,#415AAB_0%,#3F51B5_35%,#FB8C00_72%,#BF360C_100%)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFEB3B]/90 focus-visible:ring-offset-2',
    props.isDarkMode
      ? 'ring-1 ring-white/15 hover:ring-[#FFEB3B]/25 focus-visible:ring-offset-gray-900'
      : 'focus-visible:ring-offset-white',
  ]
    .filter(Boolean)
    .join(' ')
)

const btnOutlineClass = computed(() =>
  [
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
    props.isDarkMode
      ? 'bg-gray-700 hover:bg-gray-600 text-white'
      : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm',
  ].join(' ')
)

const inputClass = computed(() =>
  [
    'rounded-lg border px-2 py-1.5 text-sm font-quicksand',
    props.isDarkMode
      ? 'bg-gray-800 border-gray-600 text-gray-100'
      : 'bg-white border-gray-200 text-gray-900',
  ].join(' ')
)
</script>

<template>
  <div class="space-y-4 font-quicksand" :class="$attrs.class">
    <h4
      :class="[
        'text-sm font-semibold uppercase tracking-wide',
        isDarkMode ? 'text-gray-300' : 'text-gray-700',
      ]"
    >
      Pull from FC View
    </h4>

    <p
      v-if="error"
      :class="['text-sm', isDarkMode ? 'text-red-400' : 'text-red-600']"
    >
      {{ error }}
    </p>

    <template v-if="loadingStatus">
      <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Checking connection…
      </p>
    </template>
    <template v-else-if="!connected">
      <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Connect your FC View account to import flights into your logbook.
      </p>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <button
          type="button"
          :class="btnConnectFcvClass"
          :disabled="!isAuthenticated"
          @click="connectFcv"
        >
          <Icon name="ri:external-link-line" size="16" class="shrink-0" />
          Connect FC View
        </button>
      </div>
    </template>
    <template v-else>
      <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Choose a date range and fetch flights to preview before importing.
      </p>
      <div class="space-y-3 pt-2">
        <div class="flex flex-wrap items-center gap-3">
          <label
            :class="[
              'flex items-center gap-2 text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-700',
            ]"
          >
            <span>From</span>
            <input v-model="dateFrom" type="date" :class="inputClass" />
          </label>
          <label
            :class="[
              'flex items-center gap-2 text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-700',
            ]"
          >
            <span>To</span>
            <input v-model="dateTo" type="date" :class="inputClass" />
          </label>
        </div>
        <label
          :class="[
            'flex items-center gap-2 text-sm cursor-pointer',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          <input
            v-model="includeDeadheads"
            type="checkbox"
            :class="['rounded', isDarkMode ? 'border-gray-600' : 'border-gray-300']"
          />
          Include deadheads
        </label>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            :class="btnOutlineClass"
            :disabled="loadingFetch"
            @click="fetchFlights"
          >
            <Icon name="ri:download-cloud-2-line" size="16" />
            {{ loadingFetch ? 'Fetching…' : 'Fetch flights' }}
          </button>
        </div>
      </div>
    </template>

    <!-- Preview modal -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="closePreview"
      />
      <div
        :class="[
          'relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border shadow-xl overflow-hidden font-quicksand',
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200',
        ]"
      >
        <div
          :class="[
            'p-4 border-b flex items-center justify-between',
            isDarkMode ? 'border-gray-700' : 'border-gray-200',
          ]"
        >
          <h4
            :class="['text-lg font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']"
          >
            Preview — {{ previewFlights.length }} flight(s)
          </h4>
          <button
            type="button"
            :class="[
              'p-2 rounded-lg transition-colors',
              isDarkMode
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600',
            ]"
            @click="closePreview"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <div
            v-for="f in previewFlights"
            :key="f.fcv_flight_id"
            :class="[
              'flex items-center justify-between py-2 border-b last:border-0 text-sm',
              isDarkMode
                ? 'border-gray-700 text-gray-200'
                : 'border-gray-200 text-gray-800',
            ]"
          >
            <span class="font-medium">{{ f.date }}</span>
            <span>{{ f.departure }} → {{ f.destination }}</span>
            <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              {{ f.aircraft_make_model }} ({{ f.registration }})
            </span>
            <span v-if="(f.flight_time as { total?: number })?.total != null">
              {{ (f.flight_time as { total: number }).total }}h
            </span>
          </div>
        </div>
        <div
          :class="[
            'p-4 border-t flex items-center justify-between gap-4',
            isDarkMode ? 'border-gray-700' : 'border-gray-200',
          ]"
        >
          <span :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Total: {{ previewFlights.length }} flight(s)
            <span v-if="totalTime > 0">, {{ totalTime.toFixed(1) }}h</span>
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              :class="btnOutlineClass"
              @click="closePreview"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
              :disabled="loadingImport"
              @click="confirmImport"
            >
              {{ loadingImport ? 'Importing…' : `Import ${previewFlights.length} flight(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
