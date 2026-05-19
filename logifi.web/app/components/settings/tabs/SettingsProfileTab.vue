<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 flex items-start gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-xl font-semibold"
        :class="isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'"
      >
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-xl font-semibold font-quicksand break-words">
          {{ profile.name || 'Add your name' }}
        </h2>
        <p :class="helper">
          {{ profile.callsign ? `Callsign ${profile.callsign}` : 'Optional callsign' }}
        </p>
        <p v-if="profile.homeBase" :class="helper">
          Home base · {{ profile.homeBase.toUpperCase() }}
        </p>
      </div>
    </div>

    <SettingsSubNav
      v-model="subTabModel"
      :is-dark-mode="isDarkMode"
      :tabs="profileSubTabs"
    />

    <div v-show="subTabModel === 'profile'" class="space-y-6">
      <SettingsSection title="Personal" :is-dark-mode="isDarkMode" :bordered="false">
        <div class="space-y-4 rounded-lg border p-4 sm:p-5" :class="section">
          <SettingsField label="Full name" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="profile.name" type="text" placeholder="Jordan Reynolds" :class="inputClass" />
            </template>
          </SettingsField>
          <div class="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Callsign" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.callsign" type="text" placeholder="MAVERICK" :class="inputClass" />
              </template>
            </SettingsField>
            <SettingsField label="Home base" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.homeBase" type="text" placeholder="KAPA" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <SettingsField label="Certificates & ratings" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <div class="space-y-3">
                <div
                  class="rounded-lg border p-3"
                  :class="isDarkMode ? 'border-gray-600 bg-gray-900/40' : 'border-gray-200 bg-gray-50'"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p :class="[helper, 'text-xs']">
                      Import from the public FAA airman registry (certificates &amp; ratings only).
                    </p>
                    <button
                      type="button"
                      :class="btnSecondary"
                      class="!px-3 !py-1.5 text-xs"
                      @click="showRegistryImport = !showRegistryImport"
                    >
                      {{ showRegistryImport ? 'Hide' : 'Pull from registry' }}
                    </button>
                  </div>
                  <div v-show="showRegistryImport" class="mt-3 space-y-3 border-t pt-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'">
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-1">
                        <label :class="label">Last name</label>
                        <input v-model="registryLastName" type="text" placeholder="Yeager" :class="input" />
                      </div>
                      <div class="space-y-1">
                        <label :class="label">Certificate number</label>
                        <input v-model="registryCertNumber" type="text" inputmode="numeric" placeholder="12345678" :class="input" />
                      </div>
                    </div>
                    <div class="space-y-1">
                      <label :class="label">First name <span :class="helper" class="font-normal">(optional)</span></label>
                      <input v-model="registryFirstName" type="text" placeholder="Charles" :class="input" />
                    </div>
                    <div v-if="registryCandidates.length > 0" class="space-y-2">
                      <p :class="[helper, 'text-xs']">Multiple pilots matched. Select yours:</p>
                      <div class="space-y-1.5">
                        <label
                          v-for="candidate in registryCandidates"
                          :key="candidate.eventTarget"
                          class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                          :class="
                            registrySelectedTarget === candidate.eventTarget
                              ? isDarkMode
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-blue-400 bg-blue-50'
                              : isDarkMode
                                ? 'border-gray-600'
                                : 'border-gray-200'
                          "
                        >
                          <input
                            v-model="registrySelectedTarget"
                            type="radio"
                            class="mt-1"
                            :value="candidate.eventTarget"
                          />
                          <span>{{ candidate.displayName }}</span>
                        </label>
                      </div>
                    </div>
                    <p
                      v-if="registryNotice"
                      :class="[helper, 'text-xs']"
                    >
                      {{ registryNotice }}
                    </p>
                    <p v-if="registryError" class="text-xs text-red-500">{{ registryError }}</p>
                    <div
                      v-if="registryPreview"
                      class="rounded-lg border px-3 py-2 text-sm"
                      :class="isDarkMode ? 'border-gray-600 bg-gray-900/60' : 'border-gray-200 bg-white'"
                    >
                      <p class="font-semibold">{{ registryPreview.name }}</p>
                      <p :class="[helper, 'mt-1 whitespace-pre-wrap']">{{ registryPreview.certificates }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        :class="btnPrimary"
                        class="!px-3 !py-1.5 text-xs"
                        :disabled="registryLoading"
                        @click="runRegistryLookup"
                      >
                        {{
                          registryLoading
                            ? 'Looking up…'
                            : registryCandidates.length > 0 && !registryPreview
                              ? 'Load selected'
                              : registryPreview
                                ? 'Look up again'
                                : 'Look up'
                        }}
                      </button>
                      <button
                        v-if="registryPreview"
                        type="button"
                        :class="btnSecondary"
                        class="!px-3 !py-1.5 text-xs"
                        @click="applyRegistryPreview"
                      >
                        Apply to profile
                      </button>
                    </div>
                    <p :class="[helper, 'text-xs']">
                      FAA does not return date of birth or certificate number in results. Review imported data before saving.
                    </p>
                  </div>
                </div>
                <SettingsAutoTextarea
                  ref="certificatesTextareaRef"
                  v-model="profile.certificates"
                  placeholder="Commercial ASEL · Instrument Airplane"
                  :input-class="inputClass"
                />
              </div>
            </template>
          </SettingsField>
          <SettingsField label="Current focus" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <SettingsAutoTextarea
                v-model="profile.flightGoals"
                placeholder="Instrument currency, CFI prep…"
                :input-class="inputClass"
              />
            </template>
          </SettingsField>
          <SettingsField label="Notes" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <SettingsAutoTextarea
                v-model="profile.notes"
                placeholder="Instructors, aircraft notes…"
                :input-class="inputClass"
              />
            </template>
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection :bordered="false" :is-dark-mode="isDarkMode">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold font-quicksand transition-colors"
          :class="isDarkMode ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'"
          @click="show8710Model = !show8710Model"
        >
          <span>FAA Form 8710 fields</span>
          <Icon :name="show8710Model ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="18" />
        </button>
        <div v-show="show8710Model" class="mt-4 space-y-4 rounded-lg border p-4 sm:p-5" :class="section">
          <p :class="helper" class="mb-2">Used when generating FAA Form 8710 from your logbook.</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Date of birth" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.dateOfBirth" type="text" placeholder="MM/DD/YYYY" maxlength="10" :class="inputClass" />
              </template>
            </SettingsField>
            <SettingsField label="Place of birth" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.placeOfBirth" type="text" placeholder="City, State" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <SettingsField label="Residential address" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="profile.residentialAddress" type="text" placeholder="Street address" :class="[inputClass, 'mb-2']" />
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input v-model="profile.residentialCity" type="text" placeholder="City" :class="inputClass" />
                <input v-model="profile.residentialState" type="text" placeholder="State" maxlength="2" :class="[inputClass, 'uppercase']" />
                <input v-model="profile.residentialZip" type="text" placeholder="ZIP" maxlength="10" :class="inputClass" />
              </div>
            </template>
          </SettingsField>
          <SettingsField label="Mailing address" hint="(if different)" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="profile.mailingAddress" type="text" placeholder="Street address (optional)" :class="[inputClass, 'mb-2']" />
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input v-model="profile.mailingCity" type="text" placeholder="City" :class="inputClass" />
                <input v-model="profile.mailingState" type="text" placeholder="State" maxlength="2" :class="[inputClass, 'uppercase']" />
                <input v-model="profile.mailingZip" type="text" placeholder="ZIP" maxlength="10" :class="inputClass" />
              </div>
            </template>
          </SettingsField>
          <SettingsField label="Certificate number" hint="(optional)" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="profile.certificateNumber" type="text" placeholder="12345678" :class="inputClass" />
            </template>
          </SettingsField>
        </div>
      </SettingsSection>
    </div>

    <div v-show="subTabModel === 'stats'" class="space-y-6">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="rounded-lg border p-4"
          :class="isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'"
        >
          <p :class="helper">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ card.value }}</p>
          <p v-if="card.helper" :class="[helper, 'mt-0.5 text-xs']">{{ card.helper }}</p>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-lg border p-4" :class="isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'">
          <p :class="helper">Favorite aircraft</p>
          <p class="mt-1 font-semibold break-words">{{ stats.favoriteAircraft || '—' }}</p>
        </div>
        <div class="rounded-lg border p-4" :class="isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'">
          <p :class="helper">Favorite route</p>
          <p class="mt-1 font-semibold break-words">{{ stats.favoriteRoute || '—' }}</p>
        </div>
      </div>

      <SettingsSection title="Currency" description="Part 61.57 recent experience." :is-dark-mode="isDarkMode">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="grid flex-1 gap-2 sm:grid-cols-3">
            <div
              v-for="item in currencySummary"
              :key="item.label"
              class="rounded-lg border px-3 py-2"
              :class="
                item.current
                  ? isDarkMode
                    ? 'border-green-800 bg-green-900/20'
                    : 'border-green-200 bg-green-50'
                  : isDarkMode
                    ? 'border-gray-700 bg-gray-800/30'
                    : 'border-gray-200 bg-gray-50'
              "
            >
              <p :class="[helper, 'text-xs']">{{ item.label }}</p>
              <p class="text-sm font-semibold" :class="item.current ? (isDarkMode ? 'text-green-400' : 'text-green-700') : ''">
                {{ item.current ? 'Current' : 'Expired' }}
              </p>
              <p :class="[helper, 'text-xs']">{{ item.detail }}</p>
            </div>
          </div>
          <button type="button" :class="btnPrimary" @click="$emit('open-currency')">
            Currency details
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Recent flights" description="Latest three logbook entries." :is-dark-mode="isDarkMode">
        <div class="space-y-2">
          <div
            v-for="flight in recentFlights"
            :key="flight.id"
            class="flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            :class="isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold">{{ formatDate(flight.date) }}</p>
              <p :class="helper">{{ flight.route }}</p>
            </div>
            <div class="text-sm sm:text-right">
              <p class="font-medium">{{ flight.aircraft }}</p>
              <p :class="helper">{{ flight.hours }} hrs</p>
            </div>
          </div>
          <p v-if="recentFlights.length === 0" :class="[helper, 'py-6 text-center']">
            No flights logged yet.
          </p>
        </div>
      </SettingsSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SettingsSection from '../SettingsSection.vue'
import SettingsField from '../SettingsField.vue'
import SettingsAutoTextarea from '../SettingsAutoTextarea.vue'
import SettingsSubNav from '../SettingsSubNav.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import {
  useAirmanLookup,
  type AirmanRegistryCandidate,
  type AirmanRegistryData,
} from '~/composables/useAirmanLookup'

export interface PilotProfileForm {
  name: string
  callsign: string
  homeBase: string
  certificates: string
  flightGoals: string
  notes: string
  dateOfBirth: string
  placeOfBirth: string
  residentialAddress: string
  residentialCity: string
  residentialState: string
  residentialZip: string
  mailingAddress: string
  mailingCity: string
  mailingState: string
  mailingZip: string
  certificateNumber: string
}

const props = defineProps<{
  isDarkMode: boolean
  profile: PilotProfileForm
  initials: string
  statCards: { key: string; label: string; value: string; helper?: string }[]
  stats: { favoriteAircraft: string; favoriteRoute: string }
  currencySummary: { label: string; current: boolean; detail: string }[]
  recentFlights: { id: string; date: string; route: string; aircraft: string; hours: string }[]
  formatDate: (date: string) => string
}>()

const subTabModel = defineModel<'profile' | 'stats'>('subTab', { required: true })
const show8710Model = defineModel<boolean>('show8710', { required: true })

defineEmits<{
  'open-currency': []
}>()

const { section, input, label, helper, btnPrimary, btnSecondary } = useSettingsClasses(
  computed(() => props.isDarkMode)
)

const { lookupAirman } = useAirmanLookup()

const showRegistryImport = ref(false)
const registryLastName = ref('')
const registryFirstName = ref('')
const registryCertNumber = ref('')
const registryLoading = ref(false)
const registryError = ref('')
const registryNotice = ref('')
const registryPreview = ref<AirmanRegistryData | null>(null)
const registryCandidates = ref<AirmanRegistryCandidate[]>([])
const registrySelectedTarget = ref('')
const certificatesTextareaRef = ref<InstanceType<typeof SettingsAutoTextarea> | null>(null)

function splitNameForRegistry(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: '', lastName: parts[0] }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

watch(
  () => props.profile.name,
  (name) => {
    if (registryLastName.value.trim()) return
    const split = splitNameForRegistry(name || '')
    registryLastName.value = split.lastName
    registryFirstName.value = split.firstName
  },
  { immediate: true }
)

watch(
  () => props.profile.certificateNumber,
  (cert) => {
    if (!registryCertNumber.value.trim() && cert?.trim()) {
      registryCertNumber.value = cert.trim()
    }
  },
  { immediate: true }
)

async function runRegistryLookup() {
  registryError.value = ''
  registryNotice.value = ''
  if (!registryCandidates.value.length) {
    registryPreview.value = null
  }

  if (!registryLastName.value.trim() || !registryCertNumber.value.trim()) {
    registryError.value = 'Last name and certificate number are required.'
    return
  }

  registryLoading.value = true
  try {
    const response = await lookupAirman({
      lastName: registryLastName.value,
      certificateNumber: registryCertNumber.value,
      firstName: registryFirstName.value || undefined,
      eventTarget: registrySelectedTarget.value || undefined,
    })

    if (response.success) {
      registryPreview.value = response.data
      registryCandidates.value = []
      registrySelectedTarget.value = ''
      registryNotice.value = ''
      return
    }

    if ('code' in response && response.code === 'MULTIPLE_MATCHES') {
      registryCandidates.value = response.candidates
      if (!registrySelectedTarget.value) {
        registrySelectedTarget.value = response.candidates[0]?.eventTarget ?? ''
      }
      registryNotice.value = response.message
      return
    }

    registryCandidates.value = []
    registryError.value = response.error ?? 'Lookup failed.'
  } finally {
    registryLoading.value = false
  }
}

function applyRegistryPreview() {
  if (!registryPreview.value) return
  props.profile.name = registryPreview.value.name
  props.profile.certificates = registryPreview.value.certificates
  props.profile.certificateNumber = registryCertNumber.value.trim()
  if (registryPreview.value.residentialAddress) {
    props.profile.residentialAddress = registryPreview.value.residentialAddress
  }
  if (registryPreview.value.residentialCity) {
    props.profile.residentialCity = registryPreview.value.residentialCity
  }
  if (registryPreview.value.residentialState) {
    props.profile.residentialState = registryPreview.value.residentialState
  }
  if (registryPreview.value.residentialZip) {
    props.profile.residentialZip = registryPreview.value.residentialZip
  }
  nextTick(() => certificatesTextareaRef.value?.resize())
}

const profileSubTabs = [
  { value: 'profile', label: 'Personal', id: 'pilot-profile-tab-form', panelId: 'pilot-profile-panel-profile' },
  { value: 'stats', label: 'Stats & currency', id: 'pilot-profile-tab-stats', panelId: 'pilot-profile-panel-stats' },
]
</script>
