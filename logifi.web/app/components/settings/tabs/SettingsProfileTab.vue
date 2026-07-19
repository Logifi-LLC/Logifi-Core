<template>
  <div class="space-y-6">
    <div class="flex items-start gap-4 px-1">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-semibold"
        :class="isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'"
      >
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold font-quicksand break-words">
          {{ profile.name || 'Add your name' }}
        </h2>
        <p :class="helper">
          {{ profile.callsign ? `Callsign ${profile.callsign}` : 'Optional callsign' }}
        </p>
      </div>
    </div>

    <SettingsSubNav
      v-model="subTabModel"
      :is-dark-mode="isDarkMode"
      :tabs="profileSubTabs"
    />

    <div v-show="subTabModel === 'profile'" class="space-y-6">
      <SettingsListGroup title="Personal" :is-dark-mode="isDarkMode">
        <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
          <div class="px-4 py-3">
            <SettingsField label="Full name" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.name" type="text" placeholder="Jordan Reynolds" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField label="Callsign" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.callsign" type="text" placeholder="MAVERICK" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField label="Home base" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.homeBase" type="text" placeholder="KAPA" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField label="Certificates & ratings" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <SettingsAutoTextarea
                  ref="certificatesTextareaRef"
                  v-model="profile.certificates"
                  placeholder="Commercial ASEL · Instrument Airplane"
                  :input-class="inputClass"
                />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField
              label="Account role"
              hint="Instructors must set Instructor or Dual so students can link to them"
              :is-dark-mode="isDarkMode"
            >
              <template #default="{ inputClass }">
                <select v-model="profile.role" :class="inputClass">
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="DUAL">Dual (student & instructor)</option>
                </select>
              </template>
            </SettingsField>
          </div>
          <div v-if="showCfiFields" class="px-4 py-3">
            <SettingsField label="CFI number" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input
                  v-model="profile.cfiNumber"
                  type="text"
                  placeholder="CFI certificate number"
                  :class="inputClass"
                />
              </template>
            </SettingsField>
          </div>
          <div v-if="showCfiFields" class="px-4 py-3">
            <SettingsField label="CFI expiration" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.cfiExpiration" type="date" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div v-if="showCfiFields" class="space-y-3 px-4 py-3">
            <SettingsField
              label="Signing PIN"
              hint="Used when signing student log entries. 4–12 characters."
              :is-dark-mode="isDarkMode"
            >
              <template #default="{ inputClass }">
                <input
                  v-model="signingPin"
                  type="password"
                  autocomplete="new-password"
                  maxlength="12"
                  placeholder="Enter PIN"
                  :class="inputClass"
                  :disabled="isSavingPin"
                />
              </template>
            </SettingsField>
            <SettingsField label="Confirm signing PIN" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input
                  v-model="signingPinConfirm"
                  type="password"
                  autocomplete="new-password"
                  maxlength="12"
                  placeholder="Confirm PIN"
                  :class="inputClass"
                  :disabled="isSavingPin"
                />
              </template>
            </SettingsField>
            <button
              type="button"
              :class="[btnPrimary, 'w-full']"
              :disabled="isSavingPin || !signingPin || !signingPinConfirm"
              @click="onSaveSigningPin"
            >
              {{ isSavingPin ? 'Saving…' : 'Save signing PIN' }}
            </button>
          </div>
          <div class="px-4 py-3">
            <SettingsField
              label="Military logbook fields"
              hint="NVG time and condition for military flight records"
              :is-dark-mode="isDarkMode"
            >
              <template #default>
                <label class="inline-flex cursor-pointer items-center gap-3">
                  <input
                    v-model="profile.enableMilitaryFields"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'bg-white'"
                  />
                  <span class="text-sm" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
                    Enable military logbook fields (NVG time + condition)
                  </span>
                </label>
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField label="Current focus" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <SettingsAutoTextarea
                  v-model="profile.flightGoals"
                  placeholder="Instrument currency, CFI prep…"
                  :input-class="inputClass"
                />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
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
        </div>
      </SettingsListGroup>

      <SettingsListGroup :is-dark-mode="isDarkMode">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold font-quicksand transition-colors"
          :class="isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'"
          @click="show8710Model = !show8710Model"
        >
          <span>FAA Form 8710 fields</span>
          <Icon :name="show8710Model ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="18" />
        </button>
        <div v-show="show8710Model" class="divide-y border-t" :class="isDarkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100'">
          <p :class="[helper, 'px-4 py-3']">Used when generating FAA Form 8710 from your logbook.</p>
          <div class="px-4 py-3">
            <SettingsField label="Date of birth" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.dateOfBirth" type="text" placeholder="MM/DD/YYYY" maxlength="10" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
            <SettingsField label="Place of birth" :is-dark-mode="isDarkMode">
              <template #default="{ inputClass }">
                <input v-model="profile.placeOfBirth" type="text" placeholder="City, State" :class="inputClass" />
              </template>
            </SettingsField>
          </div>
          <div class="px-4 py-3">
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
          </div>
          <div class="px-4 py-3">
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
          </div>
        </div>
      </SettingsListGroup>
    </div>

    <div v-show="subTabModel === 'stats'" class="space-y-6">
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="rounded-xl border p-3"
          :class="isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'"
        >
          <p :class="[helper, 'text-xs']">{{ card.label }}</p>
          <p class="mt-1 text-xl font-semibold tracking-tight">{{ card.value }}</p>
          <p v-if="card.helper" :class="[helper, 'mt-0.5 text-xs']">{{ card.helper }}</p>
        </div>
      </div>

      <SettingsListGroup title="Favorites" :is-dark-mode="isDarkMode">
        <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
          <div class="px-4 py-3">
            <p :class="helper">Favorite aircraft</p>
            <p class="mt-1 font-semibold break-words">{{ stats.favoriteAircraft || '—' }}</p>
          </div>
          <div class="px-4 py-3">
            <p :class="helper">Favorite route</p>
            <p class="mt-1 font-semibold break-words">{{ stats.favoriteRoute || '—' }}</p>
          </div>
        </div>
      </SettingsListGroup>

      <SettingsListGroup title="Currency" :is-dark-mode="isDarkMode">
        <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
          <div
            v-for="item in currencySummary"
            :key="item.label"
            class="px-4 py-3"
            :class="
              item.current
                ? isDarkMode
                  ? 'bg-green-900/10'
                  : 'bg-green-50/50'
                : ''
            "
          >
            <p :class="[helper, 'text-xs']">{{ item.label }}</p>
            <p class="text-sm font-semibold" :class="item.current ? (isDarkMode ? 'text-green-400' : 'text-green-700') : ''">
              {{ item.current ? 'Current' : 'Expired' }}
            </p>
            <p :class="[helper, 'text-xs']">{{ item.detail }}</p>
          </div>
        </div>
        <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
          <button type="button" :class="[btnPrimary, 'w-full']" @click="$emit('open-currency')">
            Currency details
          </button>
        </div>
      </SettingsListGroup>

      <SettingsListGroup title="Recent flights" :is-dark-mode="isDarkMode">
        <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
          <div
            v-for="flight in recentFlights"
            :key="flight.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold">{{ formatDate(flight.date) }}</p>
              <p :class="[helper, 'truncate']">{{ flight.route }}</p>
            </div>
            <div class="shrink-0 text-right text-sm">
              <p class="font-medium">{{ flight.aircraft }}</p>
              <p :class="helper">{{ flight.hours }} hrs</p>
            </div>
          </div>
          <p v-if="recentFlights.length === 0" :class="[helper, 'px-4 py-6 text-center']">
            No flights logged yet.
          </p>
        </div>
      </SettingsListGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsField from '../SettingsField.vue'
import SettingsAutoTextarea from '../SettingsAutoTextarea.vue'
import SettingsSubNav from '../SettingsSubNav.vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import { useFlightSigning } from '~/composables/useFlightSigning'
import { useToast } from '~/composables/useToast'

export type PilotAccountRole = 'STUDENT' | 'INSTRUCTOR' | 'DUAL'

export interface PilotProfileForm {
  name: string
  callsign: string
  homeBase: string
  certificates: string
  flightGoals: string
  notes: string
  enableMilitaryFields: boolean
  role: PilotAccountRole
  cfiNumber: string
  cfiExpiration: string
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

const { helper, btnPrimary } = useSettingsClasses(computed(() => props.isDarkMode))
const { showToast } = useToast()
const { setSigningPin } = useFlightSigning()

const certificatesTextareaRef = ref<InstanceType<typeof SettingsAutoTextarea> | null>(null)
const signingPin = ref('')
const signingPinConfirm = ref('')
const isSavingPin = ref(false)

const showCfiFields = computed(
  () => props.profile.role === 'INSTRUCTOR' || props.profile.role === 'DUAL'
)

const profileSubTabs = [
  { value: 'profile', label: 'Personal', id: 'pilot-profile-tab-form', panelId: 'pilot-profile-panel-profile' },
  { value: 'stats', label: 'Stats & currency', id: 'pilot-profile-tab-stats', panelId: 'pilot-profile-panel-stats' },
]

async function onSaveSigningPin() {
  if (signingPin.value !== signingPinConfirm.value) {
    showToast('PIN confirmation does not match')
    return
  }
  isSavingPin.value = true
  try {
    const result = await setSigningPin(signingPin.value)
    if (!result.success) {
      showToast(result.error)
      return
    }
    signingPin.value = ''
    signingPinConfirm.value = ''
    showToast('Signing PIN saved')
  } finally {
    isSavingPin.value = false
  }
}
</script>
