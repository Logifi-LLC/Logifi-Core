#!/usr/bin/env node
/**
 * Compare log entry IDs: localhost vs production.
 * Usage: node scripts/compare-ids.mjs <production.json> <localhost.json>
 * Output: IDs in localhost that are missing on production (for Supabase Table Editor).
 */
import { readFileSync } from 'fs';

const productionPath = process.argv[2];
const localhostPath = process.argv[3];
if (!productionPath || !localhostPath) {
  console.error('Usage: node scripts/compare-ids.mjs <production.json> <localhost.json>');
  process.exit(1);
}

const production = JSON.parse(readFileSync(productionPath, 'utf8'));
const localhost = JSON.parse(readFileSync(localhostPath, 'utf8'));
const prodSet = new Set(production);
const locSet = new Set(localhost);
const missingOnProduction = localhost.filter((id) => !prodSet.has(id));
const missingOnLocalhost = production.filter((id) => !locSet.has(id));

console.log('Localhost count:', localhost.length);
console.log('Production count:', production.length);
console.log('\n--- IDs on localhost but MISSING on production (' + missingOnProduction.length + ') ---');
console.log(JSON.stringify(missingOnProduction));
if (missingOnLocalhost.length) {
  console.log('\n--- IDs on production but missing on localhost (' + missingOnLocalhost.length + ') ---');
  console.log(JSON.stringify(missingOnLocalhost));
}
