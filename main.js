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
// It's soup time! MMMMMMMMM......
//

const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const chalk = require('chalk');
const schedule = require('node-schedule');
const reloader = require('./getDataCDC');

// Secret keys and tokens
let keys = JSON.parse(fs.readFileSync('keys.json','utf8'));

// Stats
let statesJSON = JSON.parse(fs.readFileSync("CDC_data.json", "utf8"));
let generalJSON = JSON.parse(fs.readFileSync("GeneralStats.json", "utf8"));

// Set the prefix
const prefix = ['-c', '.cv', '-C', '.CV', '.Cv', '.cV'];

// Scheduled updates of data
let updateStatesStats = schedule.scheduleJob('30 3 * * *', updateCache); // update at 3:30 pm every day for new CDC data




client.on('ready', () => {
  console.log(chalk.greenBright(`Logged in as ${client.user.tag}!`));
  updateCache(); //refresh cache on startup right away
});




client.on('message', message => {

  // Check for Ghost users
  if (message.author === null) return;

  // Check for, and ignore DM channels (this is a safety precaution)
  if (message.channel.type !== 'text') return;

  // Forward message to the commands processor
  commands(message, false);
});




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
    channel.send('sup ' + "<@!" + message.author.id + ">" + ' (`' + ping + " ms`)");
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
    // Check commands that don't require paramers
    //

    // Get cases in the US
    if (command === 'cases') {
      getUsCases(channel, code_in[1]);

      // Get deaths in the US
    } else if (command === 'deaths') {
      getUsDeaths(channel);

      // Statistics
    } else if (command === 'help' || !command) {
      console.log(chalk.cyan("help command deployed to " + chalk.yellow(message.author.username)));
      channel.send("Hi there! This bot is a rapidly changing **work in progress** and just began development.\n"
        + "Only the U.S. is currently supported for basic stats right now, but so much more functionality is in progress so hang in there please! :)\n\n" +
        "**Here's how to use what's available so far:**\n" +
        ":small_blue_diamond: To see total cases and deaths reported, use  `.cv cases`\n" +
        ":small_blue_diamond: To see total cases in a particular state, use  `.cv cases <state>`\n" +
        ":pencil: NOTE: Currenly supported command prefixes are either `.cv` or `-c`\n" +
        ":pencil: Here's an example command:  `.cv cases mn`  => display confirmed cases in the state of Minnesota");
    }
  }
}





function getUsCases(chn, state) {
  let cases = '';
  let foundState = false;

  // Convert abbreviated state input to full name for json access
  if (state && state.length == 2) {
    state = abbrState(state.toUpperCase(), "name")
  }

  if (state) {
    for (let j = 0, len = statesJSON.data.length; j < len; j++) {
      if (statesJSON.data[j]["Jurisdiction"] && (statesJSON.data[j]["Jurisdiction"].toUpperCase() == state.toUpperCase())) {
        cases = statesJSON.data[j]["Cases Reported"];
        foundState = true;
      }
    }
    if (foundState) {
      chn.send("Confirmed cases in **" + state + ":** " + cases);
    }
    else {
      chn.send("That state wasn't found! Make sure you enter a valid US state and try again.\n(Example:  `.cv cases mn`  for cases in Minnesota)")
    }
    console.log(chalk.green("cases called on: " + chalk.yellow(state)));
  }
  else {
    //national stats if no state provided
    chn.send("__United States__:\n" + generalJSON.cases + "\n" + generalJSON.deaths)
    console.log(chalk.green("national cases called!"));
  }


}



function getUsDeaths(chn) {
  chn.send("U.S. " + generalJSON.deaths + "\n(Support for localized death stats is coming soon)")
  console.log(chalk.magenta("deaths called!"));
}



//to-do
async function getUsTopState(chn) {

}



// Utility function to refresh cache with new data
function updateCache() {
  //Refresh the cache
  reloader.update();
  setTimeout(function () {
    // Read and parse the refreshed cache
    statesJSON = JSON.parse(fs.readFileSync("CDC_data.json", "utf8"));
    generalJSON = JSON.parse(fs.readFileSync("GeneralStats.json", "utf8"));
  }, 2500);
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
  }
}

client.login(keys['token']);