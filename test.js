//
// Smoke tests for the bot's pure logic, run against the committed sample data.
//
// Uses node's built-in test runner, so there is no test framework dependency to rot. Run with
// `npm test`. Nothing here touches the network or Discord.
//

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clean,
  present,
  withDaily,
  isWorldwide,
  isNorthKorea,
  normalizeName,
  resolveCountry,
  resolveState,
  rankSuggestions,
  timeUntilDayReset,
  abbrState
} from './stats.js';
import { commandList } from './commands.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const readSample = name =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'sample-data', name), 'utf8'));

const world = readSample('WorldStats.json');
const us = readSample('USstats.json');


test('sample data is present and shaped as expected', () => {
  assert.ok(Array.isArray(world) && world.length > 100, 'world sample should have many entries');
  assert.ok(Array.isArray(us) && us.length > 40, 'us sample should have all the states');
  // Index 0 of the world cache is the global totals object, not a country.
  assert.ok(world[0].totalCases, 'world[0] should carry global totals');
  assert.ok(world.slice(1).every(entry => entry.country), 'every world row should have a country');
  assert.ok(us.every(entry => entry.state), 'every us row should have a state');
});


test('clean() normalizes the source\'s many spellings of "no data"', () => {
  assert.equal(clean('1,234'), '1,234');
  assert.equal(clean('  1,234  '), '1,234');
  assert.equal(clean(''), 'n/a');
  assert.equal(clean('N/A'), 'n/a');
  assert.equal(clean(undefined), 'n/a');
  assert.equal(clean(null), 'n/a');
});


test('present() reports absence as an empty string', () => {
  assert.equal(present('5'), '5');
  assert.equal(present('N/A'), '');
  assert.equal(present(''), '');
});


test('withDaily() appends a daily delta only when there is one', () => {
  assert.equal(withDaily('1,000', '+25'), '1,000  (+25 today)');
  assert.equal(withDaily('1,000', ''), '1,000');
  assert.equal(withDaily('1,000', '0'), '1,000');
  assert.equal(withDaily('1,000', '+0'), '1,000');
  assert.equal(withDaily('1,000', 'N/A'), '1,000');
  // This is the case that used to crash: a column that no longer exists at all.
  assert.equal(withDaily('1,000', undefined), '1,000');
});


test('isWorldwide() recognizes the global aliases', () => {
  for (const term of ['', undefined, null, 'world', 'World', 'worldwide', 'global', 'total', 'ALL']) {
    assert.equal(isWorldwide(term), true, `${term} should count as worldwide`);
  }
  assert.equal(isWorldwide('Germany'), false);
});


test('normalizeName() strips case, spaces and punctuation', () => {
  assert.equal(normalizeName('S. Korea'), 'skorea');
  assert.equal(normalizeName('North America'), 'northamerica');
  assert.equal(normalizeName('  UK  '), 'uk');
});


test('resolveCountry() finds countries by exact name', () => {
  assert.equal(resolveCountry(world, 'Germany').country, 'Germany');
  assert.equal(resolveCountry(world, 'germany').country, 'Germany');
  assert.equal(resolveCountry(world, 'ITALY').country, 'Italy');
});


test('resolveCountry() handles 2-letter country codes', () => {
  assert.equal(resolveCountry(world, 'de').country, 'Germany');
  assert.equal(resolveCountry(world, 'IT').country, 'Italy');
  assert.equal(resolveCountry(world, 'fr').country, 'France');
});


test('resolveCountry() handles the data source\'s naming quirks', () => {
  // Worldometers spells these differently than the country-code library does.
  assert.equal(resolveCountry(world, 'us').country, 'USA');
  assert.equal(resolveCountry(world, 'united states').country, 'USA');
  assert.equal(resolveCountry(world, 'uk').country, 'UK');
  assert.equal(resolveCountry(world, 'gb').country, 'UK');
  assert.equal(resolveCountry(world, 'united kingdom').country, 'UK');
  assert.equal(resolveCountry(world, 'korea').country, 'S. Korea');
  assert.equal(resolveCountry(world, 'south korea').country, 'S. Korea');
  assert.equal(resolveCountry(world, 'kr').country, 'S. Korea');
  assert.equal(resolveCountry(world, 'czech republic').country, 'Czechia');
  assert.equal(resolveCountry(world, 'cz').country, 'Czechia');
});


test('resolveCountry() finds continents and the World row', () => {
  assert.equal(resolveCountry(world, 'North America').country, 'North America');
  assert.equal(resolveCountry(world, 'europe').country, 'Europe');
  assert.equal(resolveCountry(world, 'World').country, 'World');
});


test('resolveCountry() rejects nonsense instead of guessing', () => {
  assert.equal(resolveCountry(world, 'Notacountry'), null);
  assert.equal(resolveCountry(world, ''), null);
  assert.equal(resolveCountry(world, 'zz'), null);
});


test('resolveState() finds states by name and abbreviation', () => {
  assert.equal(resolveState(us, 'Minnesota').state, 'Minnesota');
  assert.equal(resolveState(us, 'minnesota').state, 'Minnesota');
  assert.equal(resolveState(us, 'MN').state, 'Minnesota');
  assert.equal(resolveState(us, 'mn').state, 'Minnesota');
  assert.equal(resolveState(us, 'New York').state, 'New York');
  assert.equal(resolveState(us, 'ny').state, 'New York');
  // DC was missing from the original abbreviation table even though the data source lists it.
  assert.equal(resolveState(us, 'DC').state, 'District Of Columbia');
});


test('resolveState() rejects unknown input', () => {
  assert.equal(resolveState(us, 'Ontario'), null);
  assert.equal(resolveState(us, ''), null);
  assert.equal(resolveState(us, null), null);
});


test('every US state resolves from its own abbreviation', () => {
  for (const entry of us) {
    if (entry.state === 'USA Total') continue;
    const abbr = abbrState(entry.state, 'abbr');
    assert.ok(abbr, `${entry.state} should have an abbreviation`);
    assert.equal(resolveState(us, abbr).state, entry.state, `${abbr} should resolve to ${entry.state}`);
  }
});


test('rankSuggestions() puts prefix matches first and caps at 25', () => {
  const pool = ['India', 'Indonesia', 'Finland', 'Ireland'];
  const ranked = rankSuggestions(pool, 'ind');
  assert.deepEqual(ranked, ['India', 'Indonesia']);

  // "land" appears inside Finland and Ireland but starts neither.
  assert.deepEqual(rankSuggestions(pool, 'land'), ['Finland', 'Ireland']);

  const names = world.slice(1).map(entry => entry.country);
  assert.ok(rankSuggestions(names, '').length <= 25, 'Discord allows at most 25 choices');
  assert.ok(rankSuggestions(names, 'a').length <= 25, 'Discord allows at most 25 choices');
});


test('isNorthKorea() catches the variants that have no data', () => {
  for (const term of ['nk', 'north korea', 'North Korea', 'DPRK']) {
    assert.equal(isNorthKorea(term), true, `${term} should be recognized`);
  }
  assert.equal(isNorthKorea('south korea'), false);
});


test('timeUntilDayReset() counts down to midnight UTC', () => {
  // 22:00 UTC leaves two hours on the clock.
  const twoHoursOut = timeUntilDayReset(new Date('2026-07-28T22:00:00Z'));
  assert.match(twoHoursOut, /approximately 1hrs, 59mins|approximately 2hrs, 0mins/);

  // Just before midnight it should switch to the "very soon" wording.
  assert.equal(
    timeUntilDayReset(new Date('2026-07-28T23:55:00Z')),
    'Today\'s counts will reset very soon.'
  );

  // Crossing a month boundary must roll into August rather than producing a negative result.
  const monthEnd = timeUntilDayReset(new Date('2026-07-31T12:00:00Z'));
  assert.match(monthEnd, /approximately 12hrs, 0mins/);
  // 2026-08-01T00:00:00Z as a unix timestamp, proving the rollover landed on the right day.
  assert.match(monthEnd, /<t:1785542400:R>/);
});


test('slash command schema is valid for Discord', () => {
  const json = commandList.map(command => command.toJSON());
  assert.equal(json.length, 1);

  const covid = json[0];
  assert.equal(covid.name, 'covid');
  assert.ok(covid.description.length <= 100);
  assert.ok(covid.options.length <= 25, 'Discord allows at most 25 subcommands');

  const names = covid.options.map(option => option.name);
  for (const expected of ['summary', 'cases', 'deaths', 'recoveries', 'state', 'help']) {
    assert.ok(names.includes(expected), `missing subcommand: ${expected}`);
  }
  assert.equal(new Set(names).size, names.length, 'subcommand names must be unique');

  for (const sub of covid.options) {
    assert.match(sub.name, /^[a-z-]{1,32}$/, `${sub.name} is not a valid command name`);
    assert.ok(sub.description.length > 0 && sub.description.length <= 100);
    for (const option of sub.options || []) {
      assert.ok(option.description.length > 0 && option.description.length <= 100);
    }
  }

  // The `state` subcommand takes a required, autocompleting option.
  const state = covid.options.find(option => option.name === 'state');
  assert.equal(state.options[0].required, true);
  assert.equal(state.options[0].autocomplete, true);
});


test('summary fields render without throwing for every country in the sample', () => {
  // This is the regression guard for the crash that started all of this: the old code indexed table
  // cells positionally and blew up when the data source dropped columns.
  for (const entry of world.slice(1)) {
    assert.equal(typeof withDaily(entry.cases, entry.newcases), 'string');
    assert.equal(typeof withDaily(entry.deaths, entry.newdeaths), 'string');
    assert.equal(typeof clean(entry.activecases), 'string');
    assert.equal(typeof clean(entry.testsperformed), 'string');
  }
  for (const entry of us) {
    assert.equal(typeof withDaily(entry.cases, entry.newcases), 'string');
    assert.equal(typeof clean(entry.recoveries), 'string');
    assert.equal(typeof clean(entry.population), 'string');
  }
});
