//
// Captures a point-in-time snapshot of the Worldometers data into sample-data/.
//
// This exists so the bot stays demoable after Worldometers eventually takes the coronavirus tracking
// pages down. Run it with `npm run snapshot`. The bot falls back to whatever this produces when a
// live scrape fails, so the committed snapshot is the permanent "what this looked like" record.
//

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import {
  usStatsCacher,
  worldMetersCacher,
  US_SAMPLE_FILE,
  WORLD_SAMPLE_FILE
} from './getData.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.cyan('Capturing sample data snapshot from Worldometers...\n'));

const world = await worldMetersCacher(WORLD_SAMPLE_FILE);
const us = await usStatsCacher(US_SAMPLE_FILE);

if (!world || !us) {
  console.log(chalk.red('\nSnapshot incomplete. One or both sources failed to collect.'));
  process.exit(1);
}

// Record where and when this came from, so the archived data is not a mystery blob later on.
const capturedAt = new Date().toISOString();
const manifest = {
  capturedAt,
  source: 'https://www.worldometers.info/coronavirus/',
  note: 'Point-in-time snapshot captured before archiving the project. Worldometers trimmed the US ' +
    'state table over time; new cases, new deaths, active cases and testing columns are no longer ' +
    'published per state and are absent from this data.',
  world: {
    file: 'sample-data/WorldStats.json',
    totals: world[0],
    entries: world.length - 1
  },
  unitedStates: {
    file: 'sample-data/USstats.json',
    entries: us.length
  }
};

await fs.writeFile(
  path.join(ROOT, 'sample-data', 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(chalk.greenBright('\nSnapshot complete.'));
console.log(`  Captured at:   ${capturedAt}`);
console.log(`  World entries: ${manifest.world.entries}`);
console.log(`  US entries:    ${manifest.unitedStates.entries}`);
console.log(`  Global totals: ${world[0].totalCases} cases, ${world[0].totalDeaths} deaths`);
