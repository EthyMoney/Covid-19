//
// Slash command schema.
//
// Kept separate from main.js so the definition can be validated without connecting to Discord.
// SlashCommandBuilder#toJSON() enforces Discord's naming and length rules, so simply building this
// is a meaningful check -- see `npm test`.
//

import { SlashCommandBuilder } from 'discord.js';

const location = (option, description) =>
  option.setName('location').setDescription(description).setAutocomplete(true);

const LOCATION_HINT = 'Country or continent. Leave empty for worldwide.';

// A single namespaced /covid command with subcommands, so the bot claims exactly one name in a
// server's command list instead of squatting on generic ones like /help and /info.
export const covidCommand = new SlashCommandBuilder()
  .setName('covid')
  .setDescription('Covid-19 statistics from around the world')
  .addSubcommand(sub => sub
    .setName('summary')
    .setDescription('Full statistics for a country, continent, or worldwide')
    .addStringOption(o => location(o, LOCATION_HINT)))
  .addSubcommand(sub => sub
    .setName('cases')
    .setDescription('Confirmed cases for a country, continent, or worldwide')
    .addStringOption(o => location(o, LOCATION_HINT)))
  .addSubcommand(sub => sub
    .setName('deaths')
    .setDescription('Confirmed deaths for a country, continent, or worldwide')
    .addStringOption(o => location(o, LOCATION_HINT)))
  .addSubcommand(sub => sub
    .setName('recoveries')
    .setDescription('Confirmed recoveries for a country, continent, or worldwide')
    .addStringOption(o => location(o, LOCATION_HINT)))
  .addSubcommand(sub => sub
    .setName('state')
    .setDescription('Statistics for a US state')
    .addStringOption(o => o
      .setName('state')
      .setDescription('US state name or 2-letter abbreviation')
      .setRequired(true)
      .setAutocomplete(true)))
  .addSubcommand(sub => sub.setName('time').setDescription('Time until the daily counters reset'))
  .addSubcommand(sub => sub.setName('help').setDescription('How to use this bot'))
  .addSubcommand(sub => sub.setName('info').setDescription('Bot session statistics and links'))
  .addSubcommand(sub => sub.setName('invite').setDescription('Get a link to add this bot to another server'))
  .addSubcommand(sub => sub.setName('source').setDescription('Get a link to the GitHub repository'))
  .addSubcommand(sub => sub.setName('donate').setDescription('Support the W.H.O. Covid-19 response fund'));

export const commandList = [covidCommand];
