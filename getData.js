import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   This script is used to pull data from the html tables of worldOmeters and store it in a local json file cache   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Everything resolves relative to the project root rather than the working directory, so the bot
// can be started from anywhere (pm2, a service unit, a different folder) and still find its files.
const ROOT = path.dirname(fileURLToPath(import.meta.url));

export const WORLD_CACHE_FILE = path.join(ROOT, 'WorldStats.json');
export const US_CACHE_FILE = path.join(ROOT, 'USstats.json');
export const WORLD_SAMPLE_FILE = path.join(ROOT, 'sample-data', 'WorldStats.json');
export const US_SAMPLE_FILE = path.join(ROOT, 'sample-data', 'USstats.json');

const WORLD_URL = 'https://www.worldometers.info/coronavirus/';
const US_URL = 'https://www.worldometers.info/coronavirus/country/us/';

// Worldometers is a plain scrape target, so be a good citizen and identify ourselves rather than
// sending node's bare default agent.
const USER_AGENT = 'Covid-19-DiscordBot/2.0 (+https://github.com/EthyMoney/Covid-19)';
const REQUEST_TIMEOUT_MS = 30000;


// -------------------------------------------
//              TABLE PARSING
// -------------------------------------------

// Worldometers has reshuffled and removed table columns more than once over the years, which is what
// eventually broke the original hard-coded cell indexes. Everything below addresses columns by their
// header text instead, so a column moving is a non-event and a column disappearing degrades to ''.
function normalizeHeader(text) {
  return text.replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Builds a lookup of normalized header label -> column index for the given table.
function buildColumnMap(table) {
  const headerRow = table.tHead && table.tHead.rows[0];
  if (!headerRow) return null;
  const map = new Map();
  for (let i = 0; i < headerRow.cells.length; i++) {
    const key = normalizeHeader(headerRow.cells[i].textContent);
    // First occurrence wins, so a duplicated label can't clobber the real column.
    if (key && !map.has(key)) map.set(key, i);
  }
  return map;
}

// Reads a single cell by header name. Missing columns come back as '' so downstream display code can
// simply render "n/a" instead of throwing the way the old positional lookup did.
function cell(cells, columnMap, headerKey) {
  const index = columnMap.get(headerKey);
  if (index === undefined) return '';
  const target = cells[index];
  if (!target) return '';
  return target.textContent.replace(/\s+/g, ' ').trim();
}

// Maps a table row into an object using a { field: headerKey } spec.
function mapRow(cells, columnMap, spec) {
  const out = {};
  for (const [field, headerKey] of Object.entries(spec)) {
    out[field] = cell(cells, columnMap, headerKey);
  }
  return out;
}

async function fetchDocument(url, label) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) {
    console.log(chalk.red(`${label} cache retrieval error: `) + res.status);
    return null;
  }
  return new JSDOM(await res.text()).window.document;
}

async function writeCache(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}


// -------------------------------------------
//              DATA COLLECTION
// -------------------------------------------

// Collects data for U.S. states.
//
// Heads up for anyone reading this in the archive: Worldometers trimmed this table down over time. It
// used to carry new cases, new deaths, active cases and testing numbers per state, and those columns
// are simply gone now. What remains is totals, per-million rates and population.
export async function usStatsCacher(outputFile = US_CACHE_FILE) {
  try {
    const doc = await fetchDocument(US_URL, 'US');
    if (!doc) return null;

    const table = doc.getElementById('usa_table_countries_today');
    if (!table || !table.tBodies.item(0)) {
      console.log(chalk.red('US cache parse error: could not find the states table.'));
      return null;
    }

    const columnMap = buildColumnMap(table);
    if (!columnMap) {
      console.log(chalk.red('US cache parse error: could not read the table header row.'));
      return null;
    }

    const rows = table.tBodies.item(0).rows;
    const jsonArr = [];
    for (let i = 0; i < rows.length; i++) {
      const row = mapRow(rows[i].cells, columnMap, {
        state: 'usastate',
        cases: 'totalcases',
        newcases: 'newcases',
        deaths: 'totaldeaths',
        newdeaths: 'newdeaths',
        recoveries: 'totalrecovered',
        activecases: 'activecases',
        casesbypop: 'totcases1mpop',
        deathsbypop: 'deaths1mpop',
        testsperformed: 'totaltests',
        testsperformedbypop: 'tests1mpop',
        population: 'population'
      });
      // Skip the spacer/blank rows Worldometers sprinkles between sections.
      if (!row.state) continue;
      jsonArr.push(row);
    }

    if (jsonArr.length === 0) {
      console.log(chalk.red('US cache parse error: table contained no usable rows.'));
      return null;
    }

    await writeCache(outputFile, jsonArr);
    console.log(chalk.magenta(`Successfully cached US data!! (${jsonArr.length} rows)`));
    return jsonArr;
  } catch (err) {
    console.log(chalk.red('US cache retrieval failed: ') + chalk.cyan(err.message));
    return null;
  }
}

// Collects data for countries worldwide and overall global data.
// Index 0 of the returned array is the global totals object, every entry after it is a country,
// continent aggregate, or the "World" row.
export async function worldMetersCacher(outputFile = WORLD_CACHE_FILE) {
  try {
    const doc = await fetchDocument(WORLD_URL, 'World');
    if (!doc) return null;

    const mainCounters = doc.getElementsByClassName('maincounter-number');
    const tableCounters = doc.getElementsByClassName('number-table-main');
    const counterText = (collection, index) =>
      collection[index] ? collection[index].textContent.replace(/\s+/g, ' ').trim() : '';

    const jsonArr = [{
      'totalCases': counterText(mainCounters, 0),
      'totalDeaths': counterText(mainCounters, 1),
      'totalRecovered': counterText(mainCounters, 2),
      'totalActiveCases': counterText(tableCounters, 0)
    }];

    const table = doc.getElementById('main_table_countries_today');
    if (!table || !table.tBodies.item(0)) {
      console.log(chalk.red('World cache parse error: could not find the countries table.'));
      return null;
    }

    const columnMap = buildColumnMap(table);
    if (!columnMap) {
      console.log(chalk.red('World cache parse error: could not read the table header row.'));
      return null;
    }

    const rows = table.tBodies.item(0).rows;
    for (let i = 0; i < rows.length; i++) {
      const row = mapRow(rows[i].cells, columnMap, {
        country: 'countryother',
        cases: 'totalcases',
        newcases: 'newcases',
        deaths: 'totaldeaths',
        newdeaths: 'newdeaths',
        recovered: 'totalrecovered',
        newrecovered: 'newrecovered',
        activecases: 'activecases',
        criticalcases: 'seriouscritical',
        casesbypop: 'totcases1mpop',
        deathsbypop: 'deaths1mpop',
        testsperformed: 'totaltests',
        testsperformedbypop: 'tests1mpop',
        population: 'population',
        continent: 'continent'
      });
      // Worldometers includes an unnamed spacer row between the continent block and the country list.
      if (!row.country) continue;
      jsonArr.push(row);
    }

    if (jsonArr.length <= 1) {
      console.log(chalk.red('World cache parse error: table contained no usable rows.'));
      return null;
    }

    await writeCache(outputFile, jsonArr);
    console.log(chalk.magenta(`Successfully cached world data!! (${jsonArr.length - 1} rows)`));
    return jsonArr;
  } catch (err) {
    console.log(chalk.red('World cache retrieval failed: ') + chalk.cyan(err.message));
    return null;
  }
}


// -------------------------------------------
//            CACHE LOADING
// -------------------------------------------

async function readJson(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Loads whatever data we can get without hitting the network: the live cache written by a previous
// run first, then the bundled sample snapshot. The sample data is what keeps this bot demoable after
// Worldometers eventually takes the tracking pages down for good.
export async function loadStats(kind) {
  const [cacheFile, sampleFile] = kind === 'us'
    ? [US_CACHE_FILE, US_SAMPLE_FILE]
    : [WORLD_CACHE_FILE, WORLD_SAMPLE_FILE];

  const cached = await readJson(cacheFile);
  if (cached) return { data: cached, source: 'cache' };

  const sample = await readJson(sampleFile);
  if (sample) return { data: sample, source: 'sample' };

  return { data: null, source: 'none' };
}
