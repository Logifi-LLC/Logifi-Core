<template>
  <div class="space-y-6">
    <p :class="helper">
      AC 61-65H Appendix A sample endorsements. Request from a linked instructor, or issue and PIN-sign as an instructor.
    </p>

    <!-- Compose / request -->
    <SettingsListGroup title="New endorsement" :is-dark-mode="isDarkMode">
      <div class="space-y-3 px-4 py-3">
        <SettingsField label="Mode" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <select v-model="composeMode" :class="inputClass" :disabled="isBusy">
              <option value="request">Request (as student)</option>
              <option v-if="isInstructorRole" value="issue">Issue (as instructor)</option>
            </select>
          </template>
        </SettingsField>

        <SettingsField
          :label="composeMode === 'issue' ? 'Student' : 'Instructor'"
          :is-dark-mode="isDarkMode"
        >
          <template #default="{ inputClass }">
            <select v-model="counterpartyId" :class="inputClass" :disabled="isBusy">
              <option value="" disabled>Select…</option>
              <option
                v-for="row in counterparties"
                :key="row.id"
                :value="composeMode === 'issue' ? row.student_id : row.instructor_id"
              >
                {{ displayName(row) }}
              </option>
            </select>
          </template>
        </SettingsField>

        <SettingsField label="Category" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <select v-model="categoryFilter" :class="inputClass">
              <option value="">All categories</option>
              <option v-for="cat in ENDORSEMENT_CATEGORIES" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </template>
        </SettingsField>

        <SettingsField label="Search templates" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <input
              v-model="templateSearch"
              type="search"
              placeholder="e.g. solo, A.6, flight review"
              :class="inputClass"
            />
          </template>
        </SettingsField>

        <SettingsField label="Template" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <select v-model="selectedCode" :class="inputClass" :disabled="isBusy">
              <option value="" disabled>Select endorsement…</option>
              <option
                v-for="t in filteredTemplates"
                :key="t.code"
                :value="t.code"
              >
                {{ t.code }} — {{ t.title.replace(/^A\.\d+\s+/, '') }}
              </option>
            </select>
          </template>
        </SettingsField>

        <p v-if="selectedTemplate" :class="[helper, 'text-xs']">
          {{ selectedTemplate.regulationRefs || 'AC 61-65H sample endorsement' }}
          <span v-if="selectedTemplate.validityDays">
            · expires {{ selectedTemplate.validityDays }} days after issue
          </span>
        </p>

        <div v-if="selectedTemplate" class="space-y-2">
          <SettingsField
            v-for="key in selectedTemplate.placeholders"
            :key="key"
            :label="placeholderLabel(key)"
            :is-dark-mode="isDarkMode"
          >
            <template #default="{ inputClass }">
              <input
                v-model="fieldValues[key]"
                type="text"
                :placeholder="placeholderLabel(key)"
                :class="inputClass"
                :disabled="isBusy"
              />
            </template>
          </SettingsField>
        </div>

        <div
          v-if="previewBody"
          :class="[
            'rounded border p-3 text-xs font-quicksand whitespace-pre-wrap',
            isDarkMode ? 'border-white/10 bg-black/20 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-800',
          ]"
        >
          {{ previewBody }}
        </div>

        <button
          type="button"
          :class="[btnPrimary, 'w-full']"
          :disabled="isBusy || !canSubmit"
          @click="onSubmitCompose"
        >
          {{
            isBusy
              ? 'Working…'
              : composeMode === 'issue'
                ? 'Create draft'
                : 'Request endorsement'
          }}
        </button>
      </div>
    </SettingsListGroup>

    <!-- Instructor inbox -->
    <SettingsListGroup
      v-if="isInstructorRole"
      title="Pending to sign"
      :is-dark-mode="isDarkMode"
    >
      <div
        v-if="pendingForInstructor.length === 0"
        :class="[helper, 'px-4 py-6 text-center']"
      >
        No draft or pending endorsements.
      </div>
      <div
        v-for="row in pendingForInstructor"
        :key="row.id"
        class="border-t px-4 py-3 first:border-t-0"
        :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
      >
        <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
          {{ row.template_code }} · {{ row.title.replace(/^A\.\d+\s+/, '') }}
        </p>
        <p :class="[helper, 'mt-1 text-xs']">
          Status: {{ row.status }}
          <span v-if="row.expires_at"> · expires {{ formatDate(row.expires_at) }}</span>
        </p>
        <p
          :class="[
            'mt-2 text-xs font-quicksand whitespace-pre-wrap line-clamp-4',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          {{ row.rendered_body }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            :class="btnPrimary"
            :disabled="isBusy"
            @click="openSign(row)"
          >
            Sign with PIN
          </button>
          <button
            type="button"
            :class="btnSecondary"
            :disabled="isBusy"
            @click="onCancel(row.id)"
          >
            Cancel
          </button>
        </div>
      </div>
    </SettingsListGroup>

    <SettingsListGroup
      v-if="isInstructorRole"
      title="Signed by you (archive)"
      :is-dark-mode="isDarkMode"
    >
      <div
        v-if="signedByMe.length === 0"
        :class="[helper, 'px-4 py-6 text-center']"
      >
        No signed endorsements in your archive yet.
      </div>
      <div
        v-for="row in signedByMe"
        :key="row.id"
        class="border-t px-4 py-3 first:border-t-0"
        :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
      >
        <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
          {{ row.template_code }} · {{ row.title.replace(/^A\.\d+\s+/, '') }}
        </p>
        <p
          :class="[
            'mt-2 rounded border px-2 py-1.5 text-xs font-mono font-quicksand whitespace-pre-wrap',
            isDarkMode ? 'border-white/15 bg-black/30 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900',
          ]"
        >
          {{ formatEndorsementSignatureBlock(row) }}
        </p>
        <p
          :class="[
            'mt-2 text-xs font-quicksand whitespace-pre-wrap line-clamp-3',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          {{ row.rendered_body }}
        </p>
      </div>
    </SettingsListGroup>

    <!-- Student list -->
    <SettingsListGroup title="My endorsements" :is-dark-mode="isDarkMode">
      <div
        v-if="asStudent.length === 0"
        :class="[helper, 'px-4 py-6 text-center']"
      >
        No endorsements yet.
      </div>
      <div
        v-for="row in asStudent"
        :key="row.id"
        class="border-t px-4 py-3 first:border-t-0"
        :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
              {{ row.template_code }} · {{ row.title.replace(/^A\.\d+\s+/, '') }}
            </p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusBadgeClass(row)"
            >
              {{ statusLabel(row) }}
            </span>
            <p
              v-if="row.signed_at"
              :class="[
                'mt-2 rounded border px-2 py-1.5 text-xs font-mono font-quicksand whitespace-pre-wrap',
                isDarkMode ? 'border-white/15 bg-black/30 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900',
              ]"
            >
              {{ formatEndorsementSignatureBlock(row) }}
            </p>
            <p v-if="row.expires_at" :class="[helper, 'mt-1 text-xs']">
              Expires {{ formatDate(row.expires_at) }}
              <span v-if="isExpired(row)" class="font-semibold text-amber-600"> · expired</span>
            </p>
          </div>
          <button
            v-if="row.status === 'pending' || row.status === 'draft'"
            type="button"
            class="shrink-0 text-sm font-medium font-quicksand"
            :class="destructiveRow"
            :disabled="isBusy"
            @click="onCancel(row.id)"
          >
            Cancel
          </button>
        </div>
        <p
          :class="[
            'mt-2 text-xs font-quicksand whitespace-pre-wrap',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          {{ row.rendered_body }}
        </p>
      </div>
    </SettingsListGroup>

    <!-- Sign modal -->
    <div
      v-if="signingRow"
      class="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      @click.self="signingRow = null"
    >
      <div
        :class="[
          'w-full max-w-md rounded-xl p-4 shadow-xl',
          isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
        ]"
      >
        <h3 class="text-base font-semibold font-quicksand">Sign endorsement</h3>
        <p :class="[helper, 'mt-1 text-xs']">{{ signingRow.template_code }} · {{ signingRow.title }}</p>
        <p
          :class="[
            'mt-3 max-h-48 overflow-y-auto rounded border p-3 text-xs whitespace-pre-wrap',
            isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50',
          ]"
        >
          {{ signingRow.rendered_body }}
        </p>
        <div class="mt-3">
          <SettingsField label="Signing PIN" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input
                v-model="signPin"
                type="password"
                autocomplete="off"
                inputmode="numeric"
                :class="inputClass"
                :disabled="isBusy"
                @keydown.enter.prevent="onConfirmSign"
              />
            </template>
          </SettingsField>
        </div>
        <div class="mt-4 flex gap-2">
          <button type="button" :class="[btnSecondary, 'flex-1']" :disabled="isBusy" @click="signingRow = null">
            Cancel
          </button>
          <button type="button" :class="[btnPrimary, 'flex-1']" :disabled="isBusy || signPin.trim().length < 4" @click="onConfirmSign">
            {{ isBusy ? 'Signing…' : 'Sign' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsField from '../SettingsField.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import { useEndorsements, type EndorsementRow } from '~/composables/useEndorsements'
import { useRoster, type RosterRelationship } from '~/composables/useRoster'
import { useToast } from '~/composables/useToast'
import {
  ENDORSEMENT_CATALOG,
  ENDORSEMENT_CATEGORIES,
  getEndorsementTemplate,
  placeholderLabel,
  renderEndorsementBody,
} from '~/utils/endorsementCatalog'
import { formatEndorsementSignatureBlock } from '~/utils/endorsementSignature'
import type { PilotAccountRole } from './SettingsProfileTab.vue'

const props = defineProps<{
  isDarkMode: boolean
  role: PilotAccountRole
  isActive?: boolean
}>()

const { helper, btnPrimary, btnSecondary, destructiveRow } = useSettingsClasses(
  computed(() => props.isDarkMode)
)
const { showToast } = useToast()
const {
  asStudent,
  asInstructor,
  pendingForInstructor,
  isLoading,
  fetchMyEndorsements,
  fetchInstructorEndorsements,
  requestEndorsement,
  issueEndorsement,
  signEndorsement,
  cancelEndorsement,
} = useEndorsements()
const {
  instructors,
  roster,
  fetchInstructors,
  fetchStudentRoster,
} = useRoster()

const composeMode = ref<'request' | 'issue'>('request')
const counterpartyId = ref('')
const categoryFilter = ref('')
const templateSearch = ref('')
const selectedCode = ref('')
const fieldValues = reactive<Record<string, string>>({})
const signingRow = ref<EndorsementRow | null>(null)
const signPin = ref('')

const isInstructorRole = computed(
  () => props.role === 'INSTRUCTOR' || props.role === 'DUAL'
)

const isBusy = computed(() => isLoading.value)

const signedByMe = computed(() =>
  asInstructor.value
    .filter((e) => e.status === 'signed')
    .slice()
    .sort((a, b) => String(b.signed_at || '').localeCompare(String(a.signed_at || '')))
)

const counterparties = computed(() => {
  if (composeMode.value === 'issue') {
    return roster.value.filter((r) => r.status === 'ACTIVE')
  }
  return instructors.value.filter((r) => r.status === 'ACTIVE')
})

const selectedTemplate = computed(() =>
  selectedCode.value ? getEndorsementTemplate(selectedCode.value) : undefined
)

const filteredTemplates = computed(() => {
  const q = templateSearch.value.trim().toLowerCase()
  return ENDORSEMENT_CATALOG.filter((t) => {
    if (categoryFilter.value && t.category !== categoryFilter.value) return false
    if (!q) return true
    return (
      t.code.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.regulationRefs.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    )
  })
})

const previewBody = computed(() => {
  if (!selectedTemplate.value) return ''
  return renderEndorsementBody(selectedTemplate.value.body, { ...fieldValues })
})

const canSubmit = computed(() => {
  if (!counterpartyId.value || !selectedTemplate.value) return false
  return !selectedTemplate.value.placeholders.some((k) => !(fieldValues[k] || '').trim())
})

watch(
  () => props.isActive,
  async (active) => {
    if (!active) return
    await refreshAll()
  },
  { immediate: true }
)

watch(selectedCode, (code) => {
  Object.keys(fieldValues).forEach((k) => delete fieldValues[k])
  const t = code ? getEndorsementTemplate(code) : undefined
  if (t) {
    for (const key of t.placeholders) {
      fieldValues[key] = key === 'he_or_she' || key === 'him_or_her' ? 'they' : ''
    }
  }
})

watch(composeMode, () => {
  counterpartyId.value = ''
})

async function refreshAll() {
  await fetchInstructors()
  await fetchMyEndorsements()
  if (isInstructorRole.value) {
    await fetchStudentRoster()
    await fetchInstructorEndorsements()
  }
}

function displayName(row: RosterRelationship): string {
  return row.profile?.full_name?.trim() || 'Unnamed pilot'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso.slice(0, 10)
  }
}

function isExpired(row: EndorsementRow): boolean {
  if (!row.expires_at) return false
  return new Date(row.expires_at).getTime() < Date.now()
}

function statusLabel(row: EndorsementRow): string {
  if (row.status === 'signed' && isExpired(row)) return 'SIGNED (expired)'
  return row.status.toUpperCase()
}

function statusBadgeClass(row: EndorsementRow): string {
  if (row.status === 'signed') {
    if (isExpired(row)) {
      return props.isDarkMode
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-amber-100 text-amber-800'
    }
    return props.isDarkMode
      ? 'bg-green-500/20 text-green-300'
      : 'bg-green-100 text-green-700'
  }
  if (row.status === 'pending' || row.status === 'draft') {
    return props.isDarkMode
      ? 'bg-blue-500/20 text-blue-300'
      : 'bg-blue-100 text-blue-700'
  }
  return props.isDarkMode
    ? 'bg-gray-500/20 text-gray-300'
    : 'bg-gray-100 text-gray-600'
}

async function onSubmitCompose() {
  if (!selectedTemplate.value || !counterpartyId.value) return
  const input = {
    counterpartyId: counterpartyId.value,
    template: selectedTemplate.value,
    fieldValues: { ...fieldValues },
  }
  const result =
    composeMode.value === 'issue'
      ? await issueEndorsement(input)
      : await requestEndorsement(input)
  if (!result.success) {
    showToast(result.error)
    return
  }
  showToast(composeMode.value === 'issue' ? 'Draft endorsement created' : 'Endorsement requested')
  selectedCode.value = ''
  counterpartyId.value = ''
  if (composeMode.value === 'issue' && result.data) {
    const row = pendingForInstructor.value.find((e) => e.id === result.data)
    if (row) openSign(row)
  }
}

function openSign(row: EndorsementRow) {
  signingRow.value = row
  signPin.value = ''
}

async function onConfirmSign() {
  if (!signingRow.value) return
  const result = await signEndorsement(signingRow.value.id, signPin.value)
  if (!result.success) {
    showToast(result.error)
    return
  }
  showToast('Endorsement signed')
  signingRow.value = null
  signPin.value = ''
  await fetchMyEndorsements()
}

async function onCancel(id: string) {
  const result = await cancelEndorsement(id)
  if (!result.success) {
    showToast(result.error)
    return
  }
  showToast('Endorsement cancelled')
}
</script>
