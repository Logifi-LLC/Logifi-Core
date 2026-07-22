<template>
  <div class="space-y-6">
    <p :class="helper">
      Link Logifi accounts for instructor signing. This is separate from catalog
      “Crew &amp; Instructors,” which are free-text contacts only.
    </p>

    <SettingsListGroup title="Link an instructor" :is-dark-mode="isDarkMode">
      <div class="space-y-3 px-4 py-3">
        <SettingsField label="Instructor email" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <input
              v-model="instructorEmail"
              type="email"
              autocomplete="email"
              placeholder="instructor@example.com"
              :class="inputClass"
              :disabled="isLoading"
              @keydown.enter.prevent="onRequestLink"
            />
          </template>
        </SettingsField>
        <button
          type="button"
          :class="[btnPrimary, 'w-full']"
          :disabled="isLoading || !instructorEmail.trim()"
          @click="onRequestLink"
        >
          {{ isLoading ? 'Working…' : 'Request link' }}
        </button>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="My instructors" :is-dark-mode="isDarkMode">
      <div
        v-if="instructors.length === 0"
        :class="[helper, 'px-4 py-6 text-center']"
      >
        No instructor links yet.
      </div>
      <div
        v-for="row in instructors"
        :key="row.id"
        class="border-t px-4 py-3 first:border-t-0"
        :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
              {{ displayName(row) }}
            </p>
            <p v-if="cfiLine(row)" :class="[helper, 'mt-0.5 text-xs']">{{ cfiLine(row) }}</p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusBadgeClass(row.status)"
            >
              {{ row.status }}
            </span>
          </div>
          <button
            type="button"
            class="shrink-0 text-sm font-medium font-quicksand"
            :class="destructiveRow"
            :disabled="isLoading"
            @click="onRevoke(row.id, row.status === 'PENDING' ? 'cancel' : 'remove')"
          >
            {{ row.status === 'PENDING' ? 'Cancel' : 'Remove' }}
          </button>
        </div>
      </div>
    </SettingsListGroup>

    <template v-if="isInstructorRole">
      <SettingsListGroup title="Pending student requests" :is-dark-mode="isDarkMode">
        <div
          v-if="pendingStudents.length === 0"
          :class="[helper, 'px-4 py-6 text-center']"
        >
          No pending requests.
        </div>
        <div
          v-for="row in pendingStudents"
          :key="row.id"
          class="border-t px-4 py-3 first:border-t-0"
          :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                {{ displayName(row) }}
              </p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                :class="btnSecondary"
                :disabled="isLoading"
                @click="onRevoke(row.id, 'decline')"
              >
                Decline
              </button>
              <button
                type="button"
                :class="btnPrimary"
                :disabled="isLoading"
                @click="onAccept(row.id)"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </SettingsListGroup>

      <SettingsListGroup title="Active students" :is-dark-mode="isDarkMode">
        <div
          v-if="activeStudents.length === 0"
          :class="[helper, 'px-4 py-6 text-center']"
        >
          No active students yet.
        </div>
        <div
          v-for="row in activeStudents"
          :key="row.id"
          class="border-t px-4 py-3 first:border-t-0"
          :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                {{ displayName(row) }}
              </p>
              <p v-if="cfiLine(row)" :class="[helper, 'mt-0.5 text-xs']">{{ cfiLine(row) }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 text-sm font-medium font-quicksand"
              :class="destructiveRow"
              :disabled="isLoading"
              @click="onRevoke(row.id, 'remove')"
            >
              Remove
            </button>
          </div>
        </div>
      </SettingsListGroup>

      <SettingsListGroup title="Pending signatures" :is-dark-mode="isDarkMode">
        <div
          v-if="pendingSignatures.length === 0"
          :class="[helper, 'px-4 py-6 text-center']"
        >
          No flights waiting for your signature.
        </div>
        <div
          v-for="row in pendingSignatures"
          :key="row.log_entry_id"
          class="border-t px-4 py-3 first:border-t-0"
          :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                {{ row.student_name?.trim() || 'Student' }}
                <span
                  v-if="row.amends_entry_id"
                  :class="[
                    'ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide align-middle',
                    isDarkMode ? 'bg-cyan-900/40 text-cyan-300' : 'bg-cyan-100 text-cyan-800',
                  ]"
                >
                  Amended
                </span>
              </p>
              <p :class="[helper, 'mt-0.5 text-xs']">
                {{ formatPendingDate(row.date) }}
                · {{ row.departure || '—' }} → {{ row.destination || '—' }}
                · {{ row.registration || row.aircraft_make_model || 'Aircraft' }}
              </p>
              <p :class="[helper, 'mt-0.5 text-xs']">
                Dual {{ formatHours(row.dual_received) }} · Total {{ formatHours(row.total_time) }}
              </p>
            </div>
            <button
              type="button"
              :class="btnPrimary"
              class="shrink-0"
              :disabled="isLoading || isReviewLoading || isSigning"
              @click="onReview(row.log_entry_id)"
            >
              {{ isReviewLoading && reviewingEntryId === row.log_entry_id ? 'Loading…' : 'Review' }}
            </button>
          </div>
        </div>
      </SettingsListGroup>
    </template>

    <p v-else :class="[helper, 'px-1']">
      Set your account role to Instructor or Dual in Pilot Profile to manage a student roster.
    </p>

    <PendingSignatureReviewModal
      :open="reviewOpen"
      :is-dark-mode="isDarkMode"
      :student-name="reviewStudentName"
      :entry="reviewEntry"
      :is-signing="isSigning"
      @close="closeReview"
      @sign="onSignFromReview"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SettingsField from '../SettingsField.vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import PendingSignatureReviewModal from '../PendingSignatureReviewModal.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import { useRoster, type RosterRelationship } from '~/composables/useRoster'
import { useFlightSigning } from '~/composables/useFlightSigning'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { Database } from '~/types/database'
import type { PilotAccountRole } from './SettingsProfileTab.vue'

type LogEntryRow = Database['public']['Tables']['log_entries']['Row']

const props = defineProps<{
  isDarkMode: boolean
  role: PilotAccountRole
  /** True when the Instructor Links settings frame is visible (triggers refresh). */
  isActive?: boolean
}>()

const { helper, btnPrimary, btnSecondary, destructiveRow } = useSettingsClasses(
  computed(() => props.isDarkMode)
)
const { showToast } = useToast()
const { user } = useAuth()
const {
  roster,
  instructors,
  isLoading,
  requestInstructorLink,
  acceptStudentLink,
  revokeRelationship,
  fetchStudentRoster,
  fetchInstructors
} = useRoster()
const {
  pendingSignatures,
  fetchPendingSignaturesForInstructor,
  fetchPendingSignatureEntry,
  signLogEntry
} = useFlightSigning()

const instructorEmail = ref('')
const reviewingEntryId = ref<string | null>(null)
const reviewOpen = ref(false)
const reviewStudentName = ref<string | null>(null)
const reviewEntry = ref<LogEntryRow | null>(null)
const isReviewLoading = ref(false)
const isSigning = ref(false)

const isInstructorRole = computed(
  () => props.role === 'INSTRUCTOR' || props.role === 'DUAL'
)

const pendingStudents = computed(() =>
  roster.value.filter((row) => row.status === 'PENDING')
)

const activeStudents = computed(() =>
  roster.value.filter((row) => row.status === 'ACTIVE')
)

function displayName(row: RosterRelationship): string {
  return row.profile?.full_name?.trim() || 'Unnamed pilot'
}

function cfiLine(row: RosterRelationship): string {
  const number = row.profile?.cfi_number?.trim()
  const expiration = row.profile?.cfi_expiration
  if (!number && !expiration) return ''
  if (number && expiration) return `CFI ${number} · exp ${expiration}`
  if (number) return `CFI ${number}`
  return `CFI exp ${expiration}`
}

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') {
    return props.isDarkMode
      ? 'bg-green-500/20 text-green-300'
      : 'bg-green-100 text-green-700'
  }
  return props.isDarkMode
    ? 'bg-amber-500/20 text-amber-300'
    : 'bg-amber-100 text-amber-800'
}

function formatPendingDate(date: string): string {
  if (!date) return '—'
  return date.slice(0, 10)
}

function formatHours(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0.0'
  return n.toFixed(1)
}

function closeReview() {
  reviewOpen.value = false
  reviewingEntryId.value = null
  reviewStudentName.value = null
  reviewEntry.value = null
}

async function onReview(entryId: string) {
  reviewingEntryId.value = entryId
  isReviewLoading.value = true
  try {
    const result = await fetchPendingSignatureEntry(entryId)
    if (!result.success) {
      showToast(result.error)
      reviewingEntryId.value = null
      return
    }
    reviewStudentName.value = result.data.studentName
    reviewEntry.value = result.data.entry
    reviewOpen.value = true
  } finally {
    isReviewLoading.value = false
  }
}

async function onSignFromReview(pin: string) {
  const entryId = reviewingEntryId.value ?? reviewEntry.value?.id
  const instructorId = user.value?.id
  if (!entryId || !instructorId) {
    showToast('You must be signed in to sign')
    return
  }
  isSigning.value = true
  try {
    const result = await signLogEntry(entryId, instructorId, pin)
    if (!result.success) {
      showToast(result.error)
      return
    }
    showToast('Flight signed')
    closeReview()
    await fetchPendingSignaturesForInstructor()
  } finally {
    isSigning.value = false
  }
}

async function loadLists() {
  const tasks: Promise<{ success: boolean; error?: string }>[] = [
    fetchInstructors(),
  ]
  if (isInstructorRole.value) {
    tasks.push(fetchStudentRoster())
    tasks.push(fetchPendingSignaturesForInstructor())
  }
  const results = await Promise.all(tasks)
  const failed = results.find((r) => !r.success)
  if (failed && !failed.success) {
    showToast(failed.error ?? 'Failed to load instructor links')
  }
}

async function onRequestLink() {
  const result = await requestInstructorLink(instructorEmail.value)
  if (!result.success) {
    showToast(result.error)
    return
  }
  instructorEmail.value = ''
  showToast('Link request sent')
}

async function onAccept(relationshipId: string) {
  const result = await acceptStudentLink(relationshipId)
  if (!result.success) {
    showToast(result.error)
    return
  }
  showToast('Student link accepted')
}

async function onRevoke(relationshipId: string, action: 'cancel' | 'decline' | 'remove') {
  const result = await revokeRelationship(relationshipId)
  if (!result.success) {
    showToast(result.error)
    return
  }
  const messages = {
    cancel: 'Request cancelled',
    decline: 'Request declined',
    remove: 'Link removed'
  }
  showToast(messages[action])
}

onMounted(() => {
  if (props.isActive !== false) {
    void loadLists()
  }
})

watch(
  () => props.isActive,
  (active) => {
    if (active) void loadLists()
  }
)

watch(
  () => props.role,
  () => {
    if (props.isActive !== false) void loadLists()
  }
)
</script>
