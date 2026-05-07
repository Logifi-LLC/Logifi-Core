<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRoute } from 'vue-router'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'

/** Must match dashboard theme; avoid `dark:` here so OS dark mode does not fight white settings cards. */
const props = withDefaults(
  defineProps<{
    isDarkMode: boolean
    mode?: 'connect' | 'fetch' | 'full'
  }>(),
  {
    mode: 'full',
  }
)
const emit = defineEmits<{
  imported: [{ imported: number; skipped: number; importBatchId?: string }]
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

const { session, isAuthenticated } = useAuth()

const connected = ref<boolean>(false)
const loadingStatus = ref(false)
const disconnecting = ref(false)
const loadingFetch = ref(false)
const loadingSinceLast = ref(false)
const loadingImport = ref(false)
const error = ref<string | null>(null)

const dateFrom = ref('')
const dateTo = ref('')
const includeDeadheads = ref(false)
const includeScheduled = ref(false)

const previewFlights = ref<FcvMappedEntry[]>([])
const showPreviewModal = ref(false)
/** Heuristic match (date/tail/route/OOOI) — not already stored by FC View flight id. */
const heuristicDuplicateIndices = ref<Set<number>>(new Set())
/** Exact `fcv_flight_id` already present in logbook (import would skip). */
const alreadyImportedIndices = ref<Set<number>>(new Set())
const includeDuplicatesInImport = ref(false)
const includeAlreadyImportedInImport = ref(false)
/** When "Since last entry" hid rows that are already in the logbook (FC View id). */
const sinceLastEntryOmittedAlreadyImported = ref(0)
const expandedEnrichmentRows = ref<Set<number>>(new Set())
const perFlightEnrichment = ref<Record<number, FlightEnrichment>>({})
const crewReviewCandidates = ref<CrewReviewCandidate[]>([])
/** Crew review state keyed by exact FC View `raw_name` so rows with the same string stay in sync. */
const crewResolutionMode = ref<Record<string, CrewOverrideMode>>({})
const crewPickSelection = ref<Record<string, string>>({})
const crewRenameText = ref<Record<string, string>>({})
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
  } catch (e: unknown) {
    const status =
      e &&
      typeof e === 'object' &&
      'statusCode' in e &&
      typeof (e as { statusCode: unknown }).statusCode === 'number'
        ? (e as { statusCode: number }).statusCode
        : undefined
    if (status === 503) {
      error.value =
        'FC View connection isn’t available on this app right now. Please try again later.'
      return
    }
    error.value = e instanceof Error ? e.message : 'Failed to start FC View connection'
  }
}

async function disconnectFcv() {
  if (!isAuthenticated.value || disconnecting.value) return
  disconnecting.value = true
  error.value = null
  try {
    await $fetch<{ success: boolean }>('/api/fcv/disconnect', {
      method: 'POST',
      headers: authHeaders(),
    })
    connected.value = false
    showPreviewModal.value = false
    previewFlights.value = []
    sinceLastEntryOmittedAlreadyImported.value = 0
    includeDuplicatesInImport.value = false
    includeAlreadyImportedInImport.value = false
    heuristicDuplicateIndices.value = new Set()
    alreadyImportedIndices.value = new Set()
    perFlightEnrichment.value = {}
    expandedEnrichmentRows.value = new Set()
    crewReviewCandidates.value = []
    crewResolutionMode.value = {}
    crewPickSelection.value = {}
    crewRenameText.value = {}
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to disconnect FC View'
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
}

const emptyDupResponse: FcvDupCheckResponse = {
  duplicateFcvFlightIds: [],
  duplicateIndices: [],
  alreadyImportedIndices: [],
  heuristicDuplicateIndices: [],
  alreadyImportedFcvFlightIds: [],
}

async function requestCheckDuplicates(flights: FcvMappedEntry[]): Promise<FcvDupCheckResponse> {
  return await $fetch<FcvDupCheckResponse>('/api/fcv/check-duplicates', {
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
}

async function fetchFlights(opts?: { hideAlreadyImportedFromFcView?: boolean }) {
  if (!isAuthenticated.value) return
  loadingFetch.value = true
  error.value = null
  previewFlights.value = []
  sinceLastEntryOmittedAlreadyImported.value = 0
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
          includeScheduled: includeScheduled.value,
        },
      }
    )
    if (data?.success && Array.isArray(data.flights)) {
      includeDuplicatesInImport.value = false
      includeAlreadyImportedInImport.value = false
      heuristicDuplicateIndices.value = new Set()
      alreadyImportedIndices.value = new Set()
      perFlightEnrichment.value = {}
      expandedEnrichmentRows.value = new Set()
      crewReviewCandidates.value = []
      crewResolutionMode.value = {}
      crewPickSelection.value = {}
      crewRenameText.value = {}

      let flightsForPreview = data.flights
      let dup: FcvDupCheckResponse

      try {
        dup = await requestCheckDuplicates(flightsForPreview)

        if (opts?.hideAlreadyImportedFromFcView) {
          const dropIds = new Set(
            (dup.alreadyImportedFcvFlightIds ?? [])
              .map((id) => String(id).trim())
              .filter((s) => s.length > 0)
          )
          const dropIdx = new Set(dup.alreadyImportedIndices ?? [])
          let filtered = flightsForPreview
          if (dropIds.size > 0) {
            filtered = flightsForPreview.filter(
              (f) => !dropIds.has(String(f.fcv_flight_id ?? '').trim())
            )
          } else if (dropIdx.size > 0) {
            filtered = flightsForPreview.filter((_, i) => !dropIdx.has(i))
          }
          if (filtered.length < flightsForPreview.length) {
            sinceLastEntryOmittedAlreadyImported.value =
              flightsForPreview.length - filtered.length
            flightsForPreview = filtered
            dup =
              flightsForPreview.length > 0
                ? await requestCheckDuplicates(flightsForPreview)
                : { ...emptyDupResponse }
          }
        }

        previewFlights.value = flightsForPreview
        applyDupCheckToState(dup)
      } catch {
        error.value =
          'Fetched flights but could not check for duplicates. Review carefully before importing.'
        previewFlights.value = flightsForPreview
      }
      showPreviewModal.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch flights from FC View'
  } finally {
    loadingFetch.value = false
  }
}

async function fetchSinceLastEntry() {
  if (!isAuthenticated.value || loadingFetch.value || loadingSinceLast.value) return
  loadingSinceLast.value = true
  error.value = null
  try {
    const latest = await $fetch<{ date: string | null }>('/api/fcv/last-entry-date', {
      headers: authHeaders(),
    })
    const today = new Date().toISOString().slice(0, 10)
    const from = typeof latest?.date === 'string' && latest.date.trim() ? latest.date : today
    dateFrom.value = from
    dateTo.value = today
    await fetchFlights({ hideAlreadyImportedFromFcView: true })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch since last entry'
  } finally {
    loadingSinceLast.value = false
  }
}

async function confirmImport() {
  const flights = flightsToImportWithIndex.value.map(({ flight, index }) =>
    buildFlightForImport(flight, index)
  )
  if (flights.length === 0) return
  loadingImport.value = true
  error.value = null
  try {
    const review = crewReviewCandidates.value
    const crewNameOverridesPayload: Record<string, string> = {}
    const crewOverrideModesPayload: Record<string, CrewOverrideMode> = {}
    for (const c of review) {
      const id = c.fcv_flight_id
      const rawKey = c.raw_name
      const mode = crewResolutionMode.value[rawKey] ?? 'pick'
      crewOverrideModesPayload[id] = mode
      if (mode === 'pick') {
        crewNameOverridesPayload[id] = (crewPickSelection.value[rawKey] ?? '').trim()
      } else if (mode === 'rename') {
        crewNameOverridesPayload[id] = (crewRenameText.value[rawKey] ?? '').trim()
      } else {
        crewNameOverridesPayload[id] = c.raw_name
      }
    }

    const importBody: {
      flights: FcvMappedEntry[]
      crewNameOverrides?: Record<string, string>
      crewOverrideModes?: Record<string, CrewOverrideMode>
    } = { flights }
    if (review.length > 0) {
      importBody.crewNameOverrides = crewNameOverridesPayload
      importBody.crewOverrideModes = crewOverrideModesPayload
    }

    const result = await $fetch<{
      success: boolean
      import_batch_id?: string
      imported: number
      skipped: number
      requires_crew_review?: boolean
      review_candidates?: CrewReviewCandidate[]
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
      syncCrewReviewUiState(crewReviewCandidates.value)
      error.value =
        crewReviewCandidates.value.length > 0
          ? 'Review crew name matches below before importing.'
          : 'Crew review is required before importing.'
      return
    }
    emit('imported', {
      imported: typeof result?.imported === 'number' ? result.imported : flights.length,
      skipped: typeof result?.skipped === 'number' ? result.skipped : 0,
      importBatchId: result?.import_batch_id,
    })
    showPreviewModal.value = false
    previewFlights.value = []
    sinceLastEntryOmittedAlreadyImported.value = 0
    heuristicDuplicateIndices.value = new Set()
    alreadyImportedIndices.value = new Set()
    includeDuplicatesInImport.value = false
    includeAlreadyImportedInImport.value = false
    perFlightEnrichment.value = {}
    expandedEnrichmentRows.value = new Set()
    crewReviewCandidates.value = []
    crewResolutionMode.value = {}
    crewPickSelection.value = {}
    crewRenameText.value = {}
    await checkStatus()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import flights'
  } finally {
    loadingImport.value = false
  }
}

function closePreview() {
  showPreviewModal.value = false
  sinceLastEntryOmittedAlreadyImported.value = 0
  includeDuplicatesInImport.value = false
  includeAlreadyImportedInImport.value = false
  expandedEnrichmentRows.value = new Set()
  perFlightEnrichment.value = {}
  crewReviewCandidates.value = []
  crewResolutionMode.value = {}
  crewPickSelection.value = {}
  crewRenameText.value = {}
}

function isHeuristicDuplicateRow(index: number) {
  return heuristicDuplicateIndices.value.has(index)
}

function isAlreadyImportedRow(index: number) {
  return alreadyImportedIndices.value.has(index)
}

function isExcludedFromDefaultImport(index: number) {
  const heur = heuristicDuplicateIndices.value.has(index) && !includeDuplicatesInImport.value
  const imp = alreadyImportedIndices.value.has(index) && !includeAlreadyImportedInImport.value
  return heur || imp
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
  return c.candidates.includes(sel)
}

const heuristicDuplicateCount = computed(() => heuristicDuplicateIndices.value.size)
const alreadyImportedCount = computed(() => alreadyImportedIndices.value.size)
const crewReviewCount = computed(() => crewReviewCandidates.value.length)
const unresolvedCrewReviewCount = computed(
  () => crewReviewCandidates.value.filter((c) => !isCrewReviewRowResolved(c)).length
)
const isConnectOnly = computed(() => props.mode === 'connect')
const isFetchOnly = computed(() => props.mode === 'fetch')
const showConnectCta = computed(() => !isFetchOnly.value && !connected.value)
const showFetchControls = computed(() => !isConnectOnly.value && connected.value)
const showConnectManage = computed(() => isConnectOnly.value && connected.value)
const showFetchNeedsConnection = computed(
  () => isFetchOnly.value && !loadingStatus.value && !connected.value
)

const flightsToImport = computed(() => {
  return previewFlights.value.filter((_, i) => !isExcludedFromDefaultImport(i))
})

const flightsToImportWithIndex = computed(() => {
  return previewFlights.value
    .map((flight, index) => ({ flight, index }))
    .filter(({ index }) => !isExcludedFromDefaultImport(index))
})

const importCount = computed(() => flightsToImport.value.length)

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
  const out = toDisp(o.out)
  const off = toDisp(o.off)
  const on = toDisp(o.on)
  const inn = toDisp(o.in)
  const parts = [out, off, on, inn].filter(Boolean)
  return parts.length ? `OOOI ${parts.join(' · ')}` : ''
}

/** Other pilot from FC View (`training_*`); your leg role for quick scan of similar legs. */
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
    <template v-else-if="showConnectCta">
      <FcvApiDisclaimers class="mb-4" :is-dark-mode="isDarkMode" tone="dashboard" />
      <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Connect your FC View account to import flights into your logbook.
      </p>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          :class="btnConnectFcvClass"
          :disabled="!isAuthenticated"
          @click="connectFcv"
        >
          <Icon name="ri:external-link-line" size="18" class="shrink-0" />
          Connect FC View
        </button>
      </div>
    </template>
    <template v-else-if="showFetchControls">
      <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Choose a date range and fetch flights to preview before importing.
      </p>
      <div class="space-y-4">
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
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            :class="btnOutlineClass"
            :disabled="loadingFetch || loadingSinceLast"
            @click="fetchFlights"
          >
            <Icon name="ri:download-cloud-2-line" size="18" />
            {{ loadingFetch ? 'Fetching…' : 'Fetch flights' }}
          </button>
          <button
            type="button"
            :class="btnConnectFcvClass"
            :disabled="loadingFetch || loadingSinceLast"
            @click="fetchSinceLastEntry"
          >
            <Icon name="ri:history-line" size="18" />
            {{ loadingSinceLast ? 'Loading…' : 'Since last entry' }}
          </button>
        </div>
      </div>
    </template>
    <template v-else-if="showConnectManage">
      <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        FC View is connected. You can disconnect at any time.
      </p>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          :disabled="disconnecting"
          :class="[
            'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-colors border disabled:opacity-50 disabled:cursor-not-allowed',
            isDarkMode
              ? 'border-red-800/70 text-red-400 hover:bg-red-950/40'
              : 'border-red-200 text-red-600 hover:bg-red-50',
          ]"
          @click="disconnectFcv"
        >
          <Icon name="ri:plug-disconnect-line" size="18" class="shrink-0" />
          {{ disconnecting ? 'Disconnecting…' : 'Disconnect FC View' }}
        </button>
      </div>
    </template>
    <template v-else-if="showFetchNeedsConnection">
      <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
        Connect FC View in Settings under Data & Sync before fetching flights.
      </p>
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
              shown (Since last entry only lists new FC View flights).
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
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-for="(f, idx) in previewFlights"
            :key="`${f.fcv_flight_id || 'row'}-${idx}`"
            :class="[
              'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 border-b last:border-0 text-sm rounded-lg px-2 -mx-2',
              isDarkMode
                ? 'border-gray-700 text-gray-200'
                : 'border-gray-200 text-gray-800',
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
            <span
              v-if="isAlreadyImportedRow(idx)"
              :class="[
                'w-full text-xs font-medium sm:w-auto sm:ml-auto',
                isDarkMode ? 'text-slate-400' : 'text-slate-600',
              ]"
            >
              Already in logbook from FC View
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
                Flights with this same FC View name share one choice below.
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
                <span :class="isDarkMode ? 'text-orange-100' : 'text-orange-800'">Match to a suggested name</span>
                <select
                  v-model="crewPickSelection[crewRawKey(f.fcv_flight_id)]"
                  :class="[inputClass, 'w-full mt-0.5']"
                >
                  <option value="">Choose person…</option>
                  <option
                    v-for="candidate in crewCandidateByFlightId(f.fcv_flight_id)?.candidates || []"
                    :key="`${f.fcv_flight_id}-${candidate}`"
                    :value="candidate"
                  >
                    {{ candidate }}
                  </option>
                </select>
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
                  Adds this person to your catalog for future FC View imports.
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
                  Uses the FC View spelling exactly. Does not add a catalog person.
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
            'p-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
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
              {{ alreadyImportedCount }} flight(s) already imported from FC View (import would skip these).
            </p>
            <p
              v-if="heuristicDuplicateCount > 0"
              :class="isDarkMode ? 'text-amber-300' : 'text-amber-800'"
            >
              {{ heuristicDuplicateCount }} flight(s) may match an existing logbook entry.
            </p>
            <p
              v-if="heuristicDuplicateCount > 0"
              :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']"
            >
              Compared by calendar date, tail number, and route (IATA/ICAO normalized). Two flights same day with
              different out-times can still be told apart when both entries have OOOI out logged.
            </p>
            <p
              v-if="crewReviewCount > 0"
              :class="isDarkMode ? 'text-orange-300' : 'text-orange-800'"
            >
              {{ unresolvedCrewReviewCount }} of {{ crewReviewCount }} crew name match(es) still need review.
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
              <span>Include flights already imported from FC View</span>
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
              :disabled="loadingImport || importCount === 0 || unresolvedCrewReviewCount > 0"
              @click="confirmImport"
            >
              {{ loadingImport ? 'Importing…' : `Import ${importCount} flight(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
