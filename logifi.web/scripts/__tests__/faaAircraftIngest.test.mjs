import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it, afterEach } from 'vitest'
import {
  findFaaRegistryFiles,
  ingestFaaExtract,
  loadAircraftReferenceRecords,
  loadEngineReferenceRecords,
  mapEngineType,
  parseCsvRecords,
  processMasterRecords,
  recordGet,
} from '../faaAircraftIngest.mjs'

const MASTER_CSV = [
  'N-NUMBER,SERIAL NUMBER,MFR MDL CODE,ENG MFR MDL,YEAR MFR,NAME,CITY,STATE,TYPE AIRCRAFT,TYPE ENGINE,STATUS CODE',
  '653PA,172S12163,2072738,41597,2018,PURDUE AVIATION LLC,WEST LAFAYETTE,IN,4,1,V',
].join('\n')

const ACFTREF_CSV = [
  'CODE,MFR,MODEL',
  '2072738,CESSNA,172S',
].join('\n')

const ENGINE_CSV = [
  'CODE,MFR,MODEL,TYPE,HORSEPOWER,THRUST',
  '41597,LYCOMING,IO-360-L2A,1,180,0',
].join('\n')

const tempDirs = []

function makeExtractDir(layout = 'flat') {
  const root = mkdtempSync(join(tmpdir(), 'faa-ingest-'))
  tempDirs.push(root)
  const dest = layout === 'nested' ? join(root, 'ReleasableAircraft') : root
  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, 'MASTER.txt'), MASTER_CSV)
  writeFileSync(join(dest, 'ACFTREF.txt'), '\uFEFF' + ACFTREF_CSV)
  writeFileSync(join(dest, 'ENGINE.txt'), ENGINE_CSV)
  return root
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('mapEngineType', () => {
  it('maps FAA TYPE ENGINE codes to pilot-facing labels', () => {
    expect(mapEngineType('1')).toBe('Piston')
    expect(mapEngineType('2')).toBe('Turboprop')
    expect(mapEngineType('5')).toBe('Turbofan')
    expect(mapEngineType('10')).toBe('Electric')
    expect(mapEngineType('')).toBeUndefined()
  })
})

describe('recordGet', () => {
  it('matches columns case-insensitively and ignores BOM', () => {
    expect(recordGet({ '\uFEFFCODE': '2072738', Mfr: 'CESSNA' }, 'CODE')).toBe('2072738')
    expect(recordGet({ 'mfr mdl code': '2072738' }, 'MFR MDL CODE')).toBe('2072738')
  })
})

describe('processMasterRecords', () => {
  it('joins ACFTREF and ENGINE and stores owner from NAME', () => {
    const acftRef = loadAircraftReferenceRecords(parseCsvRecords(ACFTREF_CSV))
    const engineRef = loadEngineReferenceRecords(parseCsvRecords(ENGINE_CSV))
    const { database, stats } = processMasterRecords(
      parseCsvRecords(MASTER_CSV),
      acftRef,
      engineRef
    )

    expect(stats.recordCount).toBe(1)
    expect(database['653PA']).toMatchObject({
      registration: '653PA',
      make: 'CESSNA',
      model: '172S',
      year: '2018',
      engineType: 'Piston',
      engineModel: 'LYCOMING IO-360-L2A',
      category: 'Fixed wing single engine',
      owner: 'PURDUE AVIATION LLC',
      city: 'WEST LAFAYETTE',
      state: 'IN',
    })
    expect(database['653PA'].engineType).not.toBe('41597')
  })
})

describe('ingestFaaExtract', () => {
  it('finds registry files in a nested extract directory and joins BOM-prefixed ACFTREF', () => {
    const extractDir = makeExtractDir('nested')
    const files = findFaaRegistryFiles(extractDir)
    expect(files.master).toMatch(/MASTER\.txt$/i)
    expect(files.acftref).toMatch(/ACFTREF\.txt$/i)
    expect(files.engine).toMatch(/ENGINE\.txt$/i)

    const { database, stats } = ingestFaaExtract(extractDir)
    expect(stats.makeModelHits).toBe(1)
    expect(stats.engineModelHits).toBe(1)
    expect(database['653PA'].make).toBe('CESSNA')
    expect(database['653PA'].engineModel).toBe('LYCOMING IO-360-L2A')
  })
})
