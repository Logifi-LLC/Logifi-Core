import { mkdirSync, readFileSync, rmSync, existsSync, createWriteStream, createReadStream } from 'fs'
import https from 'https'
import unzipper from 'unzipper'
import { ingestFaaExtract, writeAircraftDatabase } from './faaAircraftIngest.mjs'

const FAA_URL = 'https://registry.faa.gov/database/ReleasableAircraft.zip'
const OUTPUT_DIR = './server/data'
const TEMP_ZIP = './ReleasableAircraft.zip'
const TEMP_EXTRACT = './faa-data'

async function downloadFile(url, dest) {
  console.log('Downloading FAA database...')
  const file = createWriteStream(dest)

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file)
          file.on('finish', () => {
            file.close()
            console.log('Download complete')
            resolve()
          })
        }).on('error', reject)
      } else {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log('Download complete')
          resolve()
        })
      }
    }).on('error', reject)
  })
}

async function extractZip(zipPath, destDir) {
  console.log('Extracting files...')
  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destDir }))
      .on('close', () => {
        console.log('Extraction complete')
        resolve()
      })
      .on('error', reject)
  })
}

function cleanup() {
  console.log('Cleaning up temporary files...')
  try {
    if (existsSync(TEMP_ZIP)) rmSync(TEMP_ZIP, { force: true })
    if (existsSync(TEMP_EXTRACT)) rmSync(TEMP_EXTRACT, { recursive: true, force: true })
    console.log('Cleanup complete')
  } catch (error) {
    console.warn('Cleanup warning:', error.message)
  }
}

async function main() {
  try {
    console.log('FAA Aircraft Database Downloader')
    console.log('================================\n')

    mkdirSync(OUTPUT_DIR, { recursive: true })

    await downloadFile(FAA_URL, TEMP_ZIP)
    await extractZip(TEMP_ZIP, TEMP_EXTRACT)

    const { database, stats } = ingestFaaExtract(TEMP_EXTRACT)
    const generatedAt = new Date().toISOString()
    const { meta } = writeAircraftDatabase(OUTPUT_DIR, database, generatedAt)

    const fileSizeMB = (readFileSync(`${OUTPUT_DIR}/aircraft-database.json`).length / 1024 / 1024).toFixed(2)

    console.log(`Loaded ${stats.acftRefCount.toLocaleString()} aircraft types`)
    console.log(`Loaded ${stats.engineRefCount.toLocaleString()} engine types`)
    console.log(`Make/model matches: ${stats.makeModelHits.toLocaleString()}`)
    console.log(`Engine model matches: ${stats.engineModelHits.toLocaleString()}`)
    console.log(`\nFinal statistics:`)
    console.log(`   Total aircraft: ${meta.recordCount.toLocaleString()}`)
    console.log(`   File size: ${fileSizeMB} MB`)
    console.log(`   Date: ${generatedAt.split('T')[0]}`)

    const keys = Object.keys(database)
    const samples = [keys[0], keys[Math.floor(keys.length / 2)], keys[keys.length - 1]].filter(Boolean)
    console.log('\nSample entries:')
    samples.forEach((key) => {
      const a = database[key]
      console.log(
        `   N${a.registration}: ${a.year || '?'} ${a.make || '?'} ${a.model || '?'} · ${a.engineType || '?'} · ${a.engineModel || '?'}`
      )
    })

    cleanup()
    console.log('\nDone. Aircraft database is ready.')
  } catch (error) {
    console.error('\nError:', error.message)
    cleanup()
    process.exit(1)
  }
}

main()
