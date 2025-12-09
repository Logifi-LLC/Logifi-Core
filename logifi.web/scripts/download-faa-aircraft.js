import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'fs'
import { parse } from 'csv-parse/sync'
import https from 'https'
import { createWriteStream, createReadStream } from 'fs'
import unzipper from 'unzipper'

const FAA_URL = 'https://registry.faa.gov/database/ReleasableAircraft.zip'
const OUTPUT_DIR = './server/data'
const OUTPUT_FILE = './server/data/aircraft-database.json'
const TEMP_ZIP = './ReleasableAircraft.zip'
const TEMP_EXTRACT = './faa-data'

async function downloadFile(url, dest) {
  console.log('📥 Downloading FAA database...')
  const file = createWriteStream(dest)
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file)
          file.on('finish', () => {
            file.close()
            console.log('✅ Download complete!')
            resolve()
          })
        }).on('error', reject)
      } else {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log('✅ Download complete!')
          resolve()
        })
      }
    }).on('error', reject)
  })
}

async function extractZip(zipPath, destDir) {
  console.log('📦 Extracting files...')
  
  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destDir }))
      .on('close', () => {
        console.log('✅ Extraction complete!')
        resolve()
      })
      .on('error', reject)
  })
}

function loadAircraftReference(acftrefPath) {
  console.log('\n📖 Loading aircraft reference data...')
  
  try {
    const csvContent = readFileSync(acftrefPath, 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      quote: false
    })
    
    const refData = {}
    for (const record of records) {
      const code = record['CODE']?.trim()
      if (code && code !== 'CODE') {
        refData[code] = {
          make: record['MFR']?.trim(),
          model: record['MODEL']?.trim()
        }
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(refData).length} aircraft types`)
    return refData
  } catch (error) {
    console.warn('⚠️  Could not load aircraft reference:', error.message)
    return {}
  }
}

function processMASTER(masterPath, acftRef) {
  console.log('\n🔄 Processing MASTER.txt (main aircraft registry)...')
  
  const csvContent = readFileSync(masterPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    quote: false
  })
  
  console.log(`📊 Total records: ${records.length}`)
  
  // Debug: Check columns and first record
  if (records.length > 0) {
    const firstRecord = records[0]
    const columns = Object.keys(firstRecord)
    console.log(`\n🔍 Available columns (${columns.length}):`)
    columns.slice(0, 15).forEach(col => {
      console.log(`   "${col}" = "${firstRecord[col]}"`)
    })
    console.log('   ...')
  }
  
  const database = {}
  let count = 0
  
  for (const record of records) {
    // Get ALL possible column names for N-NUMBER
    const nNumber = record['N-NUMBER'] || 
                    record['N NUMBER'] ||
                    record['NNUMBER'] ||
                    Object.values(record)[0]  // First column as fallback
    
    if (!nNumber || nNumber.trim() === '' || nNumber.trim() === 'N-NUMBER') {
      continue
    }
    
    const cleanReg = nNumber.toString().trim().replace(/[-\s]/g, '')
    if (cleanReg.length < 1) continue
    
    // Get make/model from reference
    const mfrMdlCode = record['MFR MDL CODE']?.toString().trim()
    let make, model
    if (mfrMdlCode && acftRef[mfrMdlCode]) {
      make = acftRef[mfrMdlCode].make
      model = acftRef[mfrMdlCode].model
    }
    
    // Map category
    const typeCode = record['TYPE AIRCRAFT']?.toString().trim()
    const categoryMap = {
      '1': 'Glider', '2': 'Balloon', '3': 'Blimp/Dirigible',
      '4': 'Fixed wing single engine', '5': 'Fixed wing multi engine',
      '6': 'Rotorcraft', '7': 'Weight-shift-control',
      '8': 'Powered Parachute', '9': 'Gyroplane'
    }
    
    database[cleanReg] = {
      registration: cleanReg,
      make: make || undefined,
      model: model || undefined,
      year: record['YEAR MFR']?.toString().trim() || undefined,
      engineType: record['ENG MFR MDL']?.toString().trim() || undefined,
      category: categoryMap[typeCode] || undefined,
      owner: record['NAME']?.toString().trim() || undefined,
      city: record['CITY']?.toString().trim() || undefined,
      state: record['STATE']?.toString().trim() || undefined,
      serialNumber: record['SERIAL NUMBER']?.toString().trim() || undefined,
      status: record['STATUS CODE']?.toString().trim() || undefined,
      source: 'FAA Database'
    }
    count++
    
    if (count <= 5) {
      const a = database[cleanReg]
      console.log(`\n   ✅ Entry ${count}: N${a.registration}`)
      console.log(`      ${a.year || '?'} ${a.make || '?'} ${a.model || '?'}`)
      console.log(`      Owner: ${a.owner}`)
    }
    
    if (count % 50000 === 0) {
      console.log(`\n   📊 Processed ${count.toLocaleString()} aircraft...`)
    }
  }
  
  console.log(`\n✅ Processed ${count.toLocaleString()} aircraft`)
  return database
}

function cleanup() {
  console.log('\n🧹 Cleaning up temporary files...')
  try {
    if (existsSync(TEMP_ZIP)) rmSync(TEMP_ZIP, { force: true })
    if (existsSync(TEMP_EXTRACT)) rmSync(TEMP_EXTRACT, { recursive: true, force: true })
    console.log('✅ Cleanup complete!')
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message)
  }
}

async function main() {
  try {
    console.log('🚀 FAA Aircraft Database Downloader')
    console.log('===================================\n')
    
    mkdirSync(OUTPUT_DIR, { recursive: true })
    
    await downloadFile(FAA_URL, TEMP_ZIP)
    await extractZip(TEMP_ZIP, TEMP_EXTRACT)
    
    const acftRef = loadAircraftReference(`${TEMP_EXTRACT}/ACFTREF.txt`)
    const database = processMASTER(`${TEMP_EXTRACT}/MASTER.txt`, acftRef)
    
    if (Object.keys(database).length === 0) {
      throw new Error('No aircraft data could be extracted')
    }
    
    console.log('\n💾 Saving database...')
    writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2))
    
    const totalAircraft = Object.keys(database).length
    const fileSizeMB = (readFileSync(OUTPUT_FILE).length / 1024 / 1024).toFixed(2)
    
    console.log(`\n📊 Final Statistics:`)
    console.log(`   Total aircraft: ${totalAircraft.toLocaleString()}`)
    console.log(`   File size: ${fileSizeMB} MB`)
    console.log(`   Date: ${new Date().toISOString().split('T')[0]}`)
    
    // Sample entries
    const keys = Object.keys(database)
    const samples = [keys[0], keys[Math.floor(keys.length/2)], keys[keys.length-1]].filter(Boolean)
    console.log(`\n📋 Sample entries:`)
    samples.forEach(key => {
      const a = database[key]
      console.log(`   N${a.registration}: ${a.year||'?'} ${a.make||'?'} ${a.model||'?'}`)
    })
    
    cleanup()
    
    console.log('\n✅ Done! Aircraft database is ready.')
    console.log(`\nℹ️  Instant offline access to ${totalAircraft.toLocaleString()} aircraft!`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    cleanup()
    process.exit(1)
  }
}

main()
