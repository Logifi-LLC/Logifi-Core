<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { apiFetch } from '~/utils/apiFetch'
import {
  buildFcvImportRequestPayload,
  countUnresolvedDuplicateActions,
  defaultSelectedFcvFlightIds,
  omitAlreadyInLogbookPreviewFlights,
  type FcvFlightAction,
} from '~/utils/fcvImportPayload'
import {
  applySeatToFlightTime,
  formatListedCrewHint,
  isOwnRoleUnmatchedMetadata,
  parseAirlineOwnSeat,
  pickOppositeCrew,
  type AirlineOwnSeat,
  type ListedCrewMember,
  type OwnRoleUnmatchedReason,
} from '../../../shared/airlineOwnRole'
import {
  catalogContainsPersonName,
} from '../../../shared/catalogPersonNames'
import { applyCatalogFamilyToFcvPreview } from '../../../shared/aircraftTailIndex'
import { OOOI_FIELD_ORDER } from '~/utils/logbookTypes'

/** Must match dashboard theme; avoid `dark:` here so OS dark mode does not fight white settings cards. */
const props = withDefaults(
  defineProps<{
    isDarkMode: boolean
    mode?: 'connect' | 'fetch' | 'full'
    /** @deprecated No longer shown; kept for call-site compatibility. */
    showRolloutLabel?: boolean
    /** Sync local logbook to server before duplicate check (e.g. process queue + reload). */
    beforeDuplicateCheck?: () => Promise<void>
    /** Unsynced entries on this device; shown as a warning before schedule import. */
    pendingSyncCount?: number
    /** Mobile / iOS sheet: primary "Import new flights" CTA, collapsible date range, fullscreen preview. */
    compact?: boolean
    /** Full pilot catalog display names for crew pickers during import preview. */
    catalogPersonNames?: string[]
    /**
     * Normalized tail → catalog family (mode make/model). Known N-numbers in
     * preview use this family instead of the vendor aircraft string.
     */
    tailCatalogFamilyByTail?: Record<string, string>
    /**
     * Parent knows FLICA is connected (e.g. dashboard after Settings connect).
     * Triggers a status refresh so fetch-mode instances pick up the connection.
     */
    externalConnected?: boolean
  }>(),
  {
    mode: 'full',
    showRolloutLabel: false,
    pendingSyncCount: 0,
    compact: false,
    catalogPersonNames: () => [],
    tailCatalogFamilyByTail: () => ({}),
    externalConnected: undefined,
  }
)
const emit = defineEmits<{
  imported: [{ imported: number; linked: number; skipped: number; importBatchId?: string }]
  'connection-changed': [{ connected: boolean }]
}>()

interface FcvMappedEntry {
  fcv_flight_id: string
  date: string
  role: string
  aircraft_category_class: string
  aircraft_make_model: string
  registration: string
  flight_number: string | null
  departure: string
  destination: string
  flight_time: Record<string, unknown>
  [key: string]: unknown
}

interface EnrichmentApproach {
  type: string
  count: number | null
}

interface FlightEnrichment {
  userFlewLeg: boolean
  actualInstrument: number | null
  simulatedInstrument: number | null
  holdingProcedures: number | null
  approaches: EnrichmentApproach[]
  remarks: string
}

interface CrewReviewCandidate {
  fcv_flight_id: string
  raw_name: string
  normalized_key: string
  suggested_name: string | null
  candidates: string[]
  strategy: 'ambiguous' | 'unresolved'
}

type CrewOverrideMode = 'pick' | 'rename' | 'asis'

interface HeuristicMatchInfo {
  index: number
  fcvFlightId: string
  existingEntryId: string
  date: string
  registration: string
  departure: string
  destination: string
  flightTimeTotal: number | null
  isImported: boolean
  importSource: string | null
}

const { session, isAuthenticated } = useAuth()

const pendingSyncCount = computed(() => Math.max(0, props.pendingSyncCount ?? 0))

const connected = ref<boolean>(false)
const flicaUsername = ref<string | null>(null)
const connectingFlica = ref(false)
const flicaUserIdInput = ref('')
const flicaPasswordInput = ref('')
const loadingStatus = ref(false)
const disconnecting = ref(false)
const loadingFetch = ref(false)
const loadingSinceLast = ref(false)
const loadingImport = ref(false)
const syncingLogbook = ref(false)
const error = ref<string | null>(null)

const dateFrom = ref('')
const dateTo = ref('')
const includeDeadheads = ref(false)
const includeScheduled = ref(false)
const showAdvancedDateRange = ref(false)

const previewFlights = ref<FcvMappedEntry[]>([])
const showPreviewModal = ref(false)
/** Server-side note when fetch returned 0 (or filtered everything). */
const fetchWarning = ref<string | null>(null)
const enrichAttempted = ref(0)
const enrichCount = ref(0)
const enrichDetail = ref<string | null>(null)
/** Heuristic match (date/tail/route/OOOI) — not already stored by external flight id. */
const heuristicDuplicateIndices = ref<Set<number>>(new Set())
/** Exact external flight id already present in logbook (import would skip). */
const alreadyImportedIndices = ref<Set<number>>(new Set())
const includeDuplicatesInImport = ref(false)
const includeAlreadyImportedInImport = ref(false)
const heuristicMatches = ref<HeuristicMatchInfo[]>([])
const flightRowActions = ref<Record<string, FcvFlightAction>>({})
/** Per-row include in import, keyed by external flight id. */
const selectedFcvFlightIds = ref<Set<string>>(new Set())
/** When "Since last entry" hid rows that are already in the logbook. */
const sinceLastEntryOmittedAlreadyImported = ref(0)
const expandedEnrichmentRows = ref<Set<number>>(new Set())
const perFlightEnrichment = ref<Record<number, FlightEnrichment>>({})
const crewReviewCandidates = ref<CrewReviewCandidate[]>([])
/** Crew review state keyed by exact imported `raw_name` so rows with the same string stay in sync. */
const crewResolutionMode = ref<Record<string, CrewOverrideMode>>({})
const crewPickSelection = ref<Record<string, string>>({})
const crewRenameText = ref<Record<string, string>>({})
/** Editable other-pilot name per flight id in import preview. */
const perFlightCrewName = ref<Record<string, string>>({})
/** Full catalog from server when crew review is required (fallback path). */
const crewReviewCatalogNames = ref<string[]>([])
const activePilotPickerId = ref<string | null>(null)
const approachTypeOptions = ['ILS', 'LOC', 'RNAV', 'VOR', 'NDB', 'LDA', 'SDF', 'VISUAL']

function syncCrewReviewUiState(candidates: CrewReviewCandidate[]) {
  const rawNames = new Set<string>()
  for (const c of candidates) {
    const r = typeof c.raw_name === 'string' ? c.raw_name : ''
    if (r) rawNames.add(r)
  }
  for (const k of Object.keys(crewResolutionMode.value)) {
    if (!rawNames.has(k)) delete crewResolutionMode.value[k]
  }
  for (const k of Object.keys(crewPickSelection.value)) {
    if (!rawNames.has(k)) delete crewPickSelection.value[k]
  }
  for (const k of Object.keys(crewRenameText.value)) {
    if (!rawNames.has(k)) delete crewRenameText.value[k]
  }
  for (const r of rawNames) {
    if (!(r in crewResolutionMode.value)) crewResolutionMode.value[r] = 'pick'
    if (!(r in crewPickSelection.value)) crewPickSelection.value[r] = ''
    if (!(r in crewRenameText.value)) crewRenameText.value[r] = ''
  }
}

watch(crewReviewCandidates, (list) => syncCrewReviewUiState(list), { deep: true })

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const raw = typeof v === 'string' ? v.trim() : String(v)
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function toNullableInt(v: unknown): number | null {
  const n = toNullableNumber(v)
  if (n === null) return null
  return Math.round(n)
}

function defaultEnrichment(): FlightEnrichment {
  return {
    userFlewLeg: false,
    actualInstrument: null,
    simulatedInstrument: null,
    holdingProcedures: null,
    approaches: [],
    remarks: '',
  }
}

function getOrCreateEnrichment(index: number): FlightEnrichment {
  if (!perFlightEnrichment.value[index]) {
    perFlightEnrichment.value[index] = defaultEnrichment()
  }
  return perFlightEnrichment.value[index]
}

function toggleEnrichmentRow(index: number) {
  const next = new Set(expandedEnrichmentRows.value)
  if (next.has(index)) next.delete(index)
  else {
    next.add(index)
    getOrCreateEnrichment(index)
  }
  expandedEnrichmentRows.value = next
}

function isEnrichmentExpanded(index: number): boolean {
  return expandedEnrichmentRows.value.has(index)
}

function addApproach(index: number) {
  const e = getOrCreateEnrichment(index)
  e.approaches.push({ type: 'ILS', count: 1 })
}

function hasNightTime(f: FcvMappedEntry): boolean {
  const ft = (f.flight_time ?? {}) as { night?: unknown }
  return typeof ft.night === 'number' && Number.isFinite(ft.night) && ft.night > 0
}

function buildApproachesForPayload(
  approaches: EnrichmentApproach[]
): Array<{ type: string; count: number }> {
  return approaches
    .map((a) => ({
      type: typeof a.type === 'string' ? a.type.trim().toUpperCase() : '',
      count: toNullableInt(a.count) ?? 0,
    }))
    .filter((a) => a.type && a.count > 0)
}

function buildFlightForImport(f: FcvMappedEntry, idx: number): FcvMappedEntry {
  const enrichment = perFlightEnrichment.value[idx]
  if (!enrichment) return f

  const nextFlightTime = { ...((f.flight_time ?? {}) as Record<string, unknown>) }
  const nextPerformance = { ...((f.performance ?? {}) as Record<string, unknown>) }

  const actual = toNullableNumber(enrichment.actualInstrument)
  const sim = toNullableNumber(enrichment.simulatedInstrument)
  if (actual !== null) nextFlightTime.actualInstrument = actual
  if (sim !== null) nextFlightTime.simulatedInstrument = sim

  const holds = toNullableInt(enrichment.holdingProcedures)
  if (holds !== null) nextPerformance.holdingProcedures = holds

  const approaches = buildApproachesForPayload(enrichment.approaches)
  if (approaches.length > 0) nextPerformance.approaches = approaches

  if (enrichment.userFlewLeg) {
    if (hasNightTime(f)) nextPerformance.nightLandings = 1
    else nextPerformance.dayLandings = 1
  }

  return {
    ...f,
    flight_time: nextFlightTime,
    performance: nextPerformance,
    remarks: enrichment.remarks.trim() ? enrichment.remarks.trim() : (f.remarks as string | null),
  }
}

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
    const flica = await apiFetch<{
      connected: boolean
      username?: string
      airlineCode?: string
    }>('/api/flica/status', {
      headers: authHeaders(),
      query: { airlineCode: 'RJET' },
    })
    connected.value = !!flica.connected
    flicaUsername.value = flica.username ?? null
  } catch (e) {
    connected.value = false
    flicaUsername.value = null
    error.value = e instanceof Error ? e.message : 'Failed to check FLICA status'
  } finally {
    loadingStatus.value = false
  }
}

watch(
  () => props.externalConnected,
  (v) => {
    if (v === true && !connected.value && isAuthenticated.value) {
      void checkStatus()
    }
  }
)

async function connectFlica() {
  if (!isAuthenticated.value || connectingFlica.value) return
  const username = flicaUserIdInput.value.trim()
  const password = flicaPasswordInput.value
  if (!username || !password) {
    error.value = 'Enter your FLICA User ID and password.'
    return
  }
  connectingFlica.value = true
  error.value = null
  try {
    const data = await apiFetch<{
      success: boolean
      connected: boolean
      username?: string
    }>('/api/flica/connect', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: {
        username,
        password,
        airlineCode: 'RJET',
      },
    })
    connected.value = !!data?.connected || !!data?.success
    flicaUsername.value = data?.username ?? username
    flicaPasswordInput.value = ''
    emit('connection-changed', { connected: connected.value })
  } catch (e) {
    connected.value = false
    error.value = e instanceof Error ? e.message : 'Failed to connect FLICA'
  } finally {
    connectingFlica.value = false
  }
}

async function disconnectFlica() {
  if (!isAuthenticated.value || disconnecting.value) return
  disconnecting.value = true
  error.value = null
  try {
    await apiFetch<{ success: boolean }>('/api/flica/disconnect', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: { airlineCode: 'RJET' },
    })
    connected.value = false
    flicaUsername.value = null
    flicaUserIdInput.value = ''
    flicaPasswordInput.value = ''
    resetPreviewImportState()
    emit('connection-changed', { connected: false })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to disconnect FLICA'
  } finally {
    disconnecting.value = false
  }
}

type FcvDupCheckResponse = {
  duplicateFcvFlightIds: string[]
  duplicateIndices: number[]
  alreadyImportedIndices?: number[]
  heuristicDuplicateIndices?: number[]
  alreadyImportedFcvFlightIds?: string[]
  heuristicMatches?: HeuristicMatchInfo[]
}

const emptyDupResponse: FcvDupCheckResponse = {
  duplicateFcvFlightIds: [],
  duplicateIndices: [],
  alreadyImportedIndices: [],
  heuristicDuplicateIndices: [],
  alreadyImportedFcvFlightIds: [],
  heuristicMatches: [],
}

async function requestCheckDuplicates(flights: FcvMappedEntry[]): Promise<FcvDupCheckResponse> {
  if (props.beforeDuplicateCheck) {
    syncingLogbook.value = true
    try {
      await props.beforeDuplicateCheck()
    } finally {
      syncingLogbook.value = false
    }
  }
  return await apiFetch<FcvDupCheckResponse>('/api/fcv/check-duplicates', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: { flights },
  })
}

function applyDupCheckToState(dup: FcvDupCheckResponse) {
  const already = new Set(dup.alreadyImportedIndices ?? [])
  alreadyImportedIndices.value = already
  if (Array.isArray(dup.heuristicDuplicateIndices)) {
    heuristicDuplicateIndices.value = new Set(dup.heuristicDuplicateIndices)
  } else {
    const union = new Set(dup.duplicateIndices ?? [])
    heuristicDuplicateIndices.value =
      already.size > 0
        ? new Set([...union].filter((i) => !already.has(i)))
        : union
  }
  heuristicMatches.value = Array.isArray(dup.heuristicMatches) ? dup.heuristicMatches : []
  initSelectionFromPreview()
}

function fcvIdFromFlight(f: FcvMappedEntry): string {
  return String(f.fcv_flight_id ?? '').trim()
}

function initSelectionFromPreview() {
  selectedFcvFlightIds.value = defaultSelectedFcvFlightIds(
    previewFlights.value,
    heuristicDuplicateIndices.value,
    alreadyImportedIndices.value
  )
  initPerFlightCrewNames()
}

function rawCrewNameFromFlight(f: FcvMappedEntry): string {
  const nameRaw = f.training_elements
  return typeof nameRaw === 'string' ? nameRaw.trim() : ''
}

function initPerFlightCrewNames() {
  const next: Record<string, string> = { ...perFlightCrewName.value }
  for (const f of previewFlights.value) {
    const id = fcvIdFromFlight(f)
    if (!id || id in next) continue
    next[id] = rawCrewNameFromFlight(f)
  }
  perFlightCrewName.value = next
}

function getPerFlightCrewName(fcvFlightId: string): string {
  const id = fcvFlightId.trim()
  return id ? (perFlightCrewName.value[id] ?? '') : ''
}

function setPerFlightCrewName(fcvFlightId: string, value: string) {
  const id = fcvFlightId.trim()
  if (!id) return
  perFlightCrewName.value = { ...perFlightCrewName.value, [id]: value }
}

function openPilotPicker(fcvFlightId: string, event?: FocusEvent) {
  activePilotPickerId.value = fcvFlightId.trim() || null
  if (!props.compact) return
  const target = event?.target
  if (!(target instanceof HTMLElement)) return
  void nextTick(() => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function closePilotPickerSoon() {
  window.setTimeout(() => {
    activePilotPickerId.value = null
  }, 150)
}

function selectPilotFromCatalog(fcvFlightId: string, name: string) {
  setPerFlightCrewName(fcvFlightId, name)
  activePilotPickerId.value = null
}

const fullCatalogPersonNames = computed(() => {
  const merged = new Set<string>()
  for (const name of props.catalogPersonNames ?? []) {
    const trimmed = name.trim()
    if (trimmed) merged.add(trimmed)
  }
  for (const name of crewReviewCatalogNames.value) {
    const trimmed = name.trim()
    if (trimmed) merged.add(trimmed)
  }
  return [...merged].sort((a, b) => a.localeCompare(b))
})

function filteredPilotSuggestions(query: string): string[] {
  const q = query.trim().toLowerCase()
  const names = fullCatalogPersonNames.value
  if (!q) return names.slice(0, 40)
  return names.filter((n) => n.toLowerCase().includes(q)).slice(0, 40)
}

function resolveCrewOverrideMode(editedName: string, rawName: string): CrewOverrideMode {
  if (!editedName) return 'asis'
  if (!rawName || editedName === rawName) return 'asis'
  if (catalogContainsPersonName(fullCatalogPersonNames.value, editedName)) return 'pick'
  return 'rename'
}

function resetPreviewImportState() {
  showPreviewModal.value = false
  fetchWarning.value = null
  enrichAttempted.value = 0
  enrichCount.value = 0
  enrichDetail.value = null
  previewFlights.value = []
  sinceLastEntryOmittedAlreadyImported.value = 0
  heuristicDuplicateIndices.value = new Set()
  alreadyImportedIndices.value = new Set()
  heuristicMatches.value = []
  flightRowActions.value = {}
  selectedFcvFlightIds.value = new Set()
  includeDuplicatesInImport.value = false
  includeAlreadyImportedInImport.value = false
  perFlightEnrichment.value = {}
  expandedEnrichmentRows.value = new Set()
  perFlightCrewName.value = {}
  crewReviewCandidates.value = []
  crewReviewCatalogNames.value = []
  crewResolutionMode.value = {}
  crewPickSelection.value = {}
  crewRenameText.value = {}
  activePilotPickerId.value = null
}

function buildCrewOverridePayloads(): {
  crewNameOverrides: Record<string, string>
  crewOverrideModes: Record<string, CrewOverrideMode>
} {
  const crewNameOverrides: Record<string, string> = {}
  const crewOverrideModes: Record<string, CrewOverrideMode> = {}

  for (const { flight } of flightsToImportWithIndex.value) {
    const fcvId = fcvIdFromFlight(flight)
    if (!fcvId) continue
    const raw = rawCrewNameFromFlight(flight)
    const edited = getPerFlightCrewName(fcvId).trim()
    const name = edited || raw
    if (!name) continue
    crewNameOverrides[fcvId] = name
    crewOverrideModes[fcvId] = resolveCrewOverrideMode(name, raw)
  }

  for (const c of crewReviewCandidates.value) {
    const id = c.fcv_flight_id
    const rawKey = c.raw_name
    const mode = crewResolutionMode.value[rawKey] ?? 'pick'
    let name = ''
    if (mode === 'pick') {
      name = (crewPickSelection.value[rawKey] ?? '').trim()
    } else if (mode === 'rename') {
      name = (crewRenameText.value[rawKey] ?? '').trim()
    } else {
      name = c.raw_name
    }
    if (!name) continue
    crewNameOverrides[id] = name
    crewOverrideModes[id] = mode
    perFlightCrewName.value = { ...perFlightCrewName.value, [id]: name }
  }

  return { crewNameOverrides, crewOverrideModes }
}

function isFlightSelected(fcvFlightId: string): boolean {
  const id = fcvFlightId.trim()
  return id.length > 0 && selectedFcvFlightIds.value.has(id)
}

function toggleFlightSelection(fcvFlightId: string) {
  const id = fcvFlightId.trim()
  if (!id) return
  const next = new Set(selectedFcvFlightIds.value)
  if (next.has(id)) {
    next.delete(id)
    if (id in flightRowActions.value) {
      const { [id]: _removed, ...rest } = flightRowActions.value
      flightRowActions.value = rest
    }
  } else {
    next.add(id)
  }
  selectedFcvFlightIds.value = next
}

function selectAllFlights() {
  const next = new Set<string>()
  for (const f of previewFlights.value) {
    const id = fcvIdFromFlight(f)
    if (id) next.add(id)
  }
  selectedFcvFlightIds.value = next
}

function deselectAllFlights() {
  selectedFcvFlightIds.value = new Set()
  flightRowActions.value = {}
  includeDuplicatesInImport.value = false
  includeAlreadyImportedInImport.value = false
}

function heuristicMatchForIndex(index: number): HeuristicMatchInfo | null {
  return heuristicMatches.value.find((m) => m.index === index) ?? null
}

function existingEntrySourceLabel(match: HeuristicMatchInfo): string {
  if (!match.isImported) return 'Manual entry'
  if (match.importSource === 'fc_view') return 'Previously imported entry'
  if (match.importSource === 'flica_aerodatabox') return 'Previously imported schedule entry'
  return 'Imported entry'
}

function formatMatchTotalHours(total: number | null): string {
  if (total === null || !Number.isFinite(total)) return ''
  return `${Math.round(total * 100) / 100}h`
}

function setFlightRowAction(fcvFlightId: string, action: 'link' | 'import') {
  const id = fcvFlightId.trim()
  if (!id) return
  flightRowActions.value = { ...flightRowActions.value, [id]: action }
  if (action !== 'import') {
    includeDuplicatesInImport.value = false
  }
}

function flightRowAction(fcvFlightId: string): FcvFlightAction | undefined {
  const id = fcvFlightId.trim()
  if (!id) return undefined
  return flightRowActions.value[id]
}

function canLinkHeuristicMatch(match: HeuristicMatchInfo | null): boolean {
  return !!match && !match.isImported
}

async function fetchFlights() {
  if (!isAuthenticated.value) return
  if (!connected.value) {
    error.value = 'Connect FLICA first.'
    return
  }
  loadingFetch.value = true
  error.value = null
  previewFlights.value = []
  sinceLastEntryOmittedAlreadyImported.value = 0
  enrichAttempted.value = 0
  enrichCount.value = 0
  enrichDetail.value = null
  try {
    const data = await apiFetch<{
      success: boolean
      flights: FcvMappedEntry[]
      count: number
      warning?: string
      parsedCount?: number
      filteredCount?: number
      excludedDeadheads?: number
      excludedOutsideRange?: number
      excludedScheduled?: number
      enrichAttempted?: number
      enrichedCount?: number
      enrichDetail?: string
    }>('/api/airline-sync/fetch-flica', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: {
          dateFrom: dateFrom.value || new Date().toISOString().slice(0, 10),
          dateTo: dateTo.value || new Date().toISOString().slice(0, 10),
          includeDeadheads: includeDeadheads.value,
          includeScheduled: includeScheduled.value,
          airlineCode: 'RJET',
        },
      })
    if (data?.success && Array.isArray(data.flights)) {
      fetchWarning.value = typeof data.warning === 'string' && data.warning.trim() ? data.warning.trim() : null
      enrichAttempted.value =
        typeof data.enrichAttempted === 'number' && Number.isFinite(data.enrichAttempted)
          ? data.enrichAttempted
          : 0
      enrichCount.value =
        typeof data.enrichedCount === 'number' && Number.isFinite(data.enrichedCount)
          ? data.enrichedCount
          : 0
      enrichDetail.value =
        typeof data.enrichDetail === 'string' && data.enrichDetail.trim()
          ? data.enrichDetail.trim()
          : null
      includeDuplicatesInImport.value = false
      includeAlreadyImportedInImport.value = false
      heuristicDuplicateIndices.value = new Set()
      alreadyImportedIndices.value = new Set()
      heuristicMatches.value = []
      flightRowActions.value = {}
      selectedFcvFlightIds.value = new Set()
      perFlightEnrichment.value = {}
      expandedEnrichmentRows.value = new Set()
      crewReviewCandidates.value = []
      crewResolutionMode.value = {}
      crewPickSelection.value = {}
      crewRenameText.value = {}

      let flightsForPreview = applyCatalogFamilyToFcvPreview(
        data.flights,
        props.tailCatalogFamilyByTail
      )
      let dup: FcvDupCheckResponse

      try {
        dup = await requestCheckDuplicates(flightsForPreview)

        const omitted = omitAlreadyInLogbookPreviewFlights(flightsForPreview, dup)
        if (omitted.omitted > 0) {
          sinceLastEntryOmittedAlreadyImported.value = omitted.omitted
          flightsForPreview = omitted.flights
          dup =
            flightsForPreview.length > 0
              ? await requestCheckDuplicates(flightsForPreview)
              : { ...emptyDupResponse }
        }

        previewFlights.value = flightsForPreview
        applyDupCheckToState(dup)
      } catch {
        error.value =
          'Fetched flights but could not check for duplicates. Review carefully before importing.'
        previewFlights.value = flightsForPreview
        initSelectionFromPreview()
      }
      showPreviewModal.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch flights from schedule'
  } finally {
    loadingFetch.value = false
  }
}

async function fetchSinceLastEntry() {
  if (!isAuthenticated.value || loadingFetch.value || loadingSinceLast.value) return
  loadingSinceLast.value = true
  error.value = null
  try {
    const latest = await apiFetch<{ date: string | null }>('/api/fcv/last-entry-date', {
      headers: authHeaders(),
    })
    const today = new Date().toISOString().slice(0, 10)
    const from = typeof latest?.date === 'string' && latest.date.trim() ? latest.date : today
    dateFrom.value = from
    dateTo.value = today
    await fetchFlights()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch since last entry'
  } finally {
    loadingSinceLast.value = false
  }
}

async function confirmImport() {
  if (flightsToImportWithIndex.value.length === 0) return
  if (unmatchedOwnRoleCount.value > 0) {
    error.value = 'Choose PIC or SIC for flights where your seat could not be matched.'
    return
  }
  loadingImport.value = true
  error.value = null
  try {
    const { crewNameOverrides: crewNameOverridesPayload, crewOverrideModes: crewOverrideModesPayload } =
      buildCrewOverridePayloads()

    const payload = buildFcvImportRequestPayload({
      selectedWithIndex: flightsToImportWithIndex.value,
      heuristicDuplicateIndices: heuristicDuplicateIndices.value,
      flightRowActions: flightRowActions.value,
      buildFlight: buildFlightForImport,
    })

    const importBody: {
      flights: FcvMappedEntry[]
      crewNameOverrides?: Record<string, string>
      crewOverrideModes?: Record<string, CrewOverrideMode>
      allowDuplicates?: boolean
      flightActions?: Record<string, FcvFlightAction>
    } = {
      flights: payload.flights,
      allowDuplicates: payload.allowDuplicates,
    }
    if (payload.flightActions) {
      importBody.flightActions = payload.flightActions
    }
    if (Object.keys(crewNameOverridesPayload).length > 0) {
      importBody.crewNameOverrides = crewNameOverridesPayload
      importBody.crewOverrideModes = crewOverrideModesPayload
    }

    const result = await apiFetch<{
      success: boolean
      import_batch_id?: string
      imported: number
      linked?: number
      skipped: number
      requires_crew_review?: boolean
      review_candidates?: CrewReviewCandidate[]
      catalog_person_names?: string[]
    }>('/api/fcv/import', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: importBody,
    })
    if (!result?.success && result?.requires_crew_review) {
      crewReviewCandidates.value = Array.isArray(result.review_candidates)
        ? result.review_candidates
        : []
      crewReviewCatalogNames.value = Array.isArray(result.catalog_person_names)
        ? result.catalog_person_names
        : []
      syncCrewReviewUiState(crewReviewCandidates.value)
      error.value =
        crewReviewCandidates.value.length > 0
          ? 'Review crew name matches below before importing.'
          : 'Crew review is required before importing.'
      return
    }
    const importedPayload = {
      imported: typeof result?.imported === 'number' ? result.imported : payload.flights.length,
      linked: typeof result?.linked === 'number' ? result.linked : 0,
      skipped: typeof result?.skipped === 'number' ? result.skipped : 0,
      importBatchId: result?.import_batch_id,
    }
    resetPreviewImportState()
    await nextTick()
    emit('imported', importedPayload)
    await checkStatus()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import flights'
  } finally {
    loadingImport.value = false
  }
}

function closePreview() {
  resetPreviewImportState()
  sinceLastEntryOmittedAlreadyImported.value = 0
  includeDuplicatesInImport.value = false
  includeAlreadyImportedInImport.value = false
}

function isHeuristicDuplicateRow(index: number) {
  return heuristicDuplicateIndices.value.has(index)
}

function isAlreadyImportedRow(index: number) {
  return alreadyImportedIndices.value.has(index)
}

function crewCandidateByFlightId(fcvFlightId: string): CrewReviewCandidate | null {
  return crewReviewCandidates.value.find((c) => c.fcv_flight_id === fcvFlightId) ?? null
}

/** Map UI state by server `raw_name`; requires candidate row to exist. */
function crewRawKey(fcvFlightId: string): string {
  return crewCandidateByFlightId(fcvFlightId)?.raw_name ?? ''
}

function setCrewResolutionMode(rawName: string, mode: CrewOverrideMode) {
  crewResolutionMode.value[rawName] = mode
}

function crewModeFor(rawName: string): CrewOverrideMode {
  return crewResolutionMode.value[rawName] ?? 'pick'
}

function previewResolvedCrewName(c: CrewReviewCandidate | null): string {
  if (!c) return '…'
  const rawName = c.raw_name
  const mode = crewResolutionMode.value[rawName] ?? 'pick'
  if (mode === 'asis') return c.raw_name
  if (mode === 'rename') {
    const t = (crewRenameText.value[rawName] ?? '').trim()
    return t || 'Enter a canonical name…'
  }
  const sel = (crewPickSelection.value[rawName] ?? '').trim()
  return sel || 'Choose a match…'
}

function crewRawNameHasMultipleFlights(rawName: string): boolean {
  if (!rawName) return false
  let n = 0
  for (const c of crewReviewCandidates.value) {
    if (c.raw_name === rawName) n++
    if (n > 1) return true
  }
  return false
}

function isCrewReviewRowResolved(c: CrewReviewCandidate): boolean {
  const rawName = c.raw_name
  const mode = crewResolutionMode.value[rawName] ?? 'pick'
  if (mode === 'asis') return true
  if (mode === 'rename') return !!(crewRenameText.value[rawName] ?? '').trim()
  const sel = (crewPickSelection.value[rawName] ?? '').trim()
  if (!sel) return false
  return (
    catalogContainsPersonName(fullCatalogPersonNames.value, sel) || c.candidates.includes(sel)
  )
}

const heuristicDuplicateCount = computed(() => heuristicDuplicateIndices.value.size)
const linkedImportCount = computed(() => {
  let n = 0
  for (const { index, flight } of previewFlights.value.map((flight, index) => ({ flight, index }))) {
    const fcvId = fcvIdFromFlight(flight)
    if (!fcvId || !selectedFcvFlightIds.value.has(fcvId)) continue
    if (!heuristicDuplicateIndices.value.has(index)) continue
    if (flightRowActions.value[fcvId] === 'link') n++
  }
  return n
})
const alreadyImportedCount = computed(() => alreadyImportedIndices.value.size)
const crewReviewCount = computed(() => crewReviewCandidates.value.length)
const unresolvedCrewReviewCount = computed(
  () => crewReviewCandidates.value.filter((c) => !isCrewReviewRowResolved(c)).length
)

function listedCrewFromMappedFlight(f: FcvMappedEntry): ListedCrewMember[] {
  const meta = f.import_metadata
  if (!meta || typeof meta !== 'object') return []
  const listed = (meta as { crew_listed?: unknown }).crew_listed
  if (!Array.isArray(listed)) return []
  return listed
    .map((m) => {
      if (!m || typeof m !== 'object') return null
      const rec = m as { name?: unknown; position?: unknown }
      const name = typeof rec.name === 'string' ? rec.name : ''
      const position = typeof rec.position === 'string' ? rec.position : ''
      return name.trim() ? { name, position } : null
    })
    .filter((m): m is ListedCrewMember => m != null)
}

function unmatchedReasonFromFlight(f: FcvMappedEntry): OwnRoleUnmatchedReason | null {
  const meta = f.import_metadata
  if (!meta || typeof meta !== 'object') return null
  const reason = (meta as { own_role_unmatched_reason?: unknown }).own_role_unmatched_reason
  if (reason === 'not_on_crew' || reason === 'no_crew' || reason === 'unknown_role') return reason
  return null
}

function isFlightOwnRoleUnmatched(f: FcvMappedEntry): boolean {
  if (isOwnRoleUnmatchedMetadata(f.import_metadata)) return true
  return parseAirlineOwnSeat(f.role) == null
}

function applyOwnSeatToFlight(f: FcvMappedEntry, role: AirlineOwnSeat): FcvMappedEntry {
  const ft = applySeatToFlightTime({ ...((f.flight_time ?? {}) as Record<string, unknown>) }, role)
  const crew = listedCrewFromMappedFlight(f)
  const picked = pickOppositeCrew(crew, role)
  const existingName =
    typeof f.training_elements === 'string' && f.training_elements.trim()
      ? f.training_elements.trim()
      : null
  const otherName = picked?.name ?? existingName
  const metaRaw = f.import_metadata
  const meta =
    metaRaw && typeof metaRaw === 'object' ? { ...(metaRaw as Record<string, unknown>) } : {}
  delete meta.own_role_unmatched
  delete meta.own_role_unmatched_reason
  const otherLabel = otherName
    ? picked?.label ?? (role === 'PIC' ? 'First Officer' : 'Captain')
    : null
  return {
    ...f,
    role,
    flight_time: ft,
    training_elements: otherName,
    training_instructor: otherLabel,
    import_metadata: meta,
  }
}

function setFlightOwnSeat(fcvFlightId: string, role: AirlineOwnSeat) {
  const id = fcvFlightId.trim()
  if (!id) return
  previewFlights.value = previewFlights.value.map((f) =>
    fcvIdFromFlight(f) === id ? applyOwnSeatToFlight(f, role) : f
  )
}

function applyOwnSeatToAllUnmatched(role: AirlineOwnSeat) {
  previewFlights.value = previewFlights.value.map((f) => {
    if (!isFlightSelected(fcvIdFromFlight(f))) return f
    if (!isFlightOwnRoleUnmatched(f)) return f
    return applyOwnSeatToFlight(f, role)
  })
}

function unmatchedCrewHint(f: FcvMappedEntry): string {
  return formatListedCrewHint(listedCrewFromMappedFlight(f), unmatchedReasonFromFlight(f))
}

const flightsToImport = computed(() => {
  return previewFlights.value.filter((f) => isFlightSelected(fcvIdFromFlight(f)))
})

const unmatchedOwnRoleCount = computed(
  () => flightsToImport.value.filter((f) => isFlightOwnRoleUnmatched(f)).length
)

const flightsToImportWithIndex = computed(() => {
  return previewFlights.value
    .map((flight, index) => ({ flight, index }))
    .filter(({ flight }) => isFlightSelected(fcvIdFromFlight(flight)))
})

const unresolvedDuplicateActionCount = computed(() =>
  countUnresolvedDuplicateActions(
    flightsToImportWithIndex.value,
    heuristicDuplicateIndices.value,
    flightRowActions.value
  )
)

const importCount = computed(() => flightsToImport.value.length)

const isConnectOnly = computed(() => props.mode === 'connect')
const isFetchOnly = computed(() => props.mode === 'fetch')
const isCompactFetch = computed(() => props.compact && isFetchOnly.value)
/** Show credentials form whenever FLICA is not connected (including fetch panel). */
const showConnectCta = computed(() => !loadingStatus.value && !connected.value)
const showFetchControls = computed(() => !isConnectOnly.value && connected.value)
const showConnectManage = computed(() => isConnectOnly.value && connected.value)
const showFetchNeedsConnection = computed(() => false)

const totalTime = computed(() => {
  let t = 0
  for (const f of flightsToImport.value) {
    const ft = f.flight_time as { total?: number }
    if (typeof ft?.total === 'number') t += ft.total
  }
  return t
})

function formatBlockHours(f: FcvMappedEntry): string {
  const ft = f.flight_time as { total?: number }
  if (typeof ft?.total !== 'number' || !Number.isFinite(ft.total)) return ''
  const n = Math.round(ft.total * 100) / 100
  return `${n}h`
}

function formatFlightNumberPreview(f: FcvMappedEntry): string {
  const raw = typeof f.flight_number === 'string' ? f.flight_number.trim() : ''
  return raw ? `Flight ${raw}` : ''
}

/** OOOI stored as HHMM; show as HH:MM for preview. */
function formatOooiPreview(f: FcvMappedEntry): string {
  const o = f.oooi as
    | { out?: unknown; off?: unknown; on?: unknown; in?: unknown }
    | null
    | undefined
  if (!o) return ''
  const toDisp = (t: unknown) => {
    if (typeof t !== 'string' || !t.trim()) return ''
    const d = t.replace(/\D/g, '').padStart(4, '0').slice(0, 4)
    if (d.length !== 4) return ''
    return `${d.slice(0, 2)}:${d.slice(2, 4)}`
  }
  const parts = OOOI_FIELD_ORDER.map((key) => toDisp(o[key])).filter(Boolean)
  return parts.length ? `OOOI ${parts.join(' · ')}` : ''
}

/** Other pilot (`training_*`); your leg role for quick scan of similar legs. */
function formatCrewPreviewLine(f: FcvMappedEntry): string {
  const nameRaw = f.training_elements
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
  const labelRaw = f.training_instructor
  const label = typeof labelRaw === 'string' ? labelRaw.trim() : ''
  const role = typeof f.role === 'string' ? f.role.trim().toUpperCase() : ''

  const bits: string[] = []
  if (role) bits.push(`You: ${role}`)
  if (name) bits.push(label ? `${label}: ${name}` : `Crew: ${name}`)
  return bits.join(' · ')
}

watch(includeDuplicatesInImport, (on) => {
  const next = new Set(selectedFcvFlightIds.value)
  const actions = { ...flightRowActions.value }
  previewFlights.value.forEach((f, index) => {
    if (!heuristicDuplicateIndices.value.has(index)) return
    const id = fcvIdFromFlight(f)
    if (!id) return
    if (on) {
      next.add(id)
      actions[id] = 'import'
    } else {
      next.delete(id)
      delete actions[id]
    }
  })
  selectedFcvFlightIds.value = next
  flightRowActions.value = actions
})

watch(includeAlreadyImportedInImport, (on) => {
  const next = new Set(selectedFcvFlightIds.value)
  previewFlights.value.forEach((f, index) => {
    if (!alreadyImportedIndices.value.has(index)) return
    const id = fcvIdFromFlight(f)
    if (!id) return
    if (on) next.add(id)
    else next.delete(id)
  })
  selectedFcvFlightIds.value = next
})

onMounted(() => {
  if (isAuthenticated.value) checkStatus()
})

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
    'rounded-lg border px-2 py-1.5 font-quicksand',
    props.compact ? 'text-base' : 'text-sm',
    props.isDarkMode
      ? 'bg-gray-800 border-gray-600 text-gray-100'
      : 'bg-white border-gray-200 text-gray-900',
  ].join(' ')
)

const previewModalShellClass = computed(() =>
  props.compact
    ? [
        'flex w-full flex-col min-h-0 font-quicksand',
        props.isDarkMode ? 'bg-gray-900' : 'bg-white',
      ].join(' ')
    : [
        'relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border shadow-xl overflow-hidden font-quicksand',
        props.isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200',
      ].join(' ')
)

const previewModalOverlayClass = computed(() =>
  props.compact
    ? 'flex flex-col min-h-0'
    : 'app-modal-overlay flex items-center justify-center p-4'
)
</script>

<template>
  <div class="space-y-4 font-quicksand" :class="$attrs.class">
    <div v-if="!isCompactFetch" class="space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <h4
          :class="[
            'text-sm font-semibold uppercase tracking-wide',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          Airline schedule sync
        </h4>
      </div>
    </div>

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
    <template v-else-if="showConnectCta">
      <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Connect your FLICA account to import flights into your logbook. Use your FLICA User ID
        (e.g. RPA624619) or employee number.
      </p>
      <form class="space-y-3 max-w-md" @submit.prevent="connectFlica">
        <label
          :class="[
            'block text-sm font-medium',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          <span class="mb-1 block">FLICA User ID</span>
          <input
            v-model="flicaUserIdInput"
            type="text"
            autocomplete="username"
            placeholder="RPA624619"
            :class="[inputClass, 'w-full']"
          />
        </label>
        <label
          :class="[
            'block text-sm font-medium',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          ]"
        >
          <span class="mb-1 block">Password</span>
          <input
            v-model="flicaPasswordInput"
            type="password"
            autocomplete="current-password"
            :class="[inputClass, 'w-full']"
          />
        </label>
        <button
          type="submit"
          :class="btnConnectFcvClass"
          :disabled="!isAuthenticated || connectingFlica"
        >
          <Icon name="ri:link" size="18" class="shrink-0" />
          {{ connectingFlica ? 'Connecting…' : 'Connect FLICA' }}
        </button>
      </form>
    </template>
    <template v-else-if="showFetchControls && !(compact && showPreviewModal)">
      <p
        v-if="!isCompactFetch"
        :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
      >
        Choose a date range and fetch flights from FLICA to preview before importing.
        <span v-if="flicaUsername" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
          Connected as {{ flicaUsername }}.
        </span>
      </p>
      <div class="space-y-4">
        <template v-if="isCompactFetch">
          <button
            type="button"
            :class="[btnConnectFcvClass, 'w-full']"
            :disabled="loadingFetch || loadingSinceLast || syncingLogbook"
            @click="fetchSinceLastEntry"
          >
            <Icon name="ri:download-cloud-2-line" size="18" />
            {{
              loadingSinceLast
                ? syncingLogbook
                  ? 'Syncing logbook…'
                  : 'Loading flights…'
                : 'Import new flights'
            }}
          </button>
          <button
            type="button"
            :class="[
              'w-full text-sm font-medium font-quicksand text-left transition-colors',
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-800',
            ]"
            @click="showAdvancedDateRange = !showAdvancedDateRange"
          >
            {{ showAdvancedDateRange ? 'Hide date range options' : 'Choose date range…' }}
          </button>
        </template>
        <div v-if="!isCompactFetch || showAdvancedDateRange" class="space-y-4">
          <div
            v-if="isCompactFetch"
            :class="['rounded-xl border p-4 space-y-4', isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50']"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <label
                :class="[
                  'flex items-center gap-2 text-sm font-medium',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <span class="shrink-0 w-10">From</span>
                <input v-model="dateFrom" type="date" :class="[inputClass, 'flex-1 min-w-0']" />
              </label>
              <label
                :class="[
                  'flex items-center gap-2 text-sm font-medium',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <span class="shrink-0 w-10">To</span>
                <input v-model="dateTo" type="date" :class="[inputClass, 'flex-1 min-w-0']" />
              </label>
            </div>
            <div class="space-y-2.5">
              <label
                :class="[
                  'flex items-center gap-2.5 text-sm cursor-pointer hover:opacity-80 transition-opacity',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <input
                  v-model="includeDeadheads"
                  type="checkbox"
                  :class="['rounded text-blue-600 focus:ring-blue-500', isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300']"
                />
                <span>Include deadheads</span>
              </label>
              <label
                :class="[
                  'flex items-center gap-2.5 text-sm cursor-pointer hover:opacity-80 transition-opacity',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <input
                  v-model="includeScheduled"
                  type="checkbox"
                  :class="['rounded text-blue-600 focus:ring-blue-500', isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300']"
                />
                <span>Include scheduled (not yet departed) flights</span>
              </label>
            </div>
            <button
              type="button"
              :class="[btnOutlineClass, 'w-full']"
              :disabled="loadingFetch || loadingSinceLast || syncingLogbook"
              @click="fetchFlights"
            >
              <Icon name="ri:calendar-line" size="18" />
              {{
                loadingFetch
                  ? syncingLogbook
                    ? 'Syncing logbook…'
                    : 'Fetching…'
                  : 'Fetch flights for range'
              }}
            </button>
          </div>
          <template v-if="!isCompactFetch">
            <div class="flex flex-wrap items-center gap-4">
              <label
                :class="[
                  'flex items-center gap-2 text-sm font-medium',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <span>From</span>
                <input v-model="dateFrom" type="date" :class="inputClass" />
              </label>
              <label
                :class="[
                  'flex items-center gap-2 text-sm font-medium',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <span>To</span>
                <input v-model="dateTo" type="date" :class="inputClass" />
              </label>
            </div>
            <div class="space-y-2.5">
              <label
                :class="[
                  'flex items-center gap-2.5 text-sm cursor-pointer hover:opacity-80 transition-opacity',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <input
                  v-model="includeDeadheads"
                  type="checkbox"
                  :class="['rounded text-blue-600 focus:ring-blue-500', isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300']"
                />
                <span>Include deadheads</span>
              </label>
              <label
                :class="[
                  'flex items-center gap-2.5 text-sm cursor-pointer hover:opacity-80 transition-opacity',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <input
                  v-model="includeScheduled"
                  type="checkbox"
                  :class="['rounded text-blue-600 focus:ring-blue-500', isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300']"
                />
                <span>Include scheduled (not yet departed) flights</span>
              </label>
            </div>
          </template>
        </div>
        <p
          v-if="pendingSyncCount > 0"
          :class="['text-xs', isDarkMode ? 'text-amber-300' : 'text-amber-800']"
        >
          {{ pendingSyncCount }} unsynced
          {{ pendingSyncCount === 1 ? 'entry' : 'entries' }} on this device. Open Logifi on your
          other device and wait for sync before importing, or duplicates logged elsewhere may not be
          detected.
        </p>
        <div v-if="!isCompactFetch" class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            :class="btnOutlineClass"
            :disabled="loadingFetch || loadingSinceLast || syncingLogbook"
            @click="fetchFlights"
          >
            <Icon name="ri:download-cloud-2-line" size="18" />
            {{
              loadingFetch
                ? syncingLogbook
                  ? 'Syncing logbook…'
                  : 'Fetching…'
                : 'Fetch flights'
            }}
          </button>
          <button
            type="button"
            :class="btnConnectFcvClass"
            :disabled="loadingFetch || loadingSinceLast || syncingLogbook"
            @click="fetchSinceLastEntry"
          >
            <Icon name="ri:history-line" size="18" />
            {{
              loadingSinceLast
                ? syncingLogbook
                  ? 'Syncing logbook…'
                  : 'Loading…'
                : 'Since last entry'
            }}
          </button>
        </div>
        <div v-if="!isCompactFetch" class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            :class="btnOutlineClass"
            :disabled="disconnecting"
            @click="disconnectFlica"
          >
            {{ disconnecting ? 'Disconnecting…' : 'Disconnect FLICA' }}
          </button>
        </div>
      </div>
    </template>
    <template v-else-if="showConnectManage">
      <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        FLICA is connected<span v-if="flicaUsername"> as {{ flicaUsername }}</span>. You can
        disconnect at any time.
      </p>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <button
          type="button"
          :disabled="disconnecting"
          :class="[
            'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-colors border disabled:opacity-50 disabled:cursor-not-allowed',
            isDarkMode
              ? 'border-red-800/70 text-red-400 hover:bg-red-950/40'
              : 'border-red-200 text-red-600 hover:bg-red-50',
          ]"
          @click="disconnectFlica"
        >
          <Icon name="ri:link-unlink" size="18" class="shrink-0" />
          {{ disconnecting ? 'Disconnecting…' : 'Disconnect FLICA' }}
        </button>
      </div>
    </template>

    <!-- Preview modal (inline on iOS compact; teleported modal on desktop) -->
    <Teleport to="body" :disabled="compact">
    <div
      v-if="showPreviewModal"
      :class="previewModalOverlayClass"
    >
      <div
        v-if="!compact"
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="closePreview"
      />
      <div :class="previewModalShellClass">
        <div
          :class="[
            'p-4 border-b flex items-center justify-between shrink-0',
            isDarkMode ? 'border-gray-700' : 'border-gray-200',
          ]"
        >
          <div class="min-w-0 flex-1 pr-2">
            <h4
              :class="['text-lg font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']"
            >
              Preview — {{ previewFlights.length }} flight(s)
            </h4>
            <p
              v-if="sinceLastEntryOmittedAlreadyImported > 0"
              :class="['text-xs mt-1', isDarkMode ? 'text-slate-400' : 'text-slate-600']"
            >
              {{ sinceLastEntryOmittedAlreadyImported }} flight(s) already in your logbook were not
              shown.
            </p>
            <p
              v-if="enrichAttempted > 0 || fetchWarning"
              :class="['text-xs mt-1', isDarkMode ? 'text-amber-300' : 'text-amber-800']"
            >
              <template v-if="enrichAttempted > 0">
                Enriched {{ enrichCount }}/{{ enrichAttempted }}<span v-if="enrichDetail"> — {{ enrichDetail }}</span>
              </template>
              <template v-else>{{ fetchWarning }}</template>
            </p>
            <p
              v-if="fetchWarning && enrichAttempted > 0"
              :class="['text-xs mt-1', isDarkMode ? 'text-amber-300' : 'text-amber-800']"
            >
              {{ fetchWarning }}
            </p>
            <div v-if="previewFlights.length > 0" class="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                :class="[
                  'text-xs font-medium rounded-md px-2 py-1 transition-colors',
                  isDarkMode
                    ? 'text-blue-300 hover:bg-gray-800'
                    : 'text-blue-700 hover:bg-blue-50',
                ]"
                @click="selectAllFlights"
              >
                Select all
              </button>
              <button
                type="button"
                :class="[
                  'text-xs font-medium rounded-md px-2 py-1 transition-colors',
                  isDarkMode
                    ? 'text-gray-400 hover:bg-gray-800'
                    : 'text-gray-600 hover:bg-gray-100',
                ]"
                @click="deselectAllFlights"
              >
                Deselect all
              </button>
              <template v-if="unmatchedOwnRoleCount > 0">
                <button
                  type="button"
                  :class="[
                    'text-xs font-medium rounded-md px-2 py-1 transition-colors',
                    isDarkMode
                      ? 'text-blue-300 hover:bg-gray-800'
                      : 'text-blue-700 hover:bg-blue-50',
                  ]"
                  @click="applyOwnSeatToAllUnmatched('PIC')"
                >
                  Apply PIC to all unmatched
                </button>
                <button
                  type="button"
                  :class="[
                    'text-xs font-medium rounded-md px-2 py-1 transition-colors',
                    isDarkMode
                      ? 'text-blue-300 hover:bg-gray-800'
                      : 'text-blue-700 hover:bg-blue-50',
                  ]"
                  @click="applyOwnSeatToAllUnmatched('SIC')"
                >
                  Apply SIC to all unmatched
                </button>
              </template>
            </div>
            <p
              v-if="unmatchedOwnRoleCount > 0"
              :class="['text-xs mt-2', isDarkMode ? 'text-orange-300' : 'text-orange-800']"
            >
              We could not tell if you were Captain or First Officer on
              {{ unmatchedOwnRoleCount }} flight(s).
            </p>
          </div>
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
        <div :class="compact ? 'p-4 space-y-3' : 'flex-1 overflow-y-auto p-4 space-y-3'">
          <p
            v-if="previewFlights.length === 0"
            :class="['text-sm py-6 text-center', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
          >
            {{ fetchWarning || 'No flights in this range. Adjust dates or filters and try again.' }}
          </p>
          <div
            v-for="(f, idx) in previewFlights"
            :key="`${f.fcv_flight_id || 'row'}-${idx}`"
            :class="[
              'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 border-b last:border-0 text-sm rounded-lg px-2 -mx-2 transition-opacity',
              isDarkMode
                ? 'border-gray-700 text-gray-200'
                : 'border-gray-200 text-gray-800',
              !isFlightSelected(f.fcv_flight_id) ? 'opacity-45' : '',
              isAlreadyImportedRow(idx)
                ? isDarkMode
                  ? 'bg-slate-800/50 border-slate-600/60 ring-1 ring-slate-600/35'
                  : 'bg-slate-50 border-slate-200/90 ring-1 ring-slate-200/80'
                : isHeuristicDuplicateRow(idx)
                  ? isDarkMode
                    ? 'bg-amber-950/35 border-amber-900/50 ring-1 ring-amber-700/40'
                    : 'bg-amber-50 border-amber-200/80 ring-1 ring-amber-200/90'
                  : '',
            ]"
          >
            <label
              :class="[
                'flex items-center gap-2 shrink-0 cursor-pointer select-none',
                isDarkMode ? 'text-gray-300' : 'text-gray-600',
              ]"
            >
              <input
                type="checkbox"
                class="shrink-0 rounded"
                :checked="isFlightSelected(f.fcv_flight_id)"
                :aria-label="`Include ${f.date} ${f.departure} to ${f.destination} in import`"
                @change="toggleFlightSelection(f.fcv_flight_id)"
              />
              <span class="sr-only">Include in import</span>
            </label>
            <div class="flex items-center gap-2 min-w-0">
              <Icon
                v-if="isAlreadyImportedRow(idx)"
                name="ri:checkbox-circle-line"
                size="18"
                :class="['shrink-0', isDarkMode ? 'text-slate-400' : 'text-slate-500']"
                aria-hidden="true"
              />
              <Icon
                v-else-if="isHeuristicDuplicateRow(idx)"
                name="ri:alert-line"
                size="18"
                :class="['shrink-0', isDarkMode ? 'text-amber-400' : 'text-amber-600']"
                aria-hidden="true"
              />
              <span class="font-medium">{{ f.date }}</span>
              <span
                v-if="formatFlightNumberPreview(f)"
                :class="[
                  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                  isDarkMode ? 'bg-gray-800 text-blue-200' : 'bg-blue-50 text-blue-700',
                ]"
              >
                {{ formatFlightNumberPreview(f) }}
              </span>
            </div>
            <span>{{ f.departure }} → {{ f.destination }}</span>
            <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              {{ f.aircraft_make_model }} ({{ f.registration }})
            </span>
            <span
              v-if="formatBlockHours(f)"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              {{ formatBlockHours(f) }}
            </span>
            <span
              v-if="formatOooiPreview(f)"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
            >
              {{ formatOooiPreview(f) }}
            </span>
            <span
              v-if="formatCrewPreviewLine(f)"
              class="w-full basis-full mt-0.5 text-xs"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
            >
              {{ formatCrewPreviewLine(f) }}
            </span>
            <div
              v-if="isFlightSelected(f.fcv_flight_id)"
              class="w-full basis-full mt-2 space-y-1"
            >
              <label
                :class="['block text-xs font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']"
              >
                Other pilot
              </label>
              <div class="relative">
                <input
                  :value="getPerFlightCrewName(f.fcv_flight_id)"
                  type="text"
                  autocomplete="name"
                  placeholder="Pilot name"
                  :class="[inputClass, 'w-full']"
                  @input="setPerFlightCrewName(f.fcv_flight_id, ($event.target as HTMLInputElement).value)"
                  @focus="openPilotPicker(f.fcv_flight_id, $event)"
                  @blur="closePilotPickerSoon"
                />
                <ul
                  v-if="activePilotPickerId === f.fcv_flight_id && filteredPilotSuggestions(getPerFlightCrewName(f.fcv_flight_id)).length"
                  :class="[
                    'absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border shadow-lg text-sm',
                    isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white',
                  ]"
                >
                  <li
                    v-for="name in filteredPilotSuggestions(getPerFlightCrewName(f.fcv_flight_id))"
                    :key="`${f.fcv_flight_id}-pilot-${name}`"
                  >
                    <button
                      type="button"
                      :class="[
                        'block w-full px-3 py-2 text-left',
                        isDarkMode ? 'hover:bg-gray-800 text-gray-100' : 'hover:bg-gray-100 text-gray-900',
                      ]"
                      @mousedown.prevent="selectPilotFromCatalog(f.fcv_flight_id, name)"
                    >
                      {{ name }}
                    </button>
                  </li>
                </ul>
              </div>
              <p
                v-if="fullCatalogPersonNames.length"
                :class="['text-[11px] leading-snug', isDarkMode ? 'text-gray-500' : 'text-gray-500']"
              >
                Search your full pilot catalog or type a new name.
              </p>
            </div>
            <div
              v-if="isFlightSelected(f.fcv_flight_id) && isFlightOwnRoleUnmatched(f)"
              class="w-full basis-full mt-2 space-y-2"
            >
              <p
                :class="['text-xs font-medium', isDarkMode ? 'text-orange-300' : 'text-orange-800']"
              >
                Choose your seat
              </p>
              <p :class="['text-[11px] leading-snug', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                {{ unmatchedCrewHint(f) }}
              </p>
              <fieldset class="flex flex-wrap gap-3">
                <legend class="sr-only">Your seat on this flight</legend>
                <label
                  :class="[
                    'flex items-center gap-2 cursor-pointer select-none text-xs',
                    isDarkMode ? 'text-gray-200' : 'text-gray-800',
                  ]"
                >
                  <input
                    type="radio"
                    class="shrink-0"
                    :name="`own-seat-${f.fcv_flight_id}`"
                    :value="'PIC'"
                    @change="setFlightOwnSeat(f.fcv_flight_id, 'PIC')"
                  />
                  PIC (Captain)
                </label>
                <label
                  :class="[
                    'flex items-center gap-2 cursor-pointer select-none text-xs',
                    isDarkMode ? 'text-gray-200' : 'text-gray-800',
                  ]"
                >
                  <input
                    type="radio"
                    class="shrink-0"
                    :name="`own-seat-${f.fcv_flight_id}`"
                    :value="'SIC'"
                    @change="setFlightOwnSeat(f.fcv_flight_id, 'SIC')"
                  />
                  SIC (First Officer)
                </label>
              </fieldset>
            </div>
            <span
              v-if="isAlreadyImportedRow(idx)"
              :class="[
                'w-full text-xs font-medium sm:w-auto sm:ml-auto',
                isDarkMode ? 'text-slate-400' : 'text-slate-600',
              ]"
            >
              Already in logbook
            </span>
            <span
              v-else-if="isHeuristicDuplicateRow(idx)"
              :class="[
                'w-full text-xs font-medium sm:w-auto sm:ml-auto',
                isDarkMode ? 'text-amber-300' : 'text-amber-800',
              ]"
            >
              May match an existing entry
            </span>
            <div
              v-if="isHeuristicDuplicateRow(idx) && isFlightSelected(f.fcv_flight_id) && heuristicMatchForIndex(idx)"
              :class="[
                'w-full mt-1 rounded-lg border p-3 text-xs space-y-2',
                isDarkMode ? 'border-amber-800/60 bg-amber-950/25 text-amber-100' : 'border-amber-200 bg-amber-50/80 text-amber-950',
              ]"
            >
              <p class="font-semibold">Matches existing logbook entry</p>
              <p>
                <span
                  :class="[
                    'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide mr-1.5',
                    !heuristicMatchForIndex(idx)!.isImported
                      ? isDarkMode
                        ? 'bg-blue-900/50 text-blue-200'
                        : 'bg-blue-100 text-blue-800'
                      : isDarkMode
                        ? 'bg-orange-900/40 text-orange-200'
                        : 'bg-orange-100 text-orange-900',
                  ]"
                >
                  {{ existingEntrySourceLabel(heuristicMatchForIndex(idx)!) }}
                </span>
                {{ heuristicMatchForIndex(idx)!.date }}
                · {{ heuristicMatchForIndex(idx)!.registration }}
                · {{ heuristicMatchForIndex(idx)!.departure }} →
                {{ heuristicMatchForIndex(idx)!.destination }}
                <span v-if="formatMatchTotalHours(heuristicMatchForIndex(idx)!.flightTimeTotal)">
                  · {{ formatMatchTotalHours(heuristicMatchForIndex(idx)!.flightTimeTotal) }}
                </span>
              </p>
              <fieldset class="space-y-1.5">
                <legend class="sr-only">How to handle this flight</legend>
                <label
                  v-if="canLinkHeuristicMatch(heuristicMatchForIndex(idx))"
                  :class="[
                    'flex items-center gap-2 cursor-pointer select-none',
                    isDarkMode ? 'text-amber-100' : 'text-amber-900',
                  ]"
                >
                  <input
                    type="radio"
                    class="shrink-0"
                    :name="`fcv-dup-action-${f.fcv_flight_id}`"
                    :checked="flightRowAction(f.fcv_flight_id) === 'link'"
                    @change="setFlightRowAction(f.fcv_flight_id, 'link')"
                  />
                  <span>Link to existing entry (enrich with schedule data)</span>
                </label>
                <label
                  :class="[
                    'flex items-center gap-2 cursor-pointer select-none',
                    isDarkMode ? 'text-amber-100' : 'text-amber-900',
                  ]"
                >
                  <input
                    type="radio"
                    class="shrink-0"
                    :name="`fcv-dup-action-${f.fcv_flight_id}`"
                    :checked="flightRowAction(f.fcv_flight_id) === 'import'"
                    @change="setFlightRowAction(f.fcv_flight_id, 'import')"
                  />
                  <span>Import as a separate entry</span>
                </label>
              </fieldset>
            </div>
            <div
              v-if="crewCandidateByFlightId(f.fcv_flight_id)"
              :class="[
                'w-full mt-1 rounded-lg border p-3 text-xs space-y-2.5',
                isDarkMode ? 'border-orange-700/70 bg-orange-900/20 text-orange-200' : 'border-orange-300 bg-orange-50 text-orange-900',
              ]"
            >
              <p class="font-semibold">
                Crew name review needed: "{{ crewCandidateByFlightId(f.fcv_flight_id)?.raw_name }}"
              </p>
              <p
                v-if="crewRawNameHasMultipleFlights(crewRawKey(f.fcv_flight_id))"
                :class="['text-[11px] leading-snug', isDarkMode ? 'text-orange-100/80' : 'text-orange-800']"
              >
                Flights with this same crew name share one choice below.
              </p>
              <fieldset class="space-y-2">
                <legend class="sr-only">How to save this crew name</legend>
                <div class="flex flex-col gap-2">
                  <label
                    :class="[
                      'inline-flex items-center gap-2 cursor-pointer select-none',
                      isDarkMode ? 'text-orange-100' : 'text-orange-900',
                    ]"
                  >
                    <input
                      type="radio"
                      class="shrink-0 rounded-full border-orange-400 text-orange-600 focus:ring-orange-500"
                      :name="`fcv-crew-mode-${f.fcv_flight_id}`"
                      :checked="crewModeFor(crewRawKey(f.fcv_flight_id)) === 'pick'"
                      @change="setCrewResolutionMode(crewRawKey(f.fcv_flight_id), 'pick')"
                    />
                    <span>Pick from catalog</span>
                  </label>
                  <label
                    :class="[
                      'inline-flex items-center gap-2 cursor-pointer select-none',
                      isDarkMode ? 'text-orange-100' : 'text-orange-900',
                    ]"
                  >
                    <input
                      type="radio"
                      class="shrink-0 rounded-full border-orange-400 text-orange-600 focus:ring-orange-500"
                      :name="`fcv-crew-mode-${f.fcv_flight_id}`"
                      :checked="crewModeFor(crewRawKey(f.fcv_flight_id)) === 'rename'"
                      @change="setCrewResolutionMode(crewRawKey(f.fcv_flight_id), 'rename')"
                    />
                    <span>Rename</span>
                  </label>
                  <label
                    :class="[
                      'inline-flex items-center gap-2 cursor-pointer select-none',
                      isDarkMode ? 'text-orange-100' : 'text-orange-900',
                    ]"
                  >
                    <input
                      type="radio"
                      class="shrink-0 rounded-full border-orange-400 text-orange-600 focus:ring-orange-500"
                      :name="`fcv-crew-mode-${f.fcv_flight_id}`"
                      :checked="crewModeFor(crewRawKey(f.fcv_flight_id)) === 'asis'"
                      @change="setCrewResolutionMode(crewRawKey(f.fcv_flight_id), 'asis')"
                    />
                    <span>As is</span>
                  </label>
                </div>
              </fieldset>
              <div v-if="crewModeFor(crewRawKey(f.fcv_flight_id)) === 'pick'" class="space-y-1">
                <span :class="isDarkMode ? 'text-orange-100' : 'text-orange-800'">Match to catalog person</span>
                <input
                  v-model="crewPickSelection[crewRawKey(f.fcv_flight_id)]"
                  type="text"
                  autocomplete="name"
                  placeholder="Search your full pilot catalog"
                  :class="[inputClass, 'w-full mt-0.5']"
                />
                <ul
                  v-if="filteredPilotSuggestions(crewPickSelection[crewRawKey(f.fcv_flight_id)] ?? '').length"
                  :class="[
                    'mt-1 max-h-36 overflow-y-auto rounded-lg border text-sm',
                    isDarkMode ? 'border-orange-800/60 bg-orange-950/40' : 'border-orange-200 bg-white',
                  ]"
                >
                  <li
                    v-for="name in filteredPilotSuggestions(crewPickSelection[crewRawKey(f.fcv_flight_id)] ?? '')"
                    :key="`${f.fcv_flight_id}-crew-${name}`"
                  >
                    <button
                      type="button"
                      :class="[
                        'block w-full px-3 py-2 text-left',
                        isDarkMode ? 'hover:bg-orange-900/50 text-orange-50' : 'hover:bg-orange-50 text-orange-950',
                      ]"
                      @mousedown.prevent="crewPickSelection[crewRawKey(f.fcv_flight_id)] = name"
                    >
                      {{ name }}
                    </button>
                  </li>
                </ul>
                <p :class="['text-[11px] leading-snug', isDarkMode ? 'text-orange-100/85' : 'text-orange-800']">
                  Pick from your full pilot catalog, not just fuzzy suggestions.
                </p>
              </div>
              <div v-else-if="crewModeFor(crewRawKey(f.fcv_flight_id)) === 'rename'" class="space-y-1">
                <label class="block">
                  <span :class="isDarkMode ? 'text-orange-100' : 'text-orange-800'">Canonical name</span>
                  <input
                    v-model="crewRenameText[crewRawKey(f.fcv_flight_id)]"
                    type="text"
                    autocomplete="name"
                    placeholder="e.g. Last, First"
                    :class="[inputClass, 'w-full mt-0.5']"
                  />
                </label>
                <p :class="['text-[11px] leading-snug', isDarkMode ? 'text-orange-100/85' : 'text-orange-800']">
                  Adds this person to your catalog for future schedule imports.
                </p>
              </div>
              <div v-else class="space-y-1">
                <span :class="isDarkMode ? 'text-orange-100' : 'text-orange-800'">Will import as</span>
                <p
                  :class="[
                    'mt-0.5 rounded-md border px-2 py-1.5 font-medium',
                    isDarkMode ? 'border-orange-800/60 bg-orange-950/40 text-orange-50' : 'border-orange-200 bg-white text-orange-950',
                  ]"
                >
                  {{ crewCandidateByFlightId(f.fcv_flight_id)?.raw_name }}
                </p>
                <p :class="['text-[11px] leading-snug', isDarkMode ? 'text-orange-100/85' : 'text-orange-800']">
                  Uses the imported spelling exactly. Does not add a catalog person.
                </p>
              </div>
              <p
                :class="[
                  'mt-1 rounded-md border px-2 py-1.5 text-[11px] leading-snug',
                  isDarkMode
                    ? 'border-orange-800/50 bg-orange-950/30 text-orange-50'
                    : 'border-orange-200 bg-white text-orange-950',
                ]"
              >
                <span :class="['font-semibold', isDarkMode ? 'text-orange-100' : 'text-orange-900']">
                  Will save in logbook as:
                </span>
                {{ ' ' }}
                <span class="font-medium">{{
                  previewResolvedCrewName(crewCandidateByFlightId(f.fcv_flight_id))
                }}</span>
              </p>
            </div>
            <div class="w-full flex justify-end">
              <button
                type="button"
                :class="[
                  'text-xs underline-offset-2 hover:underline',
                  isDarkMode ? 'text-blue-300' : 'text-blue-700',
                ]"
                @click="toggleEnrichmentRow(idx)"
              >
                {{ isEnrichmentExpanded(idx) ? 'Hide optional details' : 'Add optional details' }}
              </button>
            </div>
            <div
              v-if="isEnrichmentExpanded(idx)"
              :class="[
                'w-full mt-3 rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4',
                isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'
              ]"
            >
              <label
                :class="[
                  'flex items-center gap-2 text-sm sm:col-span-2 font-medium',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                <input
                  v-model="getOrCreateEnrichment(idx).userFlewLeg"
                  type="checkbox"
                  :class="['rounded w-4 h-4', isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300']"
                />
                I flew this leg (auto-credit one landing)
              </label>
              
              <div class="grid grid-cols-2 gap-4 sm:col-span-2">
                <label class="space-y-1.5">
                  <span :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Actual instrument (h)</span>
                  <input v-model="getOrCreateEnrichment(idx).actualInstrument" type="number" min="0" step="0.1" :class="[inputClass, 'w-full']" />
                </label>
                <label class="space-y-1.5">
                  <span :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Hood / sim inst (h)</span>
                  <input v-model="getOrCreateEnrichment(idx).simulatedInstrument" type="number" min="0" step="0.1" :class="[inputClass, 'w-full']" />
                </label>
              </div>

              <div class="grid grid-cols-2 gap-4 sm:col-span-2">
                <label class="space-y-1.5">
                  <span :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Holds</span>
                  <input v-model="getOrCreateEnrichment(idx).holdingProcedures" type="number" min="0" step="1" :class="[inputClass, 'w-full']" />
                </label>
                <div class="space-y-1.5">
                  <span :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches</span>
                  <div
                    v-for="(ap, apIdx) in getOrCreateEnrichment(idx).approaches"
                    :key="`${idx}-${apIdx}`"
                    class="flex gap-2 items-center mb-2"
                  >
                    <select v-model="ap.type" :class="[inputClass, 'flex-1 min-w-0']">
                      <option v-for="t in approachTypeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <input v-model="ap.count" type="number" min="0" step="1" :class="[inputClass, 'w-16 text-center']" />
                    <button
                      type="button"
                      :class="['p-1.5 rounded-lg transition-colors shrink-0', isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500']"
                      @click="getOrCreateEnrichment(idx).approaches.splice(apIdx, 1)"
                    >
                      <Icon name="ri:close-line" size="18" />
                    </button>
                  </div>
                  <button 
                    type="button" 
                    :class="['text-xs font-semibold transition-colors', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']" 
                    @click="addApproach(idx)"
                  >
                    + Add approach
                  </button>
                </div>
              </div>

              <label class="space-y-1.5 sm:col-span-2">
                <span :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Remarks</span>
                <textarea
                  v-model="getOrCreateEnrichment(idx).remarks"
                  rows="2"
                  :class="[
                    'w-full rounded-xl border px-3 py-2 text-sm font-quicksand resize-y',
                    isDarkMode ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900',
                  ]"
                />
              </label>
            </div>
          </div>
        </div>
        <div
          :class="[
            'p-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0',
            isDarkMode ? 'border-gray-700' : 'border-gray-200',
          ]"
        >
          <div :class="['text-sm space-y-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            <p>
              Importing:
              <span class="font-medium" :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'">
                {{ importCount }} of {{ previewFlights.length }} flight(s)
              </span>
              <span v-if="totalTime > 0">, {{ totalTime.toFixed(1) }}h</span>
            </p>
            <p
              v-if="alreadyImportedCount > 0"
              :class="isDarkMode ? 'text-slate-400' : 'text-slate-600'"
            >
              {{ alreadyImportedCount }} flight(s) already imported (import would skip these).
            </p>
            <p
              v-if="heuristicDuplicateCount > 0"
              :class="isDarkMode ? 'text-amber-300' : 'text-amber-800'"
            >
              {{ heuristicDuplicateCount }} flight(s) may match an existing logbook entry.
              <span v-if="linkedImportCount > 0">
                {{ linkedImportCount }} will be linked to existing entries.
              </span>
            </p>
            <p
              v-if="heuristicDuplicateCount > 0"
              :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']"
            >
              Compared by calendar date, tail number, and route (IATA/ICAO normalized). Two flights same day with
              different out-times can still be told apart when both entries have OOOI out logged.
            </p>
            <p
              v-if="unresolvedDuplicateActionCount > 0"
              :class="isDarkMode ? 'text-amber-300' : 'text-amber-800'"
            >
              Choose Link or Import for {{ unresolvedDuplicateActionCount }} selected possible
              duplicate(s).
            </p>
            <p
              v-if="crewReviewCount > 0"
              :class="isDarkMode ? 'text-orange-300' : 'text-orange-800'"
            >
              {{ unresolvedCrewReviewCount }} of {{ crewReviewCount }} crew name match(es) still need review.
            </p>
            <p
              v-if="unmatchedOwnRoleCount > 0"
              :class="isDarkMode ? 'text-orange-300' : 'text-orange-800'"
            >
              We could not tell if you were Captain or First Officer on
              {{ unmatchedOwnRoleCount }} flight(s).
            </p>
            <label
              v-if="heuristicDuplicateCount > 0"
              :class="[
                'flex items-center gap-2 cursor-pointer select-none',
                isDarkMode ? 'text-gray-300' : 'text-gray-700',
              ]"
            >
              <input
                v-model="includeDuplicatesInImport"
                type="checkbox"
                :class="['rounded shrink-0', isDarkMode ? 'border-gray-600' : 'border-gray-300']"
              />
              <span>Include flights that may match an existing entry</span>
            </label>
            <label
              v-if="alreadyImportedCount > 0"
              :class="[
                'flex items-center gap-2 cursor-pointer select-none',
                isDarkMode ? 'text-gray-300' : 'text-gray-700',
              ]"
            >
              <input
                v-model="includeAlreadyImportedInImport"
                type="checkbox"
                :class="['rounded shrink-0', isDarkMode ? 'border-gray-600' : 'border-gray-300']"
              />
              <span>Include flights already imported</span>
            </label>
          </div>
          <div class="flex gap-2 shrink-0">
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
              :disabled="loadingImport || importCount === 0 || unresolvedCrewReviewCount > 0 || unresolvedDuplicateActionCount > 0 || unmatchedOwnRoleCount > 0"
              @click="confirmImport"
            >
              {{ loadingImport ? 'Importing…' : `Import ${importCount} flight(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>
