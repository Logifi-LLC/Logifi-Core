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
    </template>

    <p v-else :class="[helper, 'px-1']">
      Set your account role to Instructor or Dual in Pilot Profile to manage a student roster.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SettingsField from '../SettingsField.vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import { useRoster, type RosterRelationship } from '~/composables/useRoster'
import { useToast } from '~/composables/useToast'
import type { PilotAccountRole } from './SettingsProfileTab.vue'

const props = defineProps<{
  isDarkMode: boolean
  role: PilotAccountRole
}>()

const { helper, btnPrimary, btnSecondary, destructiveRow } = useSettingsClasses(
  computed(() => props.isDarkMode)
)
const { showToast } = useToast()
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

const instructorEmail = ref('')

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

async function loadLists() {
  const results = await Promise.all([
    fetchInstructors(),
    isInstructorRole.value ? fetchStudentRoster() : Promise.resolve({ success: true as const, data: [] })
  ])
  const failed = results.find((r) => !r.success)
  if (failed && !failed.success) {
    showToast(failed.error)
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
  void loadLists()
})

watch(
  () => props.role,
  () => {
    void loadLists()
  }
)
</script>
