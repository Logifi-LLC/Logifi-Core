<template>
  <div class="space-y-6">
    <p :class="helper">
      Link Logifi accounts for instructor signing. This is separate from catalog
      “Crew &amp; Instructors,” which are free-text contacts only.
    </p>

    <SettingsListGroup title="Link an instructor" :is-dark-mode="isDarkMode">
      <div class="space-y-3 px-4 py-3">
        <p :class="[helper, 'text-xs']">
          Link any Logifi CFI you fly with. Mark one as Main. Use Guest / fill-in when they are not on Logifi.
        </p>
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
              <span
                v-if="row.status === 'ACTIVE' && row.relationship_kind === 'main'"
                :class="[
                  'ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide align-middle',
                  isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800',
                ]"
              >
                Main
              </span>
            </p>
            <p v-if="cfiLine(row)" :class="[helper, 'mt-0.5 text-xs']">{{ cfiLine(row) }}</p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusBadgeClass(row.status)"
            >
              {{ row.status }}
            </span>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <button
              v-if="row.status === 'ACTIVE' && row.relationship_kind !== 'main'"
              type="button"
              class="text-sm font-medium font-quicksand"
              :class="isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-800'"
              :disabled="isLoading"
              @click="onSetMain(row.id)"
            >
              Set as Main
            </button>
            <button
              type="button"
              class="text-sm font-medium font-quicksand"
              :class="destructiveRow"
              :disabled="isLoading"
              @click="onRevoke(row.id, row.status === 'PENDING' ? 'cancel' : 'remove')"
            >
              {{ row.status === 'PENDING' ? 'Cancel' : 'Remove' }}
            </button>
          </div>
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
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              :disabled="isLoading"
              @click="toggleStudentDossier(row)"
            >
              <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                <span class="mr-1 inline-block w-3 text-center opacity-70">{{
                  expandedStudentId === row.student_id ? '▾' : '▸'
                }}</span>
                {{ displayName(row) }}
                <span
                  v-if="row.relationship_kind === 'main'"
                  :class="[
                    'ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide align-middle',
                    isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800',
                  ]"
                >
                  Their Main
                </span>
              </p>
              <p v-if="cfiLine(row)" :class="[helper, 'mt-0.5 text-xs']">{{ cfiLine(row) }}</p>
            </button>
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

          <div
            v-if="expandedStudentId === row.student_id"
            class="mt-3 space-y-3 pl-4"
          >
            <p v-if="dossierLoading" :class="[helper, 'text-xs']">Loading dossier…</p>
            <p v-else-if="dossierError" :class="[helper, 'text-xs text-red-500']">{{ dossierError }}</p>

            <template v-else>
              <div
                v-if="row.relationship_kind === 'main' && dossierSummary"
                :class="[
                  'grid grid-cols-2 gap-2 rounded border p-3 text-xs font-quicksand sm:grid-cols-5',
                  isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50',
                ]"
              >
                <div>
                  <p :class="helper">Entries</p>
                  <p class="font-semibold">{{ dossierSummary.entry_count }}</p>
                </div>
                <div>
                  <p :class="helper">Total</p>
                  <p class="font-semibold">{{ formatHours(dossierSummary.total_time) }}</p>
                </div>
                <div>
                  <p :class="helper">Dual</p>
                  <p class="font-semibold">{{ formatHours(dossierSummary.dual_received) }}</p>
                </div>
                <div>
                  <p :class="helper">PIC</p>
                  <p class="font-semibold">{{ formatHours(dossierSummary.pic) }}</p>
                </div>
                <div>
                  <p :class="helper">Last flight</p>
                  <p class="font-semibold">{{ formatPendingDate(dossierSummary.last_flight_date) }}</p>
                </div>
              </div>

              <p
                v-else-if="row.relationship_kind !== 'main'"
                :class="[helper, 'text-xs']"
              >
                Full logbook summary is available to this student’s Main instructor. You can view endorsements you signed.
              </p>

              <div>
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide font-quicksand" :class="helper">
                  {{ row.relationship_kind === 'main' ? 'Signed endorsements' : 'Your signed endorsements' }}
                </p>
                <div
                  v-if="dossierEndorsements.length === 0"
                  :class="[helper, 'text-xs']"
                >
                  No signed endorsements yet.
                </div>
                <div
                  v-for="endorsement in dossierEndorsements"
                  :key="endorsement.id"
                  :class="[
                    'mb-2 rounded border p-2 last:mb-0',
                    isDarkMode ? 'border-white/10 bg-black/15' : 'border-gray-200 bg-white',
                  ]"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-xs font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                      {{ endorsement.template_code }} · {{ endorsement.title.replace(/^A\.\d+\s+/, '') }}
                    </p>
                    <span
                      :class="[
                        'rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide',
                        endorsement.instructor_id === user?.id
                          ? (isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'),
                      ]"
                    >
                      {{ endorsement.instructor_id === user?.id ? 'You' : 'Other CFI' }}
                    </span>
                  </div>
                  <p
                    :class="[
                      'mt-2 rounded border px-2 py-1.5 text-[11px] font-mono whitespace-pre-wrap',
                      isDarkMode ? 'border-white/15 bg-black/30 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900',
                    ]"
                  >
                    {{ formatEndorsementSignatureBlock(endorsement) }}
                  </p>
                  <p
                    :class="[
                      'mt-2 text-xs font-quicksand whitespace-pre-wrap line-clamp-4',
                      isDarkMode ? 'text-gray-300' : 'text-gray-700',
                    ]"
                  >
                    {{ endorsement.rendered_body }}
                  </p>
                </div>
              </div>
            </template>
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
import {
  useEndorsements,
  type StudentDossierEndorsement,
  type StudentLogbookSummary,
} from '~/composables/useEndorsements'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { formatEndorsementSignatureBlock } from '~/utils/endorsementSignature'
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
  setMainInstructor,
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
const {
  fetchStudentLogbookSummary,
  fetchStudentEndorsementsAsInstructor,
} = useEndorsements()

const instructorEmail = ref('')
const reviewingEntryId = ref<string | null>(null)
const reviewOpen = ref(false)
const reviewStudentName = ref<string | null>(null)
const reviewEntry = ref<LogEntryRow | null>(null)
const isReviewLoading = ref(false)
const isSigning = ref(false)

const expandedStudentId = ref<string | null>(null)
const dossierLoading = ref(false)
const dossierError = ref<string | null>(null)
const dossierSummary = ref<StudentLogbookSummary | null>(null)
const dossierEndorsements = ref<StudentDossierEndorsement[]>([])

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

function formatPendingDate(date: string | null | undefined): string {
  if (!date) return '—'
  return date.slice(0, 10)
}

function formatHours(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0.0'
  return n.toFixed(1)
}

async function toggleStudentDossier(row: RosterRelationship) {
  if (expandedStudentId.value === row.student_id) {
    expandedStudentId.value = null
    dossierSummary.value = null
    dossierEndorsements.value = []
    dossierError.value = null
    return
  }

  expandedStudentId.value = row.student_id
  dossierLoading.value = true
  dossierError.value = null
  dossierSummary.value = null
  dossierEndorsements.value = []

  try {
    const isMain = row.relationship_kind === 'main'
    if (isMain) {
      const summaryResult = await fetchStudentLogbookSummary(row.student_id)
      if (!summaryResult.success) {
        dossierError.value = summaryResult.error
        return
      }
      dossierSummary.value = summaryResult.data
    }

    const endorsementsResult = await fetchStudentEndorsementsAsInstructor(row.student_id)
    if (!endorsementsResult.success) {
      dossierError.value = endorsementsResult.error
      return
    }
    dossierEndorsements.value = endorsementsResult.data
  } finally {
    dossierLoading.value = false
  }
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

async function onSetMain(relationshipId: string) {
  const result = await setMainInstructor(relationshipId)
  if (!result.success) {
    showToast(result.error)
    return
  }
  showToast('Main instructor updated')
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
