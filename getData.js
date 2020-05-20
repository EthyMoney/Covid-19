var rp = require('request-promise');
var fs = require('fs');
const chalk = require('chalk');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   This script is used to pull data from the html tables of worldOmeters and store it in a local json file cache   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Collects data for U.S. states
function usStatsCacher() {
  rp('https://www.worldometers.info/coronavirus/country/us/')
  .then(function (nice) {
    const dom = new JSDOM(nice);
    let jsonArr = [];
    let table = dom.window.document.getElementById("usa_table_countries_today").tBodies.item(0).rows;
    for (let i = 0; i < table.length; i++) {
      let cells = table[i].cells;
      let JSONbuilder = {
        "state": cells[0].textContent.trim(),
        "cases": cells[1].textContent.trim(),
        "newcases": cells[2].textContent.trim(),
        "deaths": cells[3].textContent.trim(),
        "newdeaths": cells[4].textContent.trim(),
        "activecases": cells[5].textContent.trim()
      }
      jsonArr.push(JSONbuilder);
    }
    fs.writeFile("USstats.json", JSON.stringify(jsonArr), function (err) {
      if (err)
        return console.log(err);
    });
    console.log(chalk.magenta("Successfully cached US data!!"));
  })
  .catch(function (err) {
    console.log(chalk.red("US cache retrieval error: ") + err)
  });
}

// Collects data for countries worldwide and overall global data
function worldMetersCacher(){
  rp('https://www.worldometers.info/coronavirus/')
  .then(function (nice) {
    const dom = new JSDOM(nice);
    let jsonArr = [];
    let totalCases = dom.window.document.getElementsByClassName("maincounter-number")[0].textContent.trim();
    let totalDeaths = dom.window.document.getElementsByClassName("maincounter-number")[1].textContent.trim();
    let totalRecovered = dom.window.document.getElementsByClassName("maincounter-number")[2].textContent.trim();
    let totalActiveCases = dom.window.document.getElementsByClassName("number-table-main")[0].textContent.trim();
    let JSONbuilder = {
      "totalCases": totalCases,
      "totalDeaths": totalDeaths,
      "totalRecovered": totalRecovered,
      "totalActiveCases": totalActiveCases
    }
    jsonArr.push(JSONbuilder);
    let table = dom.window.document.getElementById("main_table_countries_today").tBodies.item(0).rows;
    for (let i = 0; i < table.length; i++) {
      let cells = table[i].cells;
      let JSONbuilder2 = {
        "country": cells[1].textContent.trim(), //remove occasional newline characters
        "cases": cells[2].textContent,
        "newcases": cells[3].textContent,
        "deaths": cells[4].textContent.trim(), //deaths number has strange trailing whitespace, so it's trimmed here
        "newdeaths": cells[5].textContent,
        "recovered": cells[6].textContent,
        "activecases": cells[7].textContent,
        "criticalcases": cells[8].textContent,
        "testsperformed": cells[11].textContent,
        "testsperformedbypop": cells[12].textContent
      }
      jsonArr.push(JSONbuilder2);
    }
    fs.writeFile("WorldStats.json", JSON.stringify(jsonArr), function (err) {
      if (err)
        return console.log(err);
    });
    console.log(chalk.magenta("Successfully cached world data!!"));
  })
  .catch(function (err) {
    console.log(chalk.red("World cache retrieval error: ") + err)
  });
}

exports.worldCache = worldMetersCacher;
exports.update = usStatsCacher;
