//
//   _____                   _       _                __    ___          ____            _   
//  / ____|                 (_)     | |              /_ |  / _ \        |  _ \          | |  
// | |        ___   __   __  _    __| |    ______     | | | (_) |       | |_) |   ___   | |_ 
// | |       / _ \  \ \ / / | |  / _` |   |______|    | |  \__, |       |  _ <   / _ \  | __|
// | |____  | (_) |  \ V /  | | | (_| |               | |    / /        | |_) | | (_) | | |_ 
//  \_____|  \___/    \_/   |_|  \__,_|               |_|   /_/         |____/   \___/   \__|
//
//
// Ver: 1.0.0
// Started: 3/23/2020
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
const chalk = require('chalk');
const schedule = require('node-schedule');
const reloader = require('./getDataCDC');
const shortcountrynames = require("shortcountrynames")

// Define custom country codes to match input to the data cache key values
shortcountrynames.names["UK"] = 'UK'

// Secret keys and tokens
let keys = JSON.parse(fs.readFileSync('keys.json', 'utf8'));

// Stats caches
try {
  var statesJSON = JSON.parse(fs.readFileSync("USstats.json", "utf8"));
} catch (err) {
  fs.appendFile('USstats.json', '{}', function (err) {
    if (err) throw err;
    console.log(chalk.green('Created new USstats.json file automatically.'));
  });
}
try {
  var worldCacheJSON = JSON.parse(fs.readFileSync("WorldStats.json", "utf8"));
} catch (err) {
  fs.appendFile('WorldStats.json', '{}', function (err) {
    if (err) throw err;
    console.log(chalk.green('Created new WorldStats.json file automatically.'));
  });
}

// Set the prefix
const prefix = ['-c', '.cv', '-C', '.CV', '.Cv', '.cV'];

// Scheduled updates of data
let updateStatesStats = schedule.scheduleJob('0 * * * *', updateCache); // update data caches every hour




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
  client.user.setActivity('.cv help');
});

// Logs additions of new servers
client.on('guildCreate', guild => {
  console.log(chalk.green("NEW SERVER: " + chalk.cyan(guild.name)))
});

client.on('message', message => {

  // Check for Ghost users
  if (message.author === null) return;

  // Check for, and ignore DM channels (this is a safety precaution)
  if (message.channel.type !== 'text') return;

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
  let channel = message.channel;

  // Lazy message rename
  let msg = message;

  // Get the guild(server) id of the message
  const guildID = message.guild.id;

  // Check for bot mention and reply with response ping latency
  let collection = message.mentions.members;
  if (collection.has("691863138559328327")) {
    let ping = (new Number(new Date().getTime()) - message.createdTimestamp);
    if (Math.sign(ping) === -1) { ping = ping * -1; };
    channel.send('Hi! ' + "<@!" + message.author.id + ">" + ' (`' + ping + " ms`)" + " If you need help, try `.cv help`");
  }

  // Split the message by spaces.
  let code_in = message.content.split(' ').filter(function (v) { return v !== ''; });
  if (code_in.length < 1) return;

  // Check for prefix start.
  let hasPfx = "";
  prefix.map(pfx => hasPfx = (code_in[0].indexOf(pfx) === 0 ? pfx : hasPfx));

  // Cut the prefix.
  let code_in_pre = code_in[0];
  code_in[0] = code_in[0].replace(hasPfx, "");

  if (prefix.indexOf(code_in_pre) > -1) {

    // Remove the prefix stub
    code_in.splice(0, 1);

    // Get the command
    if (code_in[0]) {
      var command = code_in[0].toLowerCase();
    }

    //
    // Check and process commands
    //

    if (code_in[1]) { var param1 = code_in[1] } else { var param1 = "" }
    if (code_in[2]) { var param2 = code_in[2] } else { var param2 = "" }
    if (code_in[3]) { var param3 = code_in[3] } else { var param3 = "" }
    if (code_in[4]) { var param4 = code_in[4] } else { var param4 = "" }
    let combinedParams = (param1 + " " + param2 + " " + param3 + " " + param4).trim();
    
    // Special handling for korea input to check for user friendly input terms
    if(combinedParams.toLowerCase() === 'korea' || combinedParams.toLowerCase() === 'south korea' ||
     combinedParams.toLowerCase() === 'skorea' || combinedParams.toLowerCase() === 's korea'){combinedParams = 'S. Korea';}
    if(combinedParams.toLowerCase() === 'n korea' || combinedParams.toLowerCase() === 'north korea' ||
     combinedParams.toLowerCase() === 'nkorea' || combinedParams.toLowerCase() === 'nk'){channel.send("North Korea stats are not available."); return;}

    // Get cases
    if (command === 'cases' || command === 'case' || command === 'c' || command === 'confirmed') {
      //getUsCases(channel, code_in[1]);
      console.log(chalk.green(chalk.blue("cases") + " command called by " + chalk.yellow(msg.author.username) + " in: " + chalk.cyan(message.guild.name)));
      getCases(channel, combinedParams);

      // Get deaths
    } else if (command === 'deaths' || command === 'death' || command === 'd' || command === 'dead' || command === 'died') {
      console.log(chalk.green(chalk.blue("deaths") + " command called by " + chalk.yellow(msg.author.username) + " in: " + chalk.cyan(message.guild.name)));
      getDeaths(channel, combinedParams);

      // Get recoveries
    } else if (command === 'recoveries' || command === 'recovered' || command === 'r' || command === 'recover' || command === 'recovery') {
      console.log(chalk.green(chalk.blue("recoveries") + " command called by " + chalk.yellow(msg.author.username) + " in: " + chalk.cyan(message.guild.name)));
      getRecoveries(channel, combinedParams);

      // Get summary for a country
    } else if (command === 'su' || command === 'summary' || command === 'overview' || command === 'stats' || command === 'sum') {
      console.log(chalk.green(chalk.blue("Summary") + " command called by " + chalk.yellow(msg.author.username) + " in: " + chalk.cyan(message.guild.name) + " on: " + chalk.cyan(combinedParams)));
      getSummary(channel, combinedParams);

      // Get info for US states
    } else if (command === 'state' || command === 'states' || command === 's' || command === 'st') {
      console.log(chalk.green(chalk.blue("State") + " command called by " + chalk.yellow(msg.author.username) + " in: " + chalk.cyan(message.guild.name) + " on: " + chalk.cyan(combinedParams)));
      getUsCases(channel, combinedParams);

      // Help
    } else if (command === 'help' || !command) {
      console.log(chalk.cyan("help command deployed to " + chalk.yellow(message.author.username) + chalk.green(" in: ") + chalk.cyan(message.guild.name)));
      channel.send("Hi there! This bot is a very rapidly changing **work in progress** and just recently began development.\n"
        + "Basic stats for countries accross the world are available currently. More details and enahanced summary reports will be added soon!\n\n" +
        "**Here's how to use what's available so far:**\n" +
        ":small_blue_diamond: To see total cases worldwide, use  `.cv cases`\n" +
        ":small_blue_diamond: To see total deaths worldwide, use  `.cv deaths`\n" +
        ":small_blue_diamond: To see total recoveries worldwide, use  `.cv recoveries`\n" +
        ":small_blue_diamond: To see total cases/deaths/recoveries in a particular country, simply add the country after the command like this: `.cv deaths <country>`\n" +
        ":pencil: Here's an example command:  `.cv cases us`  => display confirmed cases in the United States\n" +
        ":pencil: NOTE: Currently supported command prefixes are either `.cv` or `-c`");

      // Github
    } else if (command === 'github' || command === 'source' || command === 'code') {
      channel.send("https://github.com/YoloSwagDogDiggity/Covid-19");
      console.log(chalk.cyan("Github repo deployed to " + chalk.yellow(message.author.username) + chalk.green(" in: ") + chalk.cyan(message.guild.name)));

      // Invite
    } else if (command === 'invite' || command === 'add' || command === 'join') {
      channel.send("I'm thrilled you want me to join you! I'll make it super easy to invite me to your server using this link: \n" +
        "https://discordapp.com/oauth2/authorize?client_id=691863138559328327&scope=bot&permissions=67488832");
      console.log(chalk.cyan("Invite link deployed to " + chalk.yellow(message.author.username) + chalk.green(" in: ") + chalk.cyan(message.guild.name)));

      // Donate to response efforts
    } else if (command === 'donate' || command === 'don' || command === 'give') {
      channel.send("During this time of critical need, any financial support will go a very long way to help save lives. Here's is a link to donate to the official COVID-19 Solidarity Response Fund: \n" +
        "https://www.who.int/emergencies/diseases/novel-coronavirus-2019/donate");
      console.log(chalk.cyan("Donation link deployed to " + chalk.yellow(message.author.username) + chalk.green(" in: ") + chalk.cyan(message.guild.name)));
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

function getCases(chn, param) {
  let paramBackup = param;
  if (param) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          let chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newcases) {
              var yote = "  (" + chunk.newcases + " today)"
            } else { var yote = ""; }
            chn.send("Total confirmed cases in **" + chunk.country + ":**  " + chunk.cases + yote);
            return;
          }
        }
        chn.send("That input was not recognized. Enter a valid country and try again. " +
          "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
        console.log(chalk.yellow("Unmatched country cache key needs custom value: " + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        let chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newcases) {
            var yote = "  (" + chunk.newcases + " today)"
          } else { var yote = ""; }
          chn.send("Total confirmed cases in **" + chunk.country + ":**  " + chunk.cases + yote);
          return;
        }
      }
      chn.send("That input was not recognized. Try entering the country abbreviation instead." +
        "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
      console.log(chalk.yellow("Unmatched country cache key NAME: " + chalk.cyan(param)));
    }
  }
  else {
    chn.send("Total confirmed cases worldwide: " + worldCacheJSON[0].totalCases)
  }
}



function getDeaths(chn, param) {
  let paramBackup = param;
  if (param) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          let chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newdeaths) {
              var yote = "  (" + chunk.newdeaths + " today)"
            } else { var yote = ""; }
            chn.send("Total confirmed deaths in **" + chunk.country + ":**  " + chunk.deaths + yote);
            return;
          }
        }
        chn.send("That input was not recognized. Enter a valid country and try again. " +
          "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
        console.log(chalk.yellow("Unmatched country cache key needs custom value: " + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        let chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newdeaths) {
            var yote = "  (" + chunk.newdeaths + " today)"
          } else { var yote = ""; }
          chn.send("Total confirmed deaths in **" + chunk.country + ":**  " + chunk.deaths + yote);
          return;
        }
      }
      chn.send("That input was not recognized. Try entering the country abbreviation instead." +
        "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
      console.log(chalk.yellow("Unmatched country cache key NAME: " + chalk.cyan(param)));
    }
  }
  else {
    chn.send("Total confirmed deaths worldwide: " + worldCacheJSON[0].totalDeaths)
  }
}



function getRecoveries(chn, param) {
  let paramBackup = param;
  if (param) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          let chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.recovered) {
              chn.send("Total confirmed recoveries in **" + chunk.country + ":**  " + chunk.recovered);
            } else {
              chn.send("No recoveries reported yet.")
            }
            return;
          }
        }
        chn.send("That input was not recognized. Enter a valid country and try again. " +
          "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
        console.log(chalk.yellow("Unmatched country cache key needs custom value: " + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        let chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.recovered) {
            chn.send("Total confirmed recoveries in **" + chunk.country + ":**  " + chunk.recovered);
          } else {
            chn.send("No recoveries reported yet.")
          }
          return;
        }
      }
      chn.send("That input was not recognized. Try entering the country abbreviation instead." +
        "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
      console.log(chalk.yellow("Unmatched country cache key NAME: " + chalk.cyan(param)));
    }
  }
  else {
    chn.send("Total confirmed recoveries worldwide: " + worldCacheJSON[0].totalRecovered)
  }
}



function getSummary(chn, param) {
  let paramBackup = param;
  let cases = '';
  let deaths = '';
  let recoveries = '';
  let active = '';
  let critical = '';
  if (param) {
    // Convert abbreviated country input to full name for json access
    if (param && param.length == 2) {
      param = shortcountrynames.to_name(param.toUpperCase());
      if (param) {
        for (let i = 1; i < worldCacheJSON.length; i++) {
          let chunk = worldCacheJSON[i];
          if (chunk.country.toLowerCase() == param.toLowerCase()) {
            if (chunk.newcases) {
              var yote = "  (" + chunk.newcases + " today)"
            } else { var yote = ""; }
            if (chunk.newdeaths) {
              var yote2 = "  (" + chunk.newdeaths + " today)"
            } else { var yote2 = ""; }
            cases = chunk.cases + yote;
            deaths = chunk.deaths + yote2;
            recoveries = chunk.recovered;
            active = chunk.activecases;
            critical = chunk.criticalcases;
            chn.send("**__" + chunk.country + ":__**\n" +
              "Total Cases:       " + cases + "\n" +
              "Active Cases:     " + active + "\n" +
              "Critcal Cases:     " + critical + "\n" +
              "Deaths:                " + deaths + "\n" +
              "Recoveries:         " + recoveries);
            return;
          }
        }
        chn.send("That input was not recognized. Enter a valid country and try again. " +
          "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
        console.log(chalk.yellow("Unmatched country cache key needs custom value: " + chalk.cyan(param)));
      }
    }
    else {
      for (let i = 1; i < worldCacheJSON.length; i++) {
        let chunk = worldCacheJSON[i];
        if (chunk.country.toLowerCase() == param.toLowerCase()) {
          if (chunk.newcases) {
            var yote = "  (" + chunk.newcases + " today)"
          } else { var yote = ""; }
          if (chunk.newdeaths) {
            var yote2 = "  (" + chunk.newdeaths + " today)"
          } else { var yote2 = ""; }
          cases = chunk.cases + yote;
          deaths = chunk.deaths + yote2;
          recoveries = chunk.recovered;
          active = chunk.activecases;
          critical = chunk.criticalcases;
          chn.send("**__" + chunk.country + ":__**\n" +
            "Total Cases:       " + cases + "\n" +
            "Active Cases:     " + active + "\n" +
            "Critcal Cases:     " + critical + "\n" +
            "Deaths:                " + deaths + "\n" +
            "Recoveries:         " + recoveries);
          return;
        }
      }
      chn.send("That input was not recognized. Try entering the country abbreviation instead." +
        "\nIf you know you entered a valid country, please be patient for this to be fixed. This occurance has been logged and will be reviewed.");
      console.log(chalk.yellow("Unmatched country cache key NAME: " + chalk.cyan(param)));
    }
  }
  else {
    chn.send("**__Worldwide:__**\n" +
      "Cases: " + worldCacheJSON[0].totalCases + "\n" +
      "Deaths: " + worldCacheJSON[0].totalDeaths + "\n" +
      "Recoveries: " + worldCacheJSON[0].totalRecovered + "\n" +
      "Active Cases: " + worldCacheJSON[0].totalActiveCases);
  }
}



function getUsCases(chn, state) {
  let foundState = false;
  // Convert abbreviated state input to full name for json access
  if (state && state.length == 2) {
    state = abbrState(state.toUpperCase(), "name")
  }
  if (state) {
    for (let j = 0; j < statesJSON.length; j++) {
      if (statesJSON[j]["state"] && (statesJSON[j]["state"].toUpperCase() == state.toUpperCase())) {
        state = statesJSON[j].state;
        let chunk = statesJSON[j];
        if (chunk.newcases) {
          var yote = "  (" + chunk.newcases + " today)"
        } else { var yote = ""; }
        if (chunk.newdeaths) {
          var yote2 = "  (" + chunk.newdeaths + " today)"
        } else { var yote2 = ""; }
        var cases = chunk.cases + yote;
        var active = chunk.activecases;
        var deaths = chunk.deaths + yote2;
        var recovered = (Number(chunk.cases.replace(/,/g, '')) - (Number(chunk.deaths.replace(/,/g, '')) + Number(chunk.activecases.replace(/,/g, ''))));
        foundState = true;
      }
    }
    if (foundState) {
      if (recovered == "0") { recovered = "0 (or not reported)" }
      chn.send("__**" + state + ":**__ " +
        "\nCases:                " + cases +
        "\nActive Cases:   " + active +
        "\nDeaths:              " + deaths +
        "\nRecoveries:       " + numberWithCommas(recovered));
    }
    else {
      chn.send("That state wasn't found! Make sure you enter a valid US state and try again.\n(Example:  `.cv state mn`  for data from Minnesota)")
    }
  }
  else {
    chn.send("That input was not recognized. Enter a valid US state and try again.");
    console.log(chalk.yellow("Unmatched state key value: " + chalk.cyan(state)));
  }
}



// not active
function getUsDeaths(chn) {
  chn.send("U.S. " + generalJSON.deaths + "\n(Support for localized death stats is coming soon)")
  console.log(chalk.magenta("deaths called!"));
}




// -------------------------------------------
// -------------------------------------------
//
//           TO-DO COMMAND STUFF
//
// -------------------------------------------
// -------------------------------------------

function getTop10ByTodaysGains(chn) {
}
function getTop10ByCasesandothers(chn) {
}
function getUSStateCasesDeathsRecoveries(chn) {
}
function getDetailedStats(chn) { //This one is a long shot, but if possible add some things like age group and city stats as well as severeity of cases
}
function getActiveCases(chn) { //Cases actually active for infection (total - the recovered/dead)
}




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
    statesJSON = JSON.parse(fs.readFileSync("USstats.json", "utf8"));
    worldCacheJSON = JSON.parse(fs.readFileSync("WorldStats.json", "utf8"));
  }, 15000); // wait for data collection to finish before reading files again
}



// Function to add commas to numbers
function numberWithCommas(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}



// Utility function to convert state abbreviations
function abbrState(input, to) {
  var states = [
    ['Arizona', 'AZ'],
    ['Alabama', 'AL'],
    ['Alaska', 'AK'],
    ['Arkansas', 'AR'],
    ['California', 'CA'],
    ['Colorado', 'CO'],
    ['Connecticut', 'CT'],
    ['Delaware', 'DE'],
    ['Florida', 'FL'],
    ['Georgia', 'GA'],
    ['Hawaii', 'HI'],
    ['Idaho', 'ID'],
    ['Illinois', 'IL'],
    ['Indiana', 'IN'],
    ['Iowa', 'IA'],
    ['Kansas', 'KS'],
    ['Kentucky', 'KY'],
    ['Louisiana', 'LA'],
    ['Maine', 'ME'],
    ['Maryland', 'MD'],
    ['Massachusetts', 'MA'],
    ['Michigan', 'MI'],
    ['Minnesota', 'MN'],
    ['Mississippi', 'MS'],
    ['Missouri', 'MO'],
    ['Montana', 'MT'],
    ['Nebraska', 'NE'],
    ['Nevada', 'NV'],
    ['New Hampshire', 'NH'],
    ['New Jersey', 'NJ'],
    ['New Mexico', 'NM'],
    ['New York', 'NY'],
    ['North Carolina', 'NC'],
    ['North Dakota', 'ND'],
    ['Ohio', 'OH'],
    ['Oklahoma', 'OK'],
    ['Oregon', 'OR'],
    ['Pennsylvania', 'PA'],
    ['Rhode Island', 'RI'],
    ['South Carolina', 'SC'],
    ['South Dakota', 'SD'],
    ['Tennessee', 'TN'],
    ['Texas', 'TX'],
    ['Utah', 'UT'],
    ['Vermont', 'VT'],
    ['Virginia', 'VA'],
    ['Washington', 'WA'],
    ['West Virginia', 'WV'],
    ['Wisconsin', 'WI'],
    ['Wyoming', 'WY'],
  ];

  if (to == 'abbr') {
    input = input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    for (i = 0; i < states.length; i++) {
      if (states[i][0] == input) {
        return (states[i][1]);
      }
    }
  } else if (to == 'name') {
    input = input.toUpperCase();
    for (i = 0; i < states.length; i++) {
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

client.login(keys['token']);