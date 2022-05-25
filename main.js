//
//   _____                   _       _                __    ___          ____            _   
//  / ____|                 (_)     | |              /_ |  / _ \        |  _ \          | |  
// | |        ___   __   __  _    __| |    ______     | | | (_) |       | |_) |   ___   | |_ 
// | |       / _ \  \ \ / / | |  / _` |   |______|    | |  \__, |       |  _ <   / _ \  | __|
// | |____  | (_) |  \ V /  | | | (_| |               | |    / /        | |_) | | (_) | | |_ 
//  \_____|  \___/    \_/   |_|  \__,_|               |_|   /_/         |____/   \___/   \__|
//
//
// Ver: 1.1.0
// Started: 3/23/2020
// Last version published: 4/1/2020
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

const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const console = require('node:console');
const setTimeout = require('node:timers').setTimeout;
const chalk = require('chalk');
const schedule = require('node-schedule');
const reloader = require('./getData');
const shortcountrynames = require('shortcountrynames');
const DBL = require('dblapi.js');

// Define custom country codes to match input to the data cache key values
shortcountrynames.names.UK = 'UK';
shortcountrynames.names.EU = 'Europe';

// Secret keys and tokens
const keys = JSON.parse(fs.readFileSync('keys.json', 'utf8'));

// Stats caches
let statesJSON, worldCacheJSON;
try {
  statesJSON = JSON.parse(fs.readFileSync('USstats.json', 'utf8'));
} catch (err) {
  fs.appendFile('USstats.json', '{}', function (err) {
    if (err) throw err;
    console.log(chalk.green('Created new USstats.json file automatically.'));
  });
}
try {
  worldCacheJSON = JSON.parse(fs.readFileSync('WorldStats.json', 'utf8'));
} catch (err) {
  fs.appendFile('WorldStats.json', '{}', function (err) {
    if (err) throw err;
    console.log(chalk.green('Created new WorldStats.json file automatically.'));
  });
}

// Set the prefix
const prefix = ['-c', '.cv', '-C', '.CV', '.Cv', '.cV'];

// Sign in with DBL for bot stats
const dbl = new DBL(keys.dbl, client);

// Scheduled updates of data
schedule.scheduleJob('*/30 * * * *', updateCache); // update data caches at every half hour
schedule.scheduleJob('0 */12 * * *', publishStatsDBL); // post updated bot stats to the Discord Bots List




// -------------------------------------------
// -------------------------------------------
//
//           DISCORD EVENT HANDLERS
//
// -------------------------------------------
// -------------------------------------------

client.on('ready', () => {
  console.log(chalk.greenBright(`Logged in as ${client.user.tag}!`));
  updateCache(); //refresh cache on startup right away
  // Display help command on bot's status
  client.user.setActivity('.cv help', { type: 'WATCHING' });
});

// Logs additions of new servers
client.on('guildCreate', guild => {
  console.log(chalk.green('NEW SERVER: ' + chalk.cyan(guild.name)));
});

client.on('message', message => {
  // Check for Ghost users
  if (message.author === null) return;
  // Check for, and ignore DM channels (this is a safety precaution)
  if (message.channel.type !== 'text') return;
  // Check for, and ignore any bots (another safety precaution)
  if (message.author.bot || message.author == client.user) return;
  // Forward message to the commands processor
  commands(message, false);
});




// -------------------------------------------
// -------------------------------------------
//
//              INPUT HANDLING
//
// -------------------------------------------
// -------------------------------------------

async function commands(message) {

  // Get the channel where the bot will answer.
  const channel = message.channel;

  // Check for bot mention and reply with response ping latency
  const collection = message.mentions.members;
  if (collection.has('691863138559328327')) {
    let ping = (Number(new Date().getTime()) - message.createdTimestamp);
    if (Math.sign(ping) === -1) { ping = ping * -1; }
    channel.send(`Hi! <@!${message.author}> (\`${ping}\` ms) If you need help, try \`.cv help\``);
  }

  // Split the message by spaces.
  const code_in = message.content.split(' ').filter(function (v) { return v !== ''; });
  if (code_in.length < 1) return;

  // Check for prefix start.
  let hasPfx = '';
  prefix.map(pfx => hasPfx = (code_in[0].indexOf(pfx) === 0 ? pfx : hasPfx));

  // Cut the prefix.
  const code_in_pre = code_in[0];
  code_in[0] = code_in[0].replace(hasPfx, '');

  if (prefix.indexOf(code_in_pre) > -1) {

    // Remove the prefix stub
    code_in.splice(0, 1);

    // Check for command
    const command = (code_in[0]) ? code_in[0].toLowerCase() : null;

    //
    // Check and process commands
    //

    let param0, param1, param2, param3, param4;
    if (code_in[0]) { param0 = code_in[0]; } else { param0 = ''; }
    if (code_in[1]) { param1 = code_in[1]; } else { param1 = ''; }
    if (code_in[2]) { param2 = code_in[2]; } else { param2 = ''; }
    if (code_in[3]) { param3 = code_in[3]; } else { param3 = ''; }
    if (code_in[4]) { param4 = code_in[4]; } else { param4 = ''; }
    let combinedParams = (param1 + ' ' + param2 + ' ' + param3 + ' ' + param4).trim();
    let combinedParamsDefault = (param0 + ' ' + param1 + ' ' + param2 + ' ' + param3 + ' ' + param4).trim();

    // Special handling for korea and other inputs to check for user friendly input terms
    if (combinedParams.toLowerCase() === 'korea' || combinedParams.toLowerCase() === 'south korea' || combinedParams.toLowerCase() === 'kor' ||
      combinedParams.toLowerCase() === 'skorea' || combinedParams.toLowerCase() === 's korea' || combinedParams.toLowerCase() === 'kr') { combinedParams = 'S. Korea'; }
    if (combinedParams.toLowerCase() === 'n korea' || combinedParams.toLowerCase() === 'north korea' ||
      combinedParams.toLowerCase() === 'nkorea' || combinedParams.toLowerCase() === 'nk') { channel.send('North Korea stats are not available.'); return; }
    if (combinedParams.toLowerCase() === 'czech' || combinedParams.toLowerCase() === 'czech republic') { channel.send('Use `Czechia` or `cz` for the czech republic. (As listed by the U.N.)'); }

    // Special handling for korea and other inputs to check for user friendly input terms (duplicate check to account for default command input)
    if (combinedParamsDefault.toLowerCase() === 'korea' || combinedParamsDefault.toLowerCase() === 'south korea' || combinedParamsDefault.toLowerCase() === 'kor' ||
      combinedParamsDefault.toLowerCase() === 'skorea' || combinedParamsDefault.toLowerCase() === 's korea' || combinedParamsDefault.toLowerCase() === 'kr') { combinedParamsDefault = 'S. Korea'; }
    if (combinedParamsDefault.toLowerCase() === 'n korea' || combinedParamsDefault.toLowerCase() === 'north korea' ||
      combinedParamsDefault.toLowerCase() === 'nkorea' || combinedParamsDefault.toLowerCase() === 'nk') { channel.send('North Korea stats are not available.'); return; }
    if (combinedParamsDefault.toLowerCase() === 'czech' || combinedParamsDefault.toLowerCase() === 'czech republic') { channel.send('Use `Czechia` or `cz` for the czech republic. (As listed by the U.N.)'); }

    // Get cases
    if (command === 'cases' || command === 'case' || command === 'c' || command === 'confirmed') {
      //getUsCases(channel, code_in[1]);
      console.log(chalk.green(chalk.blue('cases') + ' command called by ' + chalk.yellow(message.author.username) + ' in: ' + chalk.cyan(message.guild.name)));
      getCases(channel, combinedParams);

      // Get deaths
    } else if (command === 'deaths' || command === 'death' || command === 'd' || command === 'dead' || command === 'died') {
      console.log(chalk.green(chalk.blue('deaths') + ' command called by ' + chalk.yellow(message.author.username) + ' in: ' + chalk.cyan(message.guild.name)));
      getDeaths(channel, combinedParams);

      // Get recoveries
    } else if (command === 'recoveries' || command === 'recovered' || command === 'r' || command === 'recover' || command === 'recovery') {
      console.log(chalk.green(chalk.blue('recoveries') + ' command called by ' + chalk.yellow(message.author.username) + ' in: ' + chalk.cyan(message.guild.name)));
      getRecoveries(channel, combinedParams);

      // Get summary for a country
    } else if (command === 'su' || command === 'summary' || command === 'overview' || command === 'stats' || command === 'sum') {
      console.log(chalk.green(chalk.blue('Summary') + ' command called by ' + chalk.yellow(message.author.username) + ' in: ' + chalk.cyan(message.guild.name) + ' on: ' + chalk.cyan(combinedParams)));
      getSummary(channel, combinedParams);

      // Get info for US states
    } else if (command === 'state' || command === 'states' || command === 's' || command === 'st') {
      console.log(chalk.green(chalk.blue('State') + ' command called by ' + chalk.yellow(message.author.username) + ' in: ' + chalk.cyan(message.guild.name) + ' on: ' + chalk.cyan(combinedParams)));
      getUsCases(channel, combinedParams);

      // Help
    } else if (command === 'help' || command === '?') {
      console.log(chalk.cyan('help command deployed to ' + chalk.yellow(message.author.username) + chalk.green(' in: ') + chalk.cyan(message.guild.name)));
      channel.send('Hi there! Here\'s how to interact with the Covid-19 bot:\n\n' +
        '**__Commands and usage:__**\n' +
        ':small_blue_diamond: To see a situation summary for worldwide, simply use  `.cv`\n' +
        ':small_blue_diamond: For a specific country, use  `.cv <country>`\n' +
        ':small_blue_diamond: For a whole continent, use  `.cv <continent>`\n' +
        ':small_blue_diamond: For a US state, use  `.cv s <state>`\n' +
        ':small_blue_diamond: For countries and continents, you can also view cases/deaths/recoveries individually using  `.cv <c/d/r> <country>`\n\n' +
        '**__Examples:__**\n' +
        '`.cv`            => display summary for worldwide\n' +
        '`.cv de`      => display summary for Germany\n' +
        '`.cv c us`  => display only cases for United States\n' +
        '`.cv d it`  => display only deaths for Italy\n' +
        '`.cv d italy`  => also display only deaths for Italy, but using full name for input\n' +
        '`.cv s mn`  => display summary for the state of Minnesota\n' +
        '`.cv d it`  => display only deaths for Italy\n' +
        '`.cv r`        => display only recoveries for worldwide\n' +
        '`.cv north america`  => display summary for North America\n\n' +
        '**__Notes and extras:__**\n' +
        '• You can use either the 2-letter abbreviation, or the full name for countries and states.\n' +
        '• For continents you must use the FULL name when specifiying them. Examples: North America, Africa...\n' +
        '• Summary reports have counters for new daily data which resets at the end of the day. You can see when the next reset will occur using `.cv time`.\n' +
        '• You can use either `.cv` OR `-c` as the prefix for commands, so take your pick!\n' +
        '• This bot is open source and frequently updated! You can get the github link using `.cv source`.\n' +
        '• Spare some change to support Covid-19 releif efforts? Use `.cv donate` to get a link to official W.H.O. Solidarity Response Fund.\n' +
        '• Need a reminder of these commands? You can show this help message again any time by using `.cv help`.\n' +
        '• One more thing... Please share this bot if you like it! You can get the invite link to add the bot to your other servers using `.cv invite`.\n'
      );

      // Github
    } else if (command === 'github' || command === 'source' || command === 'code') {
      channel.send('https://github.com/YoloSwagDogDiggity/Covid-19');
      console.log(chalk.cyan('Github repo deployed to ' + chalk.yellow(message.author.username) + chalk.green(' in: ') + chalk.cyan(message.guild.name)));

      // Time to next counter reset
    } else if (command === 'time' || command === 'next' || command === 'refresh') {
      channel.send(timeUntilDayReset());

      // Invite
    } else if (command === 'invite' || command === 'add' || command === 'join') {
      channel.send('I\'m thrilled you want me to join you! I\'ll make it super easy to invite me to your server using this link: \n' +
        'https://discordapp.com/oauth2/authorize?client_id=691863138559328327&scope=bot&permissions=67488832');
      console.log(chalk.cyan('Invite link deployed to ' + chalk.yellow(message.author.username) + chalk.green(' in: ') + chalk.cyan(message.guild.name)));

      // Donate to response efforts
    } else if (command === 'donate' || command === 'don' || command === 'give') {
      channel.send('During this time of critical need, any financial support will go a very long way to help save lives. Here\'s is a link to donate to the official COVID-19 Solidarity Response Fund: \n' +
        'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/donate');
      console.log(chalk.cyan('Donation link deployed to ' + chalk.yellow(message.author.username) + chalk.green(' in: ') + chalk.cyan(message.guild.name)));

      // Bot session presence statistics
    } else if (command === 'info' || command === 'about' || command === 'stats' || command === 'stat') {
      console.log(chalk.cyan('Session stats deployed to ' + chalk.yellow(message.author.username) + chalk.green(' in: ') + chalk.cyan(message.guild.name)));
      postSessionStats(channel);
    }

    // Default to the summary command if none is provided
    else {
      getSummary(channel, combinedParamsDefault);
    }
  }
}




// -------------------------------------------
// -------------------------------------------
//
//          CORE COMMAND FUNCTIONS
//
// -------------------------------------------
// -------------------------------------------

function getCases(channel, param) {
  let dailyChangeAddon = '';
  if (param && !(param.toLowerCase() === 'world' || param.toLowerCase() === 'worldwide' || param.toLowerCase() === 'global' ||
    param.toLowerCase() === 'total' || param.toLowerCase() === 'all')) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          const chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newcases) {
              dailyChangeAddon = '  (' + chunk.newcases + ' today)';
            } else { dailyChangeAddon = ''; }
            channel.send('Total confirmed cases in **' + chunk.country + ':**  ' + chunk.cases + dailyChangeAddon);
            return;
          }
        }
        channel.send('That input was not recognized. Try entering the full name of the country instead.');
        console.log(chalk.yellow('Unmatched country cache key needs custom value: ' + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        const chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newcases) {
            dailyChangeAddon = '  (' + chunk.newcases + ' today)';
          } else { dailyChangeAddon = ''; }
          channel.send('Total confirmed cases in **' + chunk.country + ':**  ' + chunk.cases + dailyChangeAddon);
          return;
        }
      }
      channel.send('That input was not recognized. Try entering the 2-letter country abbreviation instead.');
      console.log(chalk.yellow('Unmatched country cache key NAME: ' + chalk.cyan(param)));
    }
  }
  else {
    channel.send('Total confirmed cases worldwide: ' + worldCacheJSON[0].totalCases);
  }
}



function getDeaths(channel, param) {
  let dailyChangeAddon = '';
  if (param && !(param.toLowerCase() === 'world' || param.toLowerCase() === 'worldwide' || param.toLowerCase() === 'global' ||
    param.toLowerCase() === 'total' || param.toLowerCase() === 'all')) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          const chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newdeaths) {
              dailyChangeAddon = '  (' + chunk.newdeaths + ' today)';
            } else { dailyChangeAddon = ''; }
            channel.send('Total confirmed deaths in **' + chunk.country + ':**  ' + chunk.deaths + dailyChangeAddon);
            return;
          }
        }
        channel.send('That input was not recognized. Try entering the full name of the country instead.');
        console.log(chalk.yellow('Unmatched country cache key needs custom value: ' + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        const chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newdeaths) {
            dailyChangeAddon = '  (' + chunk.newdeaths + ' today)';
          } else { dailyChangeAddon = ''; }
          channel.send('Total confirmed deaths in **' + chunk.country + ':**  ' + chunk.deaths + dailyChangeAddon);
          return;
        }
      }
      channel.send('That input was not recognized. Try entering the 2-letter country abbreviation instead.');
      console.log(chalk.yellow('Unmatched country cache key NAME: ' + chalk.cyan(param)));
    }
  }
  else {
    channel.send('Total confirmed deaths worldwide: ' + worldCacheJSON[0].totalDeaths);
  }
}



function getRecoveries(channel, param) {
  if (param && !(param.toLowerCase() === 'world' || param.toLowerCase() === 'worldwide' || param.toLowerCase() === 'global' ||
    param.toLowerCase() === 'total' || param.toLowerCase() === 'all')) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          const chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.recovered) {
              channel.send('Total confirmed recoveries in **' + chunk.country + ':**  ' + chunk.recovered);
            } else {
              channel.send('No recoveries reported yet.');
            }
            return;
          }
        }
        channel.send('That input was not recognized. Try entering the full name of the country instead.');
        console.log(chalk.yellow('Unmatched country cache key needs custom value: ' + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        const chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.recovered) {
            channel.send('Total confirmed recoveries in **' + chunk.country + ':**  ' + chunk.recovered);
          } else {
            channel.send('No recoveries reported yet.');
          }
          return;
        }
      }
      channel.send('That input was not recognized. Try entering the 2-letter country abbreviation instead.');
      console.log(chalk.yellow('Unmatched country cache key NAME: ' + chalk.cyan(param)));
    }
  }
  else {
    channel.send('Total confirmed recoveries worldwide: ' + worldCacheJSON[0].totalRecovered);
  }
}



function getSummary(channel, param) {
  let cases = '', deaths = '', recoveries = '', active = '', critical = '', tests = '', testbypop = '', dailyChangeAddon = '', dailyChangeAddon2 = '';
  if (param && !(param.toLowerCase() === 'world' || param.toLowerCase() === 'worldwide' || param.toLowerCase() === 'global' ||
    param.toLowerCase() === 'total' || param.toLowerCase() === 'all')) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          const chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newcases) {
              dailyChangeAddon = '  (' + chunk.newcases + ' today)';
            } else { dailyChangeAddon = ''; }
            if (chunk.newdeaths) {
              dailyChangeAddon2 = '  (' + chunk.newdeaths + ' today)';
            } else { dailyChangeAddon2 = ''; }
            if (chunk.cases === '') { cases = 0; } else { cases = chunk.cases + dailyChangeAddon; }
            if (chunk.deaths === '') { deaths = 0; } else { deaths = chunk.deaths + dailyChangeAddon2; }
            if (chunk.recovered === '') { recoveries = 0; } else { recoveries = chunk.recovered; }
            if (chunk.activecases === '') { active = 0; } else { active = chunk.activecases; }
            if (chunk.criticalcases === '') { critical = 0; } else { critical = chunk.criticalcases; }
            if (chunk.testsperformed === '') { tests = 'n/a'; } else { tests = chunk.testsperformed; }
            if (chunk.testsperformedbypop === '') { testbypop = 'n/a'; } else { testbypop = chunk.testsperformedbypop; }
            channel.send('**__' + chunk.country + ':__**\n' +
              'Total Cases:         ' + cases + '\n' +
              'Active Cases:       ' + active + '\n' +
              'Critical Cases:      ' + critical + '\n' +
              'Deaths:                  ' + deaths + '\n' +
              'Recoveries:           ' + recoveries + '\n' +
              'Total Tests:          ' + tests + '\n' +
              'Tests/1M Pop:     ' + testbypop);
            return;
          }
        }
        channel.send('That input was not recognized. Try entering the full name of the country instead.');
        console.log(chalk.yellow('Unmatched country cache key needs custom value: ' + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        const chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newcases) {
            dailyChangeAddon = '  (' + chunk.newcases + ' today)';
          } else { dailyChangeAddon = ''; }
          if (chunk.newdeaths) {
            dailyChangeAddon2 = '  (' + chunk.newdeaths + ' today)';
          } else { dailyChangeAddon2 = ''; }
          if (chunk.cases === '') { cases = 0; } else { cases = chunk.cases + dailyChangeAddon; }
          if (chunk.deaths === '') { deaths = 0; } else { deaths = chunk.deaths + dailyChangeAddon2; }
          if (chunk.recovered === '') { recoveries = 0; } else { recoveries = chunk.recovered; }
          if (chunk.activecases === '') { active = 0; } else { active = chunk.activecases; }
          if (chunk.criticalcases === '') { critical = 0; } else { critical = chunk.criticalcases; }
          if (chunk.testsperformed === '') { tests = 'n/a'; } else { tests = chunk.testsperformed; }
          if (chunk.testsperformedbypop === '') { testbypop = 'n/a'; } else { testbypop = chunk.testsperformedbypop; }
          channel.send('**__' + chunk.country + ':__**\n' +
            'Total Cases:         ' + cases + '\n' +
            'Active Cases:       ' + active + '\n' +
            'Critical Cases:      ' + critical + '\n' +
            'Deaths:                  ' + deaths + '\n' +
            'Recoveries:           ' + recoveries + '\n' +
            'Total Tests:          ' + tests + '\n' +
            'Tests/1M Pop:     ' + testbypop);
          return;
        }
      }
      channel.send('That input was not recognized. Try entering the 2-letter country abbreviation instead.');
      console.log(chalk.yellow('Unmatched country cache key NAME: ' + chalk.cyan(param)));
    }
  }
  else {
    for (let i = 1; i < worldCacheJSON.length; i++) {
      const chunk = worldCacheJSON[i];
      if (chunk.country.toLowerCase() == 'world') {
        if (chunk.newcases) {
          dailyChangeAddon = '  (' + chunk.newcases + ' today)';
        } else { dailyChangeAddon = ''; }
        if (chunk.newdeaths) {
          dailyChangeAddon2 = '  (' + chunk.newdeaths + ' today)';
        } else { dailyChangeAddon2 = ''; }
        if (chunk.cases === '') { cases = 0; } else { cases = chunk.cases + dailyChangeAddon; }
        if (chunk.deaths === '') { deaths = 0; } else { deaths = chunk.deaths + dailyChangeAddon2; }
        if (chunk.recovered === '') { recoveries = 0; } else { recoveries = chunk.recovered; }
        if (chunk.activecases === '') { active = 0; } else { active = chunk.activecases; }
        if (chunk.criticalcases === '') { critical = 0; } else { critical = chunk.criticalcases; }
        channel.send('**__Worldwide:__**\n' +
          'Total Cases:       ' + cases + '\n' +
          'Active Cases:     ' + active + '\n' +
          'Critical Cases:    ' + critical + '\n' +
          'Deaths:                ' + deaths + '\n' +
          'Recoveries:         ' + recoveries);
        return;
      }
    }
  }
}



function getUsCases(channel, state) {
  let foundState = false;
  let dailyChangeAddon = '', dailyChangeAddon2 = '', cases = '', deaths = '', recovered = '', active = '', casebypop = '', tests = '', testbypop = '', deathbypop = '';
  // Convert abbreviated state input to full name for json access
  if (state && state.length == 2) {
    state = abbrState(state.toUpperCase(), 'name');
  }
  if (state) {
    for (let j = 0; j < statesJSON.length; j++) {
      if (statesJSON[j].state && (statesJSON[j].state.toUpperCase() == state.toUpperCase())) {
        state = statesJSON[j].state;
        const chunk = statesJSON[j];
        if (chunk.newcases) {
          dailyChangeAddon = '  (' + chunk.newcases + ' today)';
        } else { dailyChangeAddon = ''; }
        if (chunk.newdeaths) {
          dailyChangeAddon2 = '  (' + chunk.newdeaths + ' today)';
        } else { dailyChangeAddon2 = ''; }
        cases = chunk.cases + dailyChangeAddon;
        active = chunk.activecases;
        deaths = chunk.deaths + dailyChangeAddon2;
        tests = chunk.testsperformed;
        testbypop = chunk.testsperformedbypop;
        recovered = chunk.recoveries;
        casebypop = chunk.casesbypop;
        deathbypop = chunk.deathsbypop;
        foundState = true;
      }
    }
    if (foundState) {
      if (recovered == '0') { recovered = '0 (or not reported)'; }
      channel.send('__**' + state + ':**__ ' +
        '\nCases:                       ' + cases +
        '\nActive Cases:          ' + active +
        '\nDeaths:                     ' + deaths +
        '\nRecoveries:              ' + numberWithCommas(recovered) +
        '\nTotal Tests:             ' + tests +
        '\nTests/1M Pop:        ' + testbypop +
        '\nCases/1M Pop:       ' + casebypop +
        '\nDeaths/1M Pop:     ' + deathbypop);
    }
    else {
      channel.send('That state wasn\'t found. Make sure you enter a valid US state using either the 2-letter abbreviation or the full name and try again.\n(Example:  `.cv s mn`  for data from Minnesota)\n' +
        'If you are trying to lookup a country, just use `.cv <country>`.');
    }
  }
  else {
    channel.send('That input was not recognized. Enter a valid US state and try again.\n' +
      'If you are trying to lookup a country, just use `.cv <country>`.');
    console.log(chalk.yellow('Unmatched state key value: ' + chalk.cyan(state)));
  }
}




// Post bot session stats and general information
function postSessionStats(channel) {
  const users = (client.guilds.cache.reduce(function (sum, guild) { return sum + guild.memberCount; }, 0));
  const embed = new Discord.MessageEmbed()
    .setColor('#03fcd7')
    .setTitle('Covid-19 Bot Information')
    .setDescription('Covid-19 is a powerful and simple to use bot for checking stats on the Coronavirus pandemic from around the world in real time.')
    .setThumbnail('https://i.imgur.com/GblpWSq.png')
    .addFields(
      { name: '\u200B', value: 'Help Command: `.cv help`' },
      { name: '\u200B', value: '[Bot Invite](https://discordapp.com/oauth2/authorize?client_id=691863138559328327&scope=bot&permissions=67488832)' },
      { name: '\u200B', value: '[GitHub Repo](https://github.com/YoloSwagDogDiggity/Covid-19)' },
      { name: '\u200B', value: '\u200B' },
      { name: 'Servers', value: client.guilds.cache.size, inline: true },
      { name: 'Users', value: users, inline: true },
      { name: 'Uptime', value: Math.trunc(client.uptime / (3600000)) + 'hr\n', inline: true },
    )
    .setFooter('Covid-19 data provided by World-O-Meter', 'https://i.imgur.com/jnvYxdh.jpg');
  channel.send(embed);
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
// function getDetailedStats(channel) { //This one is a long shot, but if possible add some things like age group and city stats as well as severeity of cases
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


// Scheduled utility function to refresh cache with new data
function updateCache() {
  //Refresh the cache
  reloader.update();
  reloader.worldCache();
  setTimeout(function () {
    // Read and parse the refreshed cache
    statesJSON = JSON.parse(fs.readFileSync('USstats.json', 'utf8'));
    worldCacheJSON = JSON.parse(fs.readFileSync('WorldStats.json', 'utf8'));
  }, 30000); // wait for data collection to finish before reading files again
}



// Get time until next reset of daily stats
function timeUntilDayReset() {
  const now = new Date();
  const hr = now.getHours();
  const min = now.getMinutes();
  let hrsLeft;
  const minsLeft = 60 - min;
  hrsLeft = (19 - hr <= 0) ? (24 + (19 - hr)) : (18 - hr);
  if (hrsLeft == 24) {
    hrsLeft = 0;
    if (minsLeft <= 45) {
      return 'Todays counts will reset very soon.';
    }
    return `Todays counts will reset in approximately ${hrsLeft}hrs, ${minsLeft}mins.`;
  }
  else {
    return `Todays counts will reset in approximately ${hrsLeft}hrs, ${minsLeft}mins.`;
  }
}



// Function to add commas to numbers
function numberWithCommas(x) {
  const parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}



// Function to update bot session stats on Discord Bot List
function publishStatsDBL() {
  dbl.postStats(client.guilds.size);
  console.log(chalk.blue('Published DBL stats : ' + chalk.yellow(client.guilds.size)));
}



// Utility function to convert state abbreviations
function abbrState(input, to) {
  const states = [
    ['Arizona', 'AZ'], ['Alabama', 'AL'], ['Alaska', 'AK'], ['Arkansas', 'AR'], ['California', 'CA'], ['Colorado', 'CO'],
    ['Connecticut', 'CT'], ['Delaware', 'DE'], ['Florida', 'FL'], ['Georgia', 'GA'], ['Hawaii', 'HI'],
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
  } else if (to == 'name') {
    input = input.toUpperCase();
    for (let i = 0; i < states.length; i++) {
      if (states[i][1] == input) {
        return (states[i][0]);
      }
    }
    return null;
  }
}




// -------------------------------------------
// -------------------------------------------
//
//         JACK-IN. EXECUTE. PERFORM.
//
// -------------------------------------------
// -------------------------------------------

client.login(keys.token);
