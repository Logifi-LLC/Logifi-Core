import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

const CSV_PARSE_OPTIONS = {
  columns: (header) =>
    header.map((h) => String(h ?? '').replace(/^\uFEFF/, '').trim()),
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
  relax_column_count: true,
  bom: true,
  quote: false,
}

const AIRCRAFT_CATEGORY_MAP = {
  1: 'Glider',
  2: 'Balloon',
  3: 'Blimp/Dirigible',
  4: 'Fixed wing single engine',
  5: 'Fixed wing multi engine',
  6: 'Rotorcraft',
  7: 'Weight-shift-control',
  8: 'Powered Parachute',
  9: 'Gyroplane',
}

const ENGINE_TYPE_MAP = {
  0: 'None',
  1: 'Piston',
  2: 'Turboprop',
  3: 'Turboshaft',
  4: 'Turbojet',
  5: 'Turbofan',
  6: 'Ramjet',
  7: '2-Cycle',
  8: '4-Cycle',
  9: 'Unknown',
  10: 'Electric',
  11: 'Rotary',
}

export function mapEngineType(code) {
  const trimmed = String(code ?? '').trim()
  if (!trimmed) return undefined
  const mapped = ENGINE_TYPE_MAP[trimmed] ?? ENGINE_TYPE_MAP[Number(trimmed)]
  return mapped || undefined
}

export function mapAircraftCategory(code) {
  const trimmed = String(code ?? '').trim()
  if (!trimmed) return undefined
  return AIRCRAFT_CATEGORY_MAP[trimmed] ?? AIRCRAFT_CATEGORY_MAP[Number(trimmed)]
}

export function parseCsvRecords(csvContent) {
  const text = String(csvContent ?? '').replace(/^\uFEFF/, '')
  if (!text.trim()) return []
  return parse(text, CSV_PARSE_OPTIONS)
}

function normalizeKey(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toUpperCase()
}

export function recordGet(record, ...names) {
  if (!record) return ''
  const lookup = new Map()
  for (const key of Object.keys(record)) {
    lookup.set(normalizeKey(key), key)
  }
  for (const name of names) {
    const actual = lookup.get(normalizeKey(name))
    if (actual == null) continue
    const value = record[actual]
    if (value == null) continue
    const trimmed = String(value).trim()
    if (trimmed) return trimmed
  }
  return ''
}

function compactRecord(record) {
  const out = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

export function indexByCode(records, fields) {
  const index = {}
  for (const record of records) {
    const code = recordGet(record, 'CODE')
    if (!code || code === 'CODE') continue
    const entry = {}
    for (const [outKey, sourceNames] of Object.entries(fields)) {
      const value = recordGet(record, ...sourceNames)
      if (value) entry[outKey] = value
    }
    index[code] = entry
    const unpadded = code.replace(/^0+/, '')
    if (unpadded && unpadded !== code && !index[unpadded]) {
      index[unpadded] = entry
    }
  }
  return index
}

export function lookupByCode(index, code) {
  const trimmed = String(code ?? '').trim()
  if (!trimmed) return undefined
  return index[trimmed] || index[trimmed.replace(/^0+/, '')]
}

export function loadAircraftReferenceRecords(records) {
  return indexByCode(records, {
    make: ['MFR', 'MANUFACTURER'],
    model: ['MODEL'],
  })
}

export function loadEngineReferenceRecords(records) {
  return indexByCode(records, {
    make: ['MFR', 'MANUFACTURER'],
    model: ['MODEL'],
  })
}

export function formatEngineModel(engineRef) {
  if (!engineRef) return undefined
  const parts = [engineRef.make, engineRef.model].filter(Boolean)
  return parts.length ? parts.join(' ') : undefined
}

export function processMasterRecords(records, acftRef, engineRef) {
  const database = {}
  let makeModelHits = 0
  let engineModelHits = 0
  let skipped = 0

  for (const record of records) {
    const nNumber = recordGet(
      record,
      'N-NUMBER',
      'N NUMBER',
      'NNUMBER',
      'N_NUMBER'
    )
    if (!nNumber || nNumber === 'N-NUMBER') {
      skipped++
      continue
    }

    const cleanReg = nNumber.replace(/[-\s]/g, '')
    if (!cleanReg) {
      skipped++
      continue
    }

    const mfrMdlCode = recordGet(record, 'MFR MDL CODE', 'MFR-MDL-CODE')
    const acft = lookupByCode(acftRef, mfrMdlCode)
    if (acft?.make || acft?.model) makeModelHits++

    const engMfrMdl = recordGet(record, 'ENG MFR MDL', 'ENG-MFR-MDL')
    const engine = lookupByCode(engineRef, engMfrMdl)
    const engineModel = formatEngineModel(engine)
    if (engineModel) engineModelHits++

    database[cleanReg] = compactRecord({
      registration: cleanReg,
      make: acft?.make,
      model: acft?.model,
      year: recordGet(record, 'YEAR MFR', 'YEAR-MFR'),
      engineType: mapEngineType(recordGet(record, 'TYPE ENGINE', 'TYPE ENG', 'TYPE-ENG')),
      engineModel,
      category: mapAircraftCategory(recordGet(record, 'TYPE AIRCRAFT', 'TYPE-AIRCRAFT')),
      owner: recordGet(record, 'NAME'),
      city: recordGet(record, 'CITY'),
      state: recordGet(record, 'STATE'),
      serialNumber: recordGet(record, 'SERIAL NUMBER', 'SERIAL-NUMBER'),
      status: recordGet(record, 'STATUS CODE', 'STATUS-CODE'),
    })
  }

  return {
    database,
    stats: {
      recordCount: Object.keys(database).length,
      makeModelHits,
      engineModelHits,
      skipped,
    },
  }
}

export function findNamedFile(dir, fileName) {
  const target = fileName.toUpperCase()
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      if (entry.name.toUpperCase() === target) return full
    }
  }
  return null
}

export function findFaaRegistryFiles(extractDir) {
  return {
    master: findNamedFile(extractDir, 'MASTER.txt'),
    acftref: findNamedFile(extractDir, 'ACFTREF.txt'),
    engine: findNamedFile(extractDir, 'ENGINE.txt'),
  }
}

export function loadCsvFile(path) {
  return parseCsvRecords(readFileSync(path, 'utf-8'))
}

export function ingestFaaExtract(extractDir) {
  const files = findFaaRegistryFiles(extractDir)
  if (!files.master) {
    throw new Error(`MASTER.txt not found under ${extractDir}`)
  }
  if (!files.acftref) {
    throw new Error(`ACFTREF.txt not found under ${extractDir}`)
  }
  if (!files.engine) {
    throw new Error(`ENGINE.txt not found under ${extractDir}`)
  }

  const acftRef = loadAircraftReferenceRecords(loadCsvFile(files.acftref))
  const engineRef = loadEngineReferenceRecords(loadCsvFile(files.engine))
  const { database, stats } = processMasterRecords(
    loadCsvFile(files.master),
    acftRef,
    engineRef
  )

  if (stats.recordCount === 0) {
    throw new Error('No aircraft data could be extracted')
  }

  return {
    database,
    stats: {
      ...stats,
      acftRefCount: Object.keys(acftRef).length,
      engineRefCount: Object.keys(engineRef).length,
      files,
    },
  }
}

export function writeAircraftDatabase(outputDir, database, generatedAt = new Date().toISOString()) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }
  const dbPath = join(outputDir, 'aircraft-database.json')
  const metaPath = join(outputDir, 'aircraft-database-meta.json')
  writeFileSync(dbPath, JSON.stringify(database))
  const meta = {
    generatedAt,
    recordCount: Object.keys(database).length,
  }
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n')
  return { dbPath, metaPath, meta }
}
