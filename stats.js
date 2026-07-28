//
// Pure lookup and formatting helpers used by the bot commands.
//
// These live apart from main.js so they can be exercised without a Discord connection -- see
// `npm test`. Nothing in here touches the network, the filesystem, or the client; every function
// takes the cache it should read as an argument.
//

import * as shortcountrynames from 'shortcountrynames';

// Define custom country codes to match input to the data cache key values
shortcountrynames.names.UK = 'UK';
shortcountrynames.names.EU = 'Europe';


// -------------------------------------------
//               FORMATTING
// -------------------------------------------

// Trims a scraped value and normalizes the source's various "no data" spellings into one.
export function clean(value) {
  const text = (value === undefined || value === null) ? '' : String(value).trim();
  if (text === '' || text.toUpperCase() === 'N/A') return 'n/a';
  return text;
}

// Same idea, but returns '' for missing data so callers can test for presence.
export function present(value) {
  const text = clean(value);
  return text === 'n/a' ? '' : text;
}

// Renders a total with its daily change appended, matching the original "(+123 today)" style.
export function withDaily(total, delta) {
  const value = clean(total);
  const change = present(delta);
  if (!change || change === '0' || change === '+0') return value;
  return `${value}  (${change} today)`;
}

export function normalizeName(value) {
  return String(value === undefined || value === null ? '' : value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isWorldwide(param) {
  if (!param) return true;
  return ['world', 'worldwide', 'global', 'total', 'all'].includes(String(param).trim().toLowerCase());
}


// -------------------------------------------
//              INPUT RESOLUTION
// -------------------------------------------

// Friendly input terms mapped onto the exact spellings Worldometers uses in its table.
const COUNTRY_ALIASES = new Map([
  ['korea', 'S. Korea'], ['southkorea', 'S. Korea'], ['skorea', 'S. Korea'], ['kor', 'S. Korea'], ['kr', 'S. Korea'],
  ['unitedkingdom', 'UK'], ['greatbritain', 'UK'], ['gb', 'UK'], ['england', 'UK'],
  ['unitedstates', 'USA'], ['unitedstatesofamerica', 'USA'], ['us', 'USA'], ['america', 'USA'],
  ['unitedarabemirates', 'UAE'], ['ae', 'UAE'],
  ['czechrepublic', 'Czechia'], ['czech', 'Czechia'],
  ['ivorycoast', 'Ivory Coast'], ['cotedivoire', 'Ivory Coast'],
  ['drc', 'DRC'], ['democraticrepublicofthecongo', 'DRC']
]);

// North Korea never reported data, so it gets its own explicit answer rather than a lookup failure.
const NORTH_KOREA = new Set(['nkorea', 'northkorea', 'nk', 'dprk', 'prk']);

export function isNorthKorea(input) {
  return NORTH_KOREA.has(normalizeName(input));
}

// Resolves free-form user input to a row in the world cache. Tries aliases, then an exact match, then
// the 2-letter country code table, then unambiguous prefix/substring matches.
export function resolveCountry(worldCache, input) {
  if (!worldCache || worldCache.length < 2) return null;
  const entries = worldCache.slice(1).filter(entry => entry.country);
  const query = normalizeName(input);
  if (!query) return null;

  const byName = name => entries.find(entry => normalizeName(entry.country) === normalizeName(name));

  const alias = COUNTRY_ALIASES.get(query);
  if (alias) {
    const hit = byName(alias);
    if (hit) return hit;
  }

  const exact = entries.find(entry => normalizeName(entry.country) === query);
  if (exact) return exact;

  const trimmed = String(input).trim();
  if (trimmed.length === 2) {
    const full = shortcountrynames.to_name(trimmed.toUpperCase());
    if (full) {
      const hit = byName(full);
      if (hit) return hit;
    }
  }

  // Only accept a fuzzy match when it is unambiguous, so "south" doesn't silently pick a random country.
  const starts = entries.filter(entry => normalizeName(entry.country).startsWith(query));
  if (starts.length === 1) return starts[0];
  const contains = entries.filter(entry => normalizeName(entry.country).includes(query));
  if (contains.length === 1) return contains[0];

  return null;
}

// Resolves free-form user input to a row in the US states cache.
export function resolveState(usCache, input) {
  if (!usCache || usCache.length === 0) return null;
  const entries = usCache.filter(entry => entry.state);
  const trimmed = String(input === undefined || input === null ? '' : input).trim();
  if (!trimmed) return null;

  const query = normalizeName(trimmed);
  const exact = entries.find(entry => normalizeName(entry.state) === query);
  if (exact) return exact;

  if (trimmed.length === 2) {
    const full = abbrState(trimmed.toUpperCase(), 'name');
    if (full) {
      const hit = entries.find(entry => normalizeName(entry.state) === normalizeName(full));
      if (hit) return hit;
    }
  }

  const starts = entries.filter(entry => normalizeName(entry.state).startsWith(query));
  if (starts.length === 1) return starts[0];

  return null;
}

// Ranks autocomplete suggestions, putting prefix matches ahead of substring matches so typing "ind"
// offers India before Indonesia.
export function rankSuggestions(pool, query) {
  const names = pool.filter(Boolean);
  const q = String(query || '').trim().toLowerCase();
  if (!q) return names.slice(0, 25);
  const starts = names.filter(name => name.toLowerCase().startsWith(q));
  const contains = names.filter(name => !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, 25);
}


// -------------------------------------------
//              MISC UTILITIES
// -------------------------------------------

// Get time until next reset of daily stats.
// Worldometers rolls its daily counters at midnight GMT, so this is computed in UTC rather than
// against the host machine's local clock the way the original hard-coded hour math was.
export function timeUntilDayReset(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  const msLeft = next - now.getTime();
  const hrsLeft = Math.floor(msLeft / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);

  if (msLeft <= 15 * 60000) {
    return 'Today\'s counts will reset very soon.';
  }
  // The <t:...:R> tag renders as a live countdown in each viewer's own timezone.
  return `Today's counts will reset in approximately ${hrsLeft}hrs, ${minsLeft}mins (<t:${Math.floor(next / 1000)}:R>).`;
}

// Utility function to convert state abbreviations
export function abbrState(input, to) {
  const states = [
    ['Arizona', 'AZ'], ['Alabama', 'AL'], ['Alaska', 'AK'], ['Arkansas', 'AR'], ['California', 'CA'], ['Colorado', 'CO'],
    ['Connecticut', 'CT'], ['Delaware', 'DE'], ['District Of Columbia', 'DC'], ['Florida', 'FL'], ['Georgia', 'GA'], ['Hawaii', 'HI'],
    ['Idaho', 'ID'], ['Illinois', 'IL'], ['Indiana', 'IN'], ['Iowa', 'IA'], ['Kansas', 'KS'], ['Kentucky', 'KY'],
    ['Louisiana', 'LA'], ['Maine', 'ME'], ['Maryland', 'MD'], ['Massachusetts', 'MA'], ['Michigan', 'MI'],
    ['Minnesota', 'MN'], ['Mississippi', 'MS'], ['Missouri', 'MO'], ['Montana', 'MT'], ['Nebraska', 'NE'],
    ['Nevada', 'NV'], ['New Hampshire', 'NH'], ['New Jersey', 'NJ'], ['New Mexico', 'NM'], ['New York', 'NY'],
    ['North Carolina', 'NC'], ['North Dakota', 'ND'], ['Ohio', 'OH'], ['Oklahoma', 'OK'], ['Oregon', 'OR'],
    ['Pennsylvania', 'PA'], ['Rhode Island', 'RI'], ['South Carolina', 'SC'], ['South Dakota', 'SD'],
    ['Tennessee', 'TN'], ['Texas', 'TX'], ['Utah', 'UT'], ['Vermont', 'VT'], ['Virginia', 'VA'],
    ['Washington', 'WA'], ['West Virginia', 'WV'], ['Wisconsin', 'WI'], ['Wyoming', 'WY'],
  ];
  if (to == 'abbr') {
    input = input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    for (let i = 0; i < states.length; i++) {
      if (states[i][0] == input) {
        return (states[i][1]);
      }
    }
    return null;
  } else if (to == 'name') {
    input = input.toUpperCase();
    for (let i = 0; i < states.length; i++) {
      if (states[i][1] == input) {
        return (states[i][0]);
      }
    }
    return null;
  }
  return null;
}
