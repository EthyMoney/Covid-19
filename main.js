//
//   _____                   _       _                __    ___          ____            _
//  / ____|                 (_)     | |              /_ |  / _ \        |  _ \          | |
// | |        ___   __   __  _    __| |    ______     | | | (_) |       | |_) |   ___   | |_
// | |       / _ \  \ \ / / | |  / _` |   |______|    | |  \__, |       |  _ <   / _ \  | __|
// | |____  | (_) |  \ V /  | | | (_| |               | |    / /        | |_) | | (_) | | |_
//  \_____|  \___/    \_/   |_|  \__,_|               |_|   /_/         |____/   \___/   \__|
//
//
// Ver: 2.0.0
// Started: 3/23/2020
// Last version published: 7/28/2026 (final maintenance release before archival)
// Written by: Logan (EthyMoney)
// License: MIT
// Description: A simple discord bot with functionality related to statistics and news reporting for the Novel Coronavirus pandemic of 2020 (Officially named Covid-19)
//
// It's soup time!
//




// -------------------------------------------
// -------------------------------------------
//
//           SETUP AND DECLARATIONS
//
// -------------------------------------------
// -------------------------------------------

import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  MessageFlags
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import schedule from 'node-schedule';
import { usStatsCacher, worldMetersCacher, loadStats } from './getData.js';
import { commandList } from './commands.js';
import {
  clean,
  present,
  withDaily,
  isWorldwide,
  isNorthKorea,
  resolveCountry,
  resolveState,
  rankSuggestions,
  timeUntilDayReset
} from './stats.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// This bot only uses slash commands, so it needs no privileged intents at all. That is a meaningful
// upgrade from the original prefix-command version, which required the Message Content intent.
const client = new Client({ intents: [GatewayIntentBits.Guilds], shards: 'auto' });

// Secret keys and tokens
let keys;
try {
  keys = JSON.parse(fs.readFileSync(path.join(ROOT, 'keys.json'), 'utf8'));
} catch {
  console.log(chalk.red('Unable to read keys.json. Copy keys.example.json to keys.json and add your bot token.'));
  process.exit(1);
}
if (!keys.token || keys.token.startsWith('YOUR_')) {
  console.log(chalk.red('No bot token found in keys.json. Add your Discord bot token and try again.'));
  process.exit(1);
}

// Stats caches, plus where each one came from so replies can be honest about the data's age
let worldCacheJSON = null;
let usCacheJSON = null;
let worldSource = 'none';
let usSource = 'none';

// Details of the bundled snapshot, used to label archived data in embed footers
let snapshotDate = null;
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'sample-data', 'manifest.json'), 'utf8'));
  snapshotDate = manifest.capturedAt ? manifest.capturedAt.slice(0, 10) : null;
} catch {
  // No snapshot bundled, which is fine as long as live collection works.
}

const BRAND_COLOR = 0x03fcd7;
const THUMBNAIL = 'https://i.imgur.com/GblpWSq.png';
const FOOTER_ICON = 'https://i.imgur.com/jnvYxdh.jpg';
const DONATE_URL = 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/donate';
const REPO_URL = 'https://github.com/EthyMoney/Covid-19';

// Scheduled updates of data
schedule.scheduleJob('*/30 * * * *', updateCache); // update data caches at every half hour




// -------------------------------------------
// -------------------------------------------
//
//           DISCORD EVENT HANDLERS
//
// -------------------------------------------
// -------------------------------------------

client.once(Events.ClientReady, async () => {
  console.log(chalk.greenBright(`Logged in as ${client.user.tag}!`));

  // Load whatever we already have on disk so the bot can answer immediately, then refresh.
  await loadInitialCaches();
  updateCache();

  await registerCommands();

  // Display help command on bot's status
  client.user.setActivity('/covid help', { type: ActivityType.Watching });

  // Enable publishing bot stats to top.gg (formally known as discordbots.org)
  activateDBLStatsPublishing();
});

// Logs additions of new servers
client.on(Events.GuildCreate, guild => {
  console.log(chalk.green('NEW SERVER: ' + chalk.cyan(guild.name)));
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
    } else if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    }
  } catch (err) {
    console.log(chalk.red('Interaction handling error: ') + chalk.cyan(err.message));
    // Best effort apology. If the interaction already timed out there is nothing left to do.
    try {
      const payload = { content: 'Something went wrong handling that command.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch { /* interaction is gone, nothing to recover */ }
  }
});

// Register the command set. A guildId in keys.json registers instantly for that one server, which is
// handy while testing; without it commands register globally and can take up to an hour to appear.
async function registerCommands() {
  const body = commandList.map(command => command.toJSON());
  try {
    if (keys.guildId) {
      await client.application.commands.set(body, keys.guildId);
      console.log(chalk.green('Registered slash commands to guild ' + chalk.cyan(keys.guildId)));
    } else {
      await client.application.commands.set(body);
      console.log(chalk.green('Registered slash commands globally.'));
    }
  } catch (err) {
    console.log(chalk.red('Failed to register slash commands: ') + chalk.cyan(err.message));
  }
}




// -------------------------------------------
// -------------------------------------------
//
//              INPUT HANDLING
//
// -------------------------------------------
// -------------------------------------------

async function handleCommand(interaction) {
  const sub = interaction.options.getSubcommand();
  const who = interaction.user.username;
  const where = interaction.guild ? interaction.guild.name : 'DM';

  switch (sub) {
    case 'summary': {
      const param = interaction.options.getString('location') || '';
      console.log(chalk.blue('summary') + chalk.green(' called by ') + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where) + chalk.green(' on: ') + chalk.cyan(param || 'ALL'));
      return getSummary(interaction, param);
    }
    case 'cases':
    case 'deaths':
    case 'recoveries': {
      const param = interaction.options.getString('location') || '';
      console.log(chalk.blue(sub) + chalk.green(' called by ') + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where) + chalk.green(' on: ') + chalk.cyan(param || 'ALL'));
      return getSingleStat(interaction, sub, param);
    }
    case 'state': {
      const param = interaction.options.getString('state');
      console.log(chalk.blue('state') + chalk.green(' called by ') + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where) + chalk.green(' on: ') + chalk.cyan(param));
      return getUsCases(interaction, param);
    }
    case 'time':
      return interaction.reply(timeUntilDayReset());
    case 'help':
      console.log(chalk.cyan('help command deployed to ' + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where)));
      return postHelp(interaction);
    case 'info':
      console.log(chalk.cyan('Session stats deployed to ' + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where)));
      return postSessionStats(interaction);
    case 'invite':
      console.log(chalk.cyan('Invite link deployed to ' + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where)));
      return interaction.reply('I\'m thrilled you want me to join you! I\'ll make it super easy to invite me to your server using this link: \n' + inviteUrl());
    case 'source':
      console.log(chalk.cyan('Github repo deployed to ' + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where)));
      return interaction.reply(REPO_URL);
    case 'donate':
      console.log(chalk.cyan('Donation link deployed to ' + chalk.yellow(who) + chalk.green(' in: ') + chalk.cyan(where)));
      return interaction.reply('During this time of critical need, any financial support will go a very long way to help save lives. Here\'s a link to donate to the official COVID-19 Solidarity Response Fund: \n' + DONATE_URL);
    default:
      return interaction.reply({ content: 'Unknown command.', flags: MessageFlags.Ephemeral });
  }
}

// Suggests country/continent or state names straight out of the live cache, so the suggestions always
// match the exact spellings the data uses. This is what makes the old "that input was not recognized"
// dead end mostly disappear.
async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  let pool = [];
  if (focused.name === 'location' && worldCacheJSON) {
    pool = worldCacheJSON.slice(1).map(entry => entry.country).filter(Boolean);
  } else if (focused.name === 'state' && usCacheJSON) {
    pool = usCacheJSON.map(entry => entry.state).filter(Boolean);
  }

  const matches = rankSuggestions(pool, focused.value);
  await interaction.respond(matches.map(name => ({ name, value: name })));
}




// -------------------------------------------
// -------------------------------------------
//
//          CORE COMMAND FUNCTIONS
//
// -------------------------------------------
// -------------------------------------------

// The three single-number commands (cases/deaths/recoveries) all follow the same shape, so they share
// one implementation instead of the three near-identical copies the original carried.
const SINGLE_STATS = {
  cases: { label: 'confirmed cases', field: 'cases', delta: 'newcases', total: 'totalCases' },
  deaths: { label: 'confirmed deaths', field: 'deaths', delta: 'newdeaths', total: 'totalDeaths' },
  recoveries: { label: 'confirmed recoveries', field: 'recovered', delta: 'newrecovered', total: 'totalRecovered' }
};

function getSingleStat(interaction, kind, param) {
  if (!worldCacheJSON) return replyNoData(interaction);
  const spec = SINGLE_STATS[kind];

  if (isWorldwide(param)) {
    return interaction.reply(`Total ${spec.label} worldwide: **${clean(worldCacheJSON[0][spec.total])}**`);
  }

  const match = resolveCountry(worldCacheJSON, param);
  if (!match) return replyUnknownLocation(interaction, param);

  const value = withDaily(match[spec.field], match[spec.delta]);
  return interaction.reply(`Total ${spec.label} in **${match.country}:**  ${value}`);
}


function getSummary(interaction, param) {
  if (!worldCacheJSON) return replyNoData(interaction);

  let match;
  if (isWorldwide(param)) {
    // Prefer the table's own "World" row, since it carries the daily deltas the header counters lack.
    match = worldCacheJSON.slice(1).find(entry => entry.country && entry.country.toLowerCase() === 'world');
    if (!match) {
      match = {
        country: 'World',
        cases: worldCacheJSON[0].totalCases,
        deaths: worldCacheJSON[0].totalDeaths,
        recovered: worldCacheJSON[0].totalRecovered,
        activecases: worldCacheJSON[0].totalActiveCases
      };
    }
  } else {
    match = resolveCountry(worldCacheJSON, param);
    if (!match) return replyUnknownLocation(interaction, param);
  }

  const title = match.country.toLowerCase() === 'world' ? 'Worldwide' : match.country;
  const embed = baseEmbed(title, worldSource).addFields(...compact(
    // Core figures always show, even as "n/a", so the layout stays recognizable. Everything after
    // them is dropped when the source has nothing, rather than padding the embed with dead rows.
    field('Total Cases', withDaily(match.cases, match.newcases), true),
    field('Deaths', withDaily(match.deaths, match.newdeaths), true),
    field('Recoveries', withDaily(match.recovered, match.newrecovered), true),
    field('Active Cases', match.activecases),
    field('Critical Cases', match.criticalcases),
    field('Total Tests', match.testsperformed),
    field('Tests/1M Pop', match.testsperformedbypop),
    field('Cases/1M Pop', match.casesbypop),
    field('Population', match.population)
  ));

  return interaction.reply({ embeds: [embed] });
}


function getUsCases(interaction, stateInput) {
  if (!usCacheJSON) return replyNoData(interaction);

  const match = resolveState(usCacheJSON, stateInput);
  if (!match) {
    return interaction.reply({
      content: 'That state wasn\'t found. Make sure you enter a valid US state using either the 2-letter abbreviation or the full name and try again.\n(Example:  `/covid state MN`  for data from Minnesota)\n' +
        'If you are trying to look up a country, use `/covid summary` instead.',
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = baseEmbed(match.state, usSource).addFields(...compact(
    field('Cases', withDaily(match.cases, match.newcases), true),
    field('Deaths', withDaily(match.deaths, match.newdeaths), true),
    field('Recoveries', clean(match.recoveries), true),
    field('Active Cases', match.activecases),
    field('Total Tests', match.testsperformed),
    field('Cases/1M Pop', match.casesbypop),
    field('Deaths/1M Pop', match.deathsbypop),
    field('Population', match.population)
  ));

  // Worldometers stopped publishing per-state daily changes, active cases and testing numbers. Say so
  // outright rather than quietly showing "n/a" and letting people wonder if the bot is broken.
  if (!present(match.activecases) && !present(match.testsperformed)) {
    embed.setDescription('_Per-state new cases, active cases and testing figures are no longer published by the data source._');
  }

  return interaction.reply({ embeds: [embed] });
}


function postHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Covid-19 Bot Help')
    .setThumbnail(THUMBNAIL)
    .setDescription('Here\'s how to interact with the Covid-19 bot. Every command starts with `/covid`.')
    .addFields(
      {
        name: 'Commands',
        value: '`/covid summary [location]` — full stats for a country, continent, or worldwide\n' +
          '`/covid cases [location]` — confirmed cases only\n' +
          '`/covid deaths [location]` — confirmed deaths only\n' +
          '`/covid recoveries [location]` — confirmed recoveries only\n' +
          '`/covid state <state>` — stats for a US state\n' +
          '`/covid time` — time until the daily counters reset'
      },
      {
        name: 'Examples',
        value: '`/covid summary` — worldwide summary\n' +
          '`/covid summary Germany` — summary for Germany\n' +
          '`/covid cases USA` — cases for the United States\n' +
          '`/covid deaths Italy` — deaths for Italy\n' +
          '`/covid state MN` — summary for Minnesota\n' +
          '`/covid summary North America` — summary for a whole continent'
      },
      {
        name: 'Notes and extras',
        value: '• Start typing a country or state and the bot will suggest matches for you.\n' +
          '• You can use either the 2-letter abbreviation or the full name.\n' +
          '• Continents work too — try North America, Europe, Asia, Africa, Oceania or South America.\n' +
          '• Use `/covid source` for the GitHub repo and `/covid invite` to add the bot elsewhere.\n' +
          '• Spare some change for Covid-19 relief? `/covid donate` links the W.H.O. Solidarity Response Fund.'
      }
    )
    .setFooter({ text: 'Covid-19 data provided by World-O-Meter', iconURL: FOOTER_ICON });

  return interaction.reply({ embeds: [embed] });
}


// Post bot session stats and general information
function postSessionStats(interaction) {
  const users = client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Covid-19 Bot Information')
    .setDescription('Covid-19 is a powerful and simple to use bot for checking stats on the Coronavirus pandemic from around the world.')
    .setThumbnail(THUMBNAIL)
    .addFields(
      { name: '​', value: 'Help Command: `/covid help`' },
      { name: '​', value: `[Bot Invite](${inviteUrl()})` },
      { name: '​', value: `[GitHub Repo](${REPO_URL})` },
      { name: '​', value: '​' },
      // Embed field values must be strings. The original passed raw numbers here, which throws.
      { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
      { name: 'Users', value: String(users), inline: true },
      { name: 'Uptime', value: `${Math.trunc(client.uptime / 3600000)}hr`, inline: true },
      { name: 'Latency', value: `${Math.max(0, Math.round(client.ws.ping))} ms`, inline: true },
      { name: 'Data', value: sourceLabel(worldSource), inline: true }
    )
    .setFooter({ text: 'Covid-19 data provided by World-O-Meter', iconURL: FOOTER_ICON });

  return interaction.reply({ embeds: [embed] });
}




// -------------------------------------------
// -------------------------------------------
//
//           TO-DO COMMAND STUFF
//
// -------------------------------------------
// -------------------------------------------

// function getTop10ByTodaysGains(channel) {
// }
// function getTop10ByCasesandothers(channel) {
// }
// function getUSStateCasesDeathsRecoveries(channel) {
// }
// function getDetailedStats(channel) { //This one is a long shot, but if possible add some things like age group and city stats as well as severity of cases
// }
// function getActiveCases(channel) { //Cases actually active for infection (total - the recovered/dead)
// }




// -------------------------------------------
// -------------------------------------------
//
//           SUPPORTING FUNCTIONS
//
// -------------------------------------------
// -------------------------------------------


// Loads the on-disk cache, falling back to the bundled snapshot, so the bot can answer before the
// first live scrape finishes (and forever after, once the data source goes offline for good).
async function loadInitialCaches() {
  const [world, us] = await Promise.all([loadStats('world'), loadStats('us')]);
  worldCacheJSON = world.data;
  worldSource = world.source;
  usCacheJSON = us.data;
  usSource = us.source;

  if (worldSource === 'sample' || usSource === 'sample') {
    console.log(chalk.yellow('Using bundled sample data until a live collection succeeds.'));
  }
  if (worldSource === 'none' && usSource === 'none') {
    console.log(chalk.yellow('No cached or sample data available yet. Waiting on first collection.'));
  }
}


// Scheduled utility function to refresh cache with new data.
// The cachers hand back the parsed data directly, which removes the old fixed 30 second sleep that
// used to race against the asynchronous file writes.
async function updateCache() {
  const [world, us] = await Promise.all([worldMetersCacher(), usStatsCacher()]);

  if (world) {
    worldCacheJSON = world;
    worldSource = 'live';
  } else if (!worldCacheJSON) {
    const fallback = await loadStats('world');
    worldCacheJSON = fallback.data;
    worldSource = fallback.source;
  }

  if (us) {
    usCacheJSON = us;
    usSource = 'live';
  } else if (!usCacheJSON) {
    const fallback = await loadStats('us');
    usCacheJSON = fallback.data;
    usSource = fallback.source;
  }
}


function replyNoData(interaction) {
  return interaction.reply({
    content: 'I don\'t have any data loaded right now. Try again in a minute while the cache fills up.',
    flags: MessageFlags.Ephemeral
  });
}

function replyUnknownLocation(interaction, param) {
  if (isNorthKorea(param)) {
    return interaction.reply({ content: 'North Korea stats are not available.', flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({
    content: `I couldn't find **${param}** in the data. Try picking from the suggestions as you type, or use the 2-letter country code.`,
    flags: MessageFlags.Ephemeral
  });
}


// Describes where the numbers came from, so archived snapshot data is never mistaken for live data.
function sourceLabel(source) {
  if (source === 'live' || source === 'cache') return 'Live from World-O-Meter';
  if (source === 'sample') {
    return snapshotDate
      ? `Archived snapshot from ${snapshotDate}`
      : 'Archived snapshot data';
  }
  return 'No data loaded';
}

function baseEmbed(title, source) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setFooter({ text: `${sourceLabel(source)} · World-O-Meter`, iconURL: FOOTER_ICON })
    .setTimestamp();
}

// Builds one embed field. Optional fields collapse to null when the source has no value for them,
// which matters now that Worldometers publishes far fewer columns than it used to -- an embed full of
// "n/a" rows reads like a broken bot rather than a retired data set.
function field(name, value, always = false) {
  const text = clean(value);
  if (!always && text === 'n/a') return null;
  return { name, value: text, inline: true };
}

function compact(...fieldList) {
  return fieldList.filter(Boolean);
}

// Built from the logged-in application's own ID so self-hosted copies get their own working link.
function inviteUrl() {
  return `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=67488832`;
}


// Function to update bot session stats on Discord Bot List every 30 minutes automatically.
// This used to use the topgg-autoposter package, which is unmaintained and pulled in a vulnerable
// dependency chain. A plain POST to the documented endpoint does the same job with no dependencies.
function activateDBLStatsPublishing() {
  if (!keys.dbl || keys.dbl === '') {
    console.log(chalk.yellow('No Top.gg API key found. Top.gg stats will not be published.'));
    return;
  }
  postTopGgStats();
  schedule.scheduleJob('*/30 * * * *', postTopGgStats);
}

async function postTopGgStats() {
  try {
    const res = await fetch(`https://top.gg/api/bots/${client.user.id}/stats`, {
      method: 'POST',
      headers: { 'Authorization': keys.dbl, 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_count: client.guilds.cache.size }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.log(chalk.yellow('Top.gg poster failed to update, status: ' + chalk.cyan(res.status)));
    }
  } catch (err) {
    // Catch issues with Top.gg updater
    console.log(chalk.yellow('Top.gg poster failed to update due to the following error:  ' + chalk.cyan(err.message)));
  }
}





// -------------------------------------------
// -------------------------------------------
//
//         JACK-IN. EXECUTE. PERFORM.
//
// -------------------------------------------
// -------------------------------------------

client.login(keys.token).catch(async err => {
  // A bad token used to surface as an unhandled rejection and a raw stack trace. Say what's wrong.
  if (err.code === 'TokenInvalid') {
    console.log(chalk.red('Discord rejected the bot token in keys.json. Double-check it in the Developer Portal.'));
  } else {
    console.log(chalk.red('Failed to log in: ') + chalk.cyan(err.message));
  }
  await shutdown(1);
});

// Shut down tidily when a process manager (pm2, systemd, Ctrl+C) asks us to stop.
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Cancels the refresh timers and closes the websocket so node can exit on its own terms. Calling
// process.exit() outright while node-schedule still holds live timers trips a libuv assertion on
// Windows, which is a confusing way to report "your token is wrong".
async function shutdown(code) {
  process.exitCode = code;
  try {
    await schedule.gracefulShutdown();
  } catch { /* nothing was scheduled yet */ }
  try {
    await client.destroy();
  } catch { /* never got connected */ }
}
