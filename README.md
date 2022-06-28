# Covid-19 [![Discord Bots](https://top.gg/api/widget/status/691863138559328327.svg)](https://top.gg/bot/691863138559328327) [![Discord Bots](https://top.gg/api/widget/servers/691863138559328327.svg)](https://top.gg/bot/691863138559328327)
Description: Covid-19 is a simple discord bot with functionality related to live statistics and reporting from around the world for the Novel Coronavirus pandemic of 2020 (Officially named Covid-19).

[Click here to add the pre-hosted bot to your discord server!](https://discordapp.com/oauth2/authorize?client_id=691863138559328327&scope=bot&permissions=67488832)
<br><br>
[Click here for instructions to host your OWN bot!](#running-your-own-bot)
<br><br>

## Commands and usage:
* To see a situation summary for worldwide, simply use  `.cv`
* For a specific country, use  `.cv <country>`
* For a US state, use  `.cv s <state>`
* For countries, you can also view cases/deaths/recoveries individually using  `.cv <c/d/r> <country>`
## Examples:
* `.cv de`      => display summary for Germany.
* `.cv c us`  => display only cases for United States.
* `.cv d it`  => display only deaths for italy.
* `.cv s mn`  => display summary for the state of Minnesota.
* `.cv d it`  => display only deaths for italy.
* `.cv r`        => display only recoveries for worldwide.
## Notes and extras:
* You can use either the 2-letter abbreviation, or the full name for countries and states.
* You can use either `.cv` OR `-c` as the prefix for commands, so take your pick!
* This bot is open source and frequently updated! You can get the github link using `.cv source`.
* Spare some change to support Covid-19 releif efforts? Use `.cv donate` to get a link to official W.H.O. Solidarity Response Fund.
* Last thing I swear.. Please share this bot if you like it! You can get the invite link to add the bot to your other servers using `.cv invite`.
<br>

## Running Your Own Bot

Want to try building and hosting your own Covid-19 bot? You're in the right place! Follow these instructions to get up and going:

* Install [Node.js](https://nodejs.org/) on your machine. Available on the Node.js website and most package managers on multiple platforms!
* Clone this repo to your machine. Either download as zip or use a terminal and run `git clone https://github.com/EthyMoney/Covid-19.git`.
* Open the project folder directory in a terminal and then run `npm install` to automatically install all needed project dependencies.
* Now head over to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new bot application. Save the application token after you reset it once the bot is made. Keep this token private and safe!
* Also save your application ID, this will be used for making an invite link for the bot.
* Replace the `APPLICATION_ID` part of this link with your own application ID: `https://discordapp.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=67488832`. Save this link for later and use it to share the bot with others, this is the invite link to add the bot to servers!
* Open the `keys.json` file in a text editor and paste your token into there for the "token" property. Replace the placeholder `YOUR_DICORD_BOT_TOKEN_HERE` text.
* Great! You are now ready to start your bot. From a terminal in the project directory, run `node main.js`.
* Now that your bot is running, go ahead and open that invite link that you made earlier and add the bot to your server. Be sure to leave all of the permissions checked so it can work properly!
* That's it! You are now running your very own instance of Covid-19 bot. That was fun right?  :)
