<template>
  <!-- Modal version -->
  <div
    v-if="isOpen && !isSidebar"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="close"
  >
    <div
      :class="[
        'relative w-full max-w-4xl max-h-[90vh] rounded-xl border shadow-2xl flex flex-col',
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-300'
      ]"
    >
      <!-- Header -->
      <div
        :class="[
          'flex items-center justify-between p-6 border-b',
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        ]"
      >
        <div>
          <h2 :class="['text-xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Audit Trail
          </h2>
          <p :class="['text-sm mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            History of changes for this entry
          </p>
        </div>
        <button
          @click="close"
          :class="[
            'p-2 rounded-lg transition-colors',
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="24" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <Icon name="ri:loader-4-line" size="32" class="animate-spin" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
        </div>

        <div v-else-if="error" :class="['p-4 rounded-lg', isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200']">
          <p :class="['text-sm font-quicksand', isDarkMode ? 'text-red-300' : 'text-red-700']">
            {{ error }}
          </p>
        </div>

        <div v-else-if="auditLogs.length === 0" class="text-center py-12">
          <Icon 
            :name="isEntrySynced === false ? 'ri:cloud-off-line' : 'ri:history-line'" 
            size="48" 
            :class="['mx-auto mb-4', isDarkMode ? 'text-gray-600' : 'text-gray-400']" 
          />
          <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            <span v-if="isEntrySynced === false">
              This entry hasn't synced to the server yet. Audit history will appear after synchronization.
            </span>
            <span v-else>
              No audit history found for this entry
            </span>
          </p>
        </div>

        <div v-else class="space-y-4">
          <!-- Timeline -->
          <div class="relative">
            <div
              :class="[
                'absolute left-6 top-0 bottom-0 w-0.5',
                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              ]"
            ></div>

            <div
              v-for="(log, index) in auditLogs"
              :key="log.id"
              class="relative pl-16 pb-6"
            >
              <!-- Timeline dot -->
              <div
                :class="[
                  'absolute left-5 top-2 w-3 h-3 rounded-full border-2',
                  getActionColor(log.action),
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                ]"
              ></div>

              <!-- Log card -->
              <div
                :class="[
                  'rounded-lg border p-4',
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                ]"
              >
                <!-- Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'px-2 py-1 rounded text-xs font-semibold font-quicksand uppercase',
                        getActionBadgeColor(log.action)
                      ]"
                    >
                      {{ log.action }}
                    </span>
                    <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      {{ log.relativeTime }}
                    </span>
                  </div>
                  <button
                    v-if="canRestoreVersion(log, index)"
                    @click="handleRestore(log)"
                    :class="[
                      'px-3 py-1 text-xs rounded-lg font-quicksand transition-colors',
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    ]"
                  >
                    Restore to this version
                  </button>
                </div>

                <!-- Summary -->
                <p :class="['text-sm font-quicksand mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ log.change_summary || `${log.action} operation` }}
                </p>

                <!-- Timestamp -->
                <p :class="['text-xs font-quicksand mb-3', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ log.displayTime }}
                </p>

                <!-- Changed fields -->
                <div v-if="log.changed_fields && log.changed_fields.length > 0" class="mt-4">
                  <p :class="['text-xs font-semibold uppercase tracking-wide mb-2 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Changed Fields ({{ log.changed_fields.length }})
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="diff in getFieldDiffs(log)"
                      :key="diff.field"
                      :class="[
                        'rounded-lg p-3 text-sm',
                        isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                      ]"
                    >
                      <div class="font-semibold font-quicksand mb-2" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                        {{ formatFieldName(diff.field) }}
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <!-- Old value -->
                        <div>
                          <div :class="['text-xs font-semibold mb-1 font-quicksand', isDarkMode ? 'text-red-400' : 'text-red-600']">
                            Before
                          </div>
                          <div
                            :class="[
                              'p-2 rounded text-xs font-mono break-words',
                              isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                            ]"
                          >
                            <span v-if="diff.oldValue === null || diff.oldValue === undefined" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
                              (empty)
                            </span>
                            <span v-else>{{ formatValue(diff.oldValue) }}</span>
                          </div>
                        </div>
                        <!-- New value -->
                        <div>
                          <div :class="['text-xs font-semibold mb-1 font-quicksand', isDarkMode ? 'text-green-400' : 'text-green-600']">
                            After
                          </div>
                          <div
                            :class="[
                              'p-2 rounded text-xs font-mono break-words',
                              isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                            ]"
                          >
                            <span v-if="diff.newValue === null || diff.newValue === undefined" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
                              (empty)
                            </span>
                            <span v-else>{{ formatValue(diff.newValue) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Full data for create/delete actions -->
                <div v-else-if="log.action === 'create' && log.new_data" class="mt-4">
                  <details class="cursor-pointer">
                    <summary :class="['text-xs font-semibold uppercase tracking-wide font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      View full entry data
                    </summary>
                    <pre
                      :class="[
                        'mt-2 p-3 rounded text-xs font-mono overflow-x-auto',
                        isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                      ]"
                    >{{ JSON.stringify(log.new_data, null, 2) }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        :class="[
          'flex items-center justify-end gap-3 p-6 border-t',
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        ]"
      >
        <button
          @click="close"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          ]"
        >
          Close
        </button>
      </div>
    </div>
  </div>

  <!-- Sidebar version -->
  <div
    v-if="isOpen && isSidebar"
    class="h-full flex flex-col"
  >
    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Entry Metadata (Import Info & Integrity) -->
      <div v-if="entryMetadata" class="mb-4 space-y-3">
        <!-- Import Source Info -->
        <div v-if="entryMetadata.isImported" class="p-3 rounded border" :class="[isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200']">
          <div class="flex items-center gap-2 mb-1">
            <Icon name="ri:download-line" size="16" :class="[isDarkMode ? 'text-blue-400' : 'text-blue-600']" />
            <span :class="['text-xs font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-700']">Imported Entry</span>
          </div>
          <div class="text-xs space-y-1" :class="[isDarkMode ? 'text-blue-200' : 'text-blue-600']">
            <div v-if="entryMetadata.importSource">
              <span class="font-medium">Source:</span> {{ entryMetadata.importSource.toUpperCase() }}
            </div>
            <div v-if="entryMetadata.importMetadata?.fileName">
              <span class="font-medium">File:</span> {{ entryMetadata.importMetadata.fileName }}
            </div>
            <div v-if="entryMetadata.originalEntryDate">
              <span class="font-medium">Original Date:</span> {{ formatDisplayDate(entryMetadata.originalEntryDate) }}
            </div>
          </div>
        </div>

        <!-- Data Integrity Status -->
        <div class="p-3 rounded border" :class="[isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-300']">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="ri:shield-check-line" size="16" :class="[isDarkMode ? 'text-blue-400' : 'text-blue-600']" />
              <span :class="['text-xs font-semibold', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Data Integrity</span>
            </div>
            <IntegrityStatus
              v-if="entryId"
              :entry-id="entryId"
              :is-dark-mode="isDarkMode"
              :auto-validate="false"
              :local-entry="localEntry"
            />
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Icon name="ri:loader-4-line" size="32" class="animate-spin" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
      </div>

      <div v-else-if="error" :class="['p-4 rounded-lg', isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200']">
        <p :class="['text-sm font-quicksand', isDarkMode ? 'text-red-300' : 'text-red-700']">
          {{ error }}
        </p>
      </div>

      <div v-else-if="auditLogs.length === 0" class="text-center py-12">
        <Icon 
          :name="isEntrySynced === false ? 'ri:cloud-off-line' : 'ri:history-line'" 
          size="48" 
          :class="['mx-auto mb-4', isDarkMode ? 'text-gray-600' : 'text-gray-400']" 
        />
        <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          <span v-if="isEntrySynced === false">
            This entry hasn't synced to the server yet. Audit history will appear after synchronization.
          </span>
          <span v-else>
            No audit history found for this entry
          </span>
        </p>
      </div>

      <div v-else class="space-y-4">
        <!-- Timeline -->
        <div class="relative">
          <div
            :class="[
              'absolute left-6 top-0 bottom-0 w-0.5',
              isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
            ]"
          ></div>

          <div
            v-for="(log, index) in filteredAuditLogs"
            :key="log.id"
            class="relative pl-16 pb-6"
          >
            <!-- Timeline dot -->
            <div
              :class="[
                'absolute left-5 top-2 w-3 h-3 rounded-full border-2',
                getActionColor(log.action),
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              ]"
            ></div>

            <!-- Log card -->
            <div
              :class="[
                'rounded-lg border p-4',
                isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
              ]"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'px-2 py-1 rounded text-xs font-semibold font-quicksand uppercase',
                      getActionBadgeColor(log.action)
                    ]"
                  >
                    {{ log.action }}
                  </span>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ log.relativeTime }}
                  </span>
                </div>
                <button
                  v-if="canRestoreVersion(log, index)"
                  @click="handleRestore(log)"
                  :class="[
                    'px-3 py-1 text-xs rounded-lg font-quicksand transition-colors',
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  ]"
                >
                  Restore
                </button>
              </div>

              <!-- Summary -->
              <p :class="['text-sm font-quicksand mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ log.change_summary || `${log.action} operation` }}
              </p>

              <!-- Timestamp -->
              <p :class="['text-xs font-quicksand mb-3', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ log.displayTime }}
              </p>

              <!-- Changed fields (only show for update actions, not create/delete) -->
              <div v-if="log.action === 'update' && log.changed_fields && log.changed_fields.length > 0" class="mt-4">
                <p :class="['text-xs font-semibold uppercase tracking-wide mb-2 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Changed Fields ({{ log.changed_fields.length }})
                </p>
                <div class="space-y-2">
                  <div
                    v-for="diff in getFieldDiffs(log)"
                    :key="diff.field"
                    :class="[
                      'rounded-lg p-3 text-sm',
                      isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                    ]"
                  >
                    <div class="font-semibold font-quicksand mb-2" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                      {{ formatFieldName(diff.field) }}
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <!-- Old value -->
                      <div>
                        <div :class="['text-xs font-semibold mb-1 font-quicksand', isDarkMode ? 'text-red-400' : 'text-red-600']">
                          Before
                        </div>
                        <div
                          :class="[
                            'p-2 rounded text-xs font-mono break-words',
                            isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                          ]"
                        >
                          <span v-if="diff.oldValue === null || diff.oldValue === undefined" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
                            (empty)
                          </span>
                          <span v-else>{{ formatValue(diff.oldValue) }}</span>
                        </div>
                      </div>
                      <!-- New value -->
                      <div>
                        <div :class="['text-xs font-semibold mb-1 font-quicksand', isDarkMode ? 'text-green-400' : 'text-green-600']">
                          After
                        </div>
                        <div
                          :class="[
                            'p-2 rounded text-xs font-mono break-words',
                            isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                          ]"
                        >
                          <span v-if="diff.newValue === null || diff.newValue === undefined" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
                            (empty)
                          </span>
                          <span v-else>{{ formatValue(diff.newValue) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Summary for create/delete actions (hide detailed diff) -->
              <div v-if="(log.action === 'create' || log.action === 'delete') && log.change_summary" class="mt-3">
                <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ log.change_summary }}
                </p>
              </div>

              <!-- Validation details (shown for export actions with validation_result) -->
              <div v-if="log.action === 'export' && log.is_compliance_event && log.new_data?.validation_result" class="mt-4">
                <div :class="['rounded-lg p-3', isDarkMode ? 'bg-gray-800/50' : 'bg-white']">
                  <p :class="['text-xs font-semibold uppercase tracking-wide mb-2 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Validation Details
                  </p>
                  <div class="space-y-2 text-xs">
                    <div class="flex items-center gap-2">
                      <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Status:</span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded font-semibold',
                          log.new_data.validation_result.is_valid
                            ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                            : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                        ]"
                      >
                        {{ log.new_data.validation_result.is_valid ? 'Valid' : 'Invalid' }}
                      </span>
                    </div>
                    <div v-if="log.new_data.validation_result.current_hash" class="space-y-1">
                      <div>
                        <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Stored Hash:</span>
                        <div :class="['mt-1 p-2 rounded font-mono text-[10px] break-all', isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600']">
                          {{ log.new_data.validation_result.current_hash }}
                        </div>
                      </div>
                      <div>
                        <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Computed Hash:</span>
                        <div :class="['mt-1 p-2 rounded font-mono text-[10px] break-all', isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600']">
                          {{ log.new_data.validation_result.computed_hash }}
                        </div>
                      </div>
                      <div v-if="log.new_data.validation_result.hash_match !== undefined" class="flex items-center gap-2">
                        <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Hashes Match:</span>
                        <span
                          :class="[
                            'px-2 py-0.5 rounded font-semibold',
                            log.new_data.validation_result.hash_match
                              ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                              : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                          ]"
                        >
                          {{ log.new_data.validation_result.hash_match ? 'Yes' : 'No' }}
                        </span>
                      </div>
                    </div>
                    <div v-if="log.new_data.validation_result.validated_at" class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                      Validated: {{ new Date(log.new_data.validation_result.validated_at).toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Full data for create/delete actions -->
              <div v-else-if="log.action === 'create' && log.new_data" class="mt-4">
                <details class="cursor-pointer">
                  <summary :class="['text-xs font-semibold uppercase tracking-wide font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    View full entry data
                  </summary>
                  <pre
                    :class="[
                      'mt-2 p-3 rounded text-xs font-mono overflow-x-auto',
                      isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                    ]"
                  >{{ JSON.stringify(log.new_data, null, 2) }}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Restore confirmation dialog -->
  <div
    v-if="showRestoreConfirm"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
    @click.self="showRestoreConfirm = false"
  >
      <div
        :class="[
          'rounded-lg border p-6 max-w-md',
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
        ]"
      >
        <h3 :class="['text-lg font-bold font-quicksand mb-2', isDarkMode ? 'text-white' : 'text-gray-900']">
          Restore to this version?
        </h3>
        <p :class="['text-sm font-quicksand mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
          This will restore the entry to the selected version. A new audit log entry will be created to track this restore operation.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            @click="showRestoreConfirm = false"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            ]"
          >
            Cancel
          </button>
          <button
            @click="confirmRestore"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            ]"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuditTrail, type AuditLogWithDisplay } from '~/composables/useAuditTrail'
import { useDataIntegrity } from '~/composables/useDataIntegrity'
import { supabase } from '~/lib/supabase'
import IntegrityStatus from '~/components/IntegrityStatus.vue'

interface Props {
  isOpen: boolean
  entryId: string | null
  isDarkMode?: boolean
  isSidebar?: boolean
  localEntry?: any // Optional local entry data to help find UUID
}

const props = withDefaults(defineProps<Props>(), {
  isDarkMode: false,
  isSidebar: false,
  localEntry: undefined
})

const emit = defineEmits<{
  close: []
  restored: [entryId: string]
}>()

const {
  auditLogs,
  entryRevisions,
  isLoading,
  error,
  isEntrySynced,
  getAuditLogs,
  getEntryRevisions,
  restoreRevision,
  getFieldDiff
} = useAuditTrail()

// Add validation composable
const { validateEntry: validateEntryIntegrity } = useDataIntegrity()

const entryMetadata = ref<{
  isImported: boolean
  importSource: string | null
  importMetadata: any
  originalEntryDate: string | null
} | null>(null)

const showRestoreConfirm = ref(false)
const pendingRestore = ref<{ entryId: string; version: number; log: AuditLogWithDisplay } | null>(null)

// Load audit logs, revisions, and entry metadata when modal opens or entryId changes
watch(() => [props.isOpen, props.entryId, props.localEntry], async ([isOpen, entryId, localEntry]) => {
  if (isOpen && entryId && typeof entryId === 'string') {
    console.log('[AuditTrail] Loading audit logs for entry:', entryId)
    await getAuditLogs(entryId, localEntry)
    await getEntryRevisions(entryId, localEntry)
    
    // Validate entry integrity when audit log is opened (silently, no audit log)
    validateEntryIntegrity(entryId, false, localEntry).catch((err: any) => {
      console.warn(`[AuditTrail] Failed to validate entry ${entryId}:`, err)
    })
    
    // Load entry metadata for import info
    // Try to find UUID if entryId is not a UUID
    try {
      let supabaseId = entryId
      
      // If entryId is not a UUID, try to find it
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entryId) && localEntry) {
        const { data: matchingEntries } = await (supabase
          .from('log_entries') as any)
          .select('id')
          .eq('date', localEntry.date)
          .eq('registration', localEntry.registration)
          .eq('departure', localEntry.departure)
          .eq('destination', localEntry.destination)
          .limit(1)
        
        if (matchingEntries && matchingEntries.length > 0) {
          supabaseId = matchingEntries[0].id
        } else {
          // Entry doesn't exist in Supabase yet, skip metadata loading
          return
        }
      }
      
      // Use .maybeSingle() instead of .single() to avoid errors when entry doesn't exist
      const { data, error: metadataError } = await (supabase
        .from('log_entries') as any)
        .select('is_imported, import_source, import_metadata, original_entry_date')
        .eq('id', supabaseId)
        .maybeSingle()
      
      // Handle case where entry doesn't exist in Supabase yet
      if (metadataError) {
        // 406 (Not Acceptable) or 404 (Not Found) means entry doesn't exist in Supabase yet
        // This is expected for entries that haven't synced yet
        if (metadataError.code === 'PGRST116' || metadataError.code === '22P02' || metadataError.status === 406 || metadataError.status === 404) {
          // Entry not synced yet - this is normal, don't log as error
          return
        }
        // Other errors should be logged
        console.warn('[AuditTrail] Failed to load entry metadata:', metadataError)
        return
      }
      
      if (data) {
        entryMetadata.value = {
          isImported: data.is_imported || false,
          importSource: data.import_source,
          importMetadata: data.import_metadata,
          originalEntryDate: data.original_entry_date
        }
      } else {
        // Entry doesn't exist in Supabase yet (not synced) - this is normal
        // Don't log as error since this is expected for new entries
      }
    } catch (err) {
      // Only log unexpected errors (entry not found is expected for unsynced entries)
      const error = err as any
      if (error?.code !== 'PGRST116' && error?.code !== '22P02' && error?.status !== 406 && error?.status !== 404) {
        console.warn('[AuditTrail] Failed to load entry metadata:', err)
      }
    }
  }
}, { immediate: true })

// Get field diffs for display
const getFieldDiffs = (log: AuditLogWithDisplay) => {
  return getFieldDiff(log.old_data, log.new_data, log.changed_fields || [])
}

// Format field name for display
const formatFieldName = (field: string) => {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Format value for display
const formatValue = (value: any) => {
  if (value === null || value === undefined) {
    return '(empty)'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

// Get action badge color
const getActionBadgeColor = (action: string) => {
  const colors: Record<string, string> = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    restore: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    sign: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    export: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  }
  return colors[action] || colors.update
}

// Get action timeline dot color
const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    create: 'bg-green-500 border-green-500',
    update: 'bg-blue-500 border-blue-500',
    delete: 'bg-red-500 border-red-500',
    restore: 'bg-purple-500 border-purple-500',
    sign: 'bg-indigo-500 border-indigo-500',
    export: 'bg-amber-500 border-amber-500'
  }
  return colors[action] || colors.update
}

const close = () => {
  emit('close')
}

const confirmRestore = async () => {
  if (!pendingRestore.value) return

  const { entryId, version } = pendingRestore.value
  const result = await restoreRevision(entryId, version, props.localEntry)

  showRestoreConfirm.value = false
  pendingRestore.value = null

  if (result.success) {
    emit('restored', entryId)
    // Reload audit logs and revisions
    await Promise.all([
      getAuditLogs(entryId, props.localEntry),
      getEntryRevisions(entryId, props.localEntry)
    ])
  } else {
    alert(`Failed to restore: ${result.error}`)
  }
}

// Check if we can restore to this version
const canRestoreVersion = (log: AuditLogWithDisplay, index: number) => {
  // Can restore if:
  // 1. It's an update action with old_data
  // 2. There's a revision available for this version
  // 3. It's not the most recent entry (can't restore to current)
  if (log.action !== 'update' || index === 0 || !log.old_data) {
    return false
  }
  
  // Get the version from old_data (entries have a version field)
  const version = log.old_data.version as number | undefined
  if (!version) return false
  
  // Check if we have a revision for this version
  const revision = entryRevisions.value.find(rev => rev.version === version)
  return !!revision
}

// Get version number from log's old_data
const getVersionForLog = (log: AuditLogWithDisplay): number | null => {
  if (!log.old_data) return null
  
  // The old_data should contain the version field
  const version = log.old_data.version as number | undefined
  return version || null
}

const handleRestore = (log: AuditLogWithDisplay) => {
  const version = getVersionForLog(log)
  if (!version || !props.entryId) return
  
  pendingRestore.value = { entryId: props.entryId, version, log }
  showRestoreConfirm.value = true
}

// Filter audit logs to show only the most recent validation log
const filteredAuditLogs = computed(() => {
  const logs = auditLogs.value
  const filtered: AuditLogWithDisplay[] = []
  let mostRecentValidation: AuditLogWithDisplay | null = null
  
  // Separate validation logs from other logs
  const validationLogs: AuditLogWithDisplay[] = []
  const otherLogs: AuditLogWithDisplay[] = []
  
  for (const log of logs) {
    // For validation logs (export action with compliance event)
    if (log.action === 'export' && log.is_compliance_event && log.new_data?.validation_result) {
      validationLogs.push(log)
    } else {
      // Keep all non-validation logs
      otherLogs.push(log)
    }
  }
  
  // Find the most recent validation log (logs are already sorted by timestamp desc)
  if (validationLogs.length > 0) {
    mostRecentValidation = validationLogs[0]
  }
  
  // Build the filtered list: insert most recent validation at appropriate position
  // We want it to appear right after the create log (if exists), or at the top
  for (const log of otherLogs) {
    filtered.push(log)
    
    // If this is the create log, insert the validation right after it
    if (log.action === 'create' && mostRecentValidation) {
      filtered.push(mostRecentValidation)
      mostRecentValidation = null // Mark as inserted so we don't add it again
    }
  }
  
  // If we haven't inserted the validation yet (no create log), add it at the top
  if (mostRecentValidation) {
    filtered.unshift(mostRecentValidation)
  }
  
  return filtered
})

// Format date for display (helper function)
const formatDisplayDate = (date: string | null | undefined) => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

