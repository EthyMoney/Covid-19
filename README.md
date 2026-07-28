# Covid-19 [![Discord Bots](https://top.gg/api/widget/status/691863138559328327.svg)](https://top.gg/bot/691863138559328327) [![Discord Bots](https://top.gg/api/widget/servers/691863138559328327.svg)](https://top.gg/bot/691863138559328327)

> ## ⚠️ This project is retired and archived
>
> Covid is something in the rear-view mirror for most people at this point in time. This was a fun
> side project for me to play with while my college classes were being actively disrupted by the
> pandemic. I enjoyed making it and seeing it in use, but the time to retire it has come.
>
> **This release (v2.0.0) is the final maintenance update.** It upgrades every dependency, migrates
> the bot to Discord's slash commands, and repairs the data collection that had broken as
> World-O-Meter changed their page layout over the years.
>
> It also bundles a **sample data snapshot** in [`sample-data/`](sample-data/) so you can still see
> how this functioned once World-O-Meter inevitably takes their site and tracking data down and it
> can't be gathered again. The bot automatically falls back to that snapshot when live collection
> fails, so a fresh clone stays fully usable forever.
>
> Thanks to everyone who used it. 💙

Description: Covid-19 is a simple discord bot with functionality related to live statistics and reporting from around the world for the Novel Coronavirus pandemic of 2020 (Officially named Covid-19).

<br>

## Commands and usage

All functionality lives under a single `/covid` slash command. Start typing a country or state name
and the bot will suggest matches straight from the live data, so you never have to guess the spelling.

| Command | What it does |
| --- | --- |
| `/covid summary [location]` | Full statistics for a country, continent, or worldwide |
| `/covid cases [location]` | Confirmed cases only |
| `/covid deaths [location]` | Confirmed deaths only |
| `/covid recoveries [location]` | Confirmed recoveries only |
| `/covid state <state>` | Statistics for a US state |
| `/covid time` | Time until the daily counters reset |
| `/covid help` | Show the in-bot help message |
| `/covid info` | Bot session statistics and links |
| `/covid invite` | Get a link to add the bot to another server |
| `/covid source` | Link to this repository |
| `/covid donate` | Link to the W.H.O. Solidarity Response Fund |

### Examples

* `/covid summary` — worldwide summary
* `/covid summary Germany` — summary for Germany
* `/covid summary de` — the same thing, using the 2-letter code
* `/covid cases USA` — cases for the United States
* `/covid deaths Italy` — deaths for Italy
* `/covid state MN` — summary for Minnesota
* `/covid summary North America` — summary for a whole continent

### Notes and extras

* You can use either the 2-letter abbreviation or the full name for countries and states.
* Continents work too: North America, South America, Europe, Asia, Africa and Oceania.
* Summary reports include daily counters that reset at midnight GMT. Check `/covid time` for the countdown.
* Every reply's footer states whether the numbers are live or from the archived snapshot.

<br>

## About the data

Data is scraped from [World-O-Meter](https://www.worldometers.info/coronavirus/). Two caveats worth
knowing, both discovered while preparing this final release:

* **The US state table has shrunk.** World-O-Meter no longer publishes new cases, new deaths, active
  cases, or testing figures per state. Those fields simply don't exist anymore, so `/covid state`
  reports totals, per-million rates and population. The bot says so in the reply rather than showing
  a column of blanks. (This layout change is what broke the original scraper outright — it addressed
  table columns by position, and the columns it wanted no longer existed.)
* **Columns are now matched by header name, not position.** The collector reads the table's header
  row and looks up each value by label, so a future reshuffle degrades gracefully instead of crashing.

The bundled snapshot in [`sample-data/`](sample-data/) was captured with `npm run snapshot`;
`sample-data/manifest.json` records exactly when and from where.

<br>

## Running Your Own Bot

Want to try building and hosting your own Covid-19 bot? You're in the right place! Follow these instructions to get up and going:

* Install [Node.js](https://nodejs.org/) on your machine (**version 22.22.2 or newer** is required).
* Clone this repo to your machine. Either download as zip or use a terminal and run `git clone https://github.com/EthyMoney/Covid-19.git`.
* Open the project folder directory in a terminal and then run `npm install` to automatically install all needed project dependencies.
* Now head over to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new bot application. Save the application token after you reset it once the bot is made. Keep this token private and safe!
* Copy `keys.example.json` to `keys.json` and paste your token in as the `"token"` value.
* Great! You are now ready to start your bot. From a terminal in the project directory, run `npm start`.
* Invite the bot using the link that `/covid invite` gives you, or build one yourself by replacing `APPLICATION_ID` in this link with your own application ID: `https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot%20applications.commands&permissions=67488832`
* That's it! You are now running your very own instance of Covid-19 bot. That was fun right?  :)

### A note on slash commands

The bot registers its commands with Discord automatically on startup, and it requires **no privileged
intents** — the old prefix-command version needed the Message Content intent, which this version does
away with entirely.

Global commands can take up to an hour to appear the first time. If you're testing and don't want to
wait, put your server's ID in the `"guildId"` field of `keys.json` and commands will register to that
one server instantly instead.

### Optional configuration

| `keys.json` field | Purpose |
| --- | --- |
| `token` | **Required.** Your Discord bot token. |
| `guildId` | Optional. Registers commands to a single server instantly instead of globally. |
| `dbl` | Optional. A [Top.gg](https://top.gg/) API token for publishing server-count stats. |

### Project scripts

| Command | What it does |
| --- | --- |
| `npm start` | Run the bot |
| `npm test` | Run the smoke tests against the bundled sample data |
| `npm run lint` | Lint the project with ESLint |
| `npm run snapshot` | Re-capture `sample-data/` from World-O-Meter |
