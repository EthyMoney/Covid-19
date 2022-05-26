const fs = require('fs');
const console = require('node:console');
const chalk = require('chalk');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   This script is used to pull data from the html tables of worldOmeters and store it in a local json file cache   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Collects data for U.S. states
async function usStatsCacher() {
  const res = await fetch('https://www.worldometers.info/coronavirus/country/us/');
  if (res.ok) {
    const data = await res.text();
    const dom = new JSDOM(data);
    let jsonArr = [];
    const table = dom.window.document.getElementById('usa_table_countries_today').tBodies.item(0).rows;
    for (let i = 0; i < table.length; i++) {
      const cells = table[i].cells;
      const JSONbuilder = {
        'state': cells[1].textContent.trim(),
        'cases': cells[2].textContent.trim(),
        'newcases': cells[3].textContent.trim(),
        'deaths': cells[4].textContent.trim(),
        'newdeaths': cells[5].textContent.trim(),
        'recoveries': cells[6].textContent.trim(),
        'activecases': cells[7].textContent.trim(),
        'casesbypop': cells[8].textContent.trim(),
        'deathsbypop': cells[9].textContent.trim(),
        'testsperformed': cells[10].textContent.trim(),
        'testsperformedbypop': cells[11].textContent.trim()
      };
      jsonArr.push(JSONbuilder);
    }
    fs.writeFile('USstats.json', JSON.stringify(jsonArr), function (err) {
      if (err)
        return console.log(err);
    });
    console.log(chalk.magenta('Successfully cached US data!!'));
  }
  else {
    console.log(chalk.red('US cache retrieval error: ') + res.status);
  }
}

// Collects data for countries worldwide and overall global data
async function worldMetersCacher() {
  const res = await fetch('https://www.worldometers.info/coronavirus/');
  if (res.ok) {
    const data = await res.text();
    const dom = new JSDOM(data);
    let jsonArr = [];
    const totalCases = dom.window.document.getElementsByClassName('maincounter-number')[0].textContent.trim();
    const totalDeaths = dom.window.document.getElementsByClassName('maincounter-number')[1].textContent.trim();
    const totalRecovered = dom.window.document.getElementsByClassName('maincounter-number')[2].textContent.trim();
    const totalActiveCases = dom.window.document.getElementsByClassName('number-table-main')[0].textContent.trim();
    const JSONbuilder = {
      'totalCases': totalCases,
      'totalDeaths': totalDeaths,
      'totalRecovered': totalRecovered,
      'totalActiveCases': totalActiveCases
    };
    jsonArr.push(JSONbuilder);
    const table = dom.window.document.getElementById('main_table_countries_today').tBodies.item(0).rows;
    for (let i = 0; i < table.length; i++) {
      const cells = table[i].cells;
      const JSONbuilder2 = {
        'country': cells[1].textContent.trim(), //remove occasional newline characters
        'cases': cells[2].textContent,
        'newcases': cells[3].textContent,
        'deaths': cells[4].textContent.trim(), //deaths number has strange trailing whitespace, so it's trimmed here
        'newdeaths': cells[5].textContent,
        'recovered': cells[6].textContent,
        'activecases': cells[8].textContent,
        'criticalcases': cells[9].textContent,
        'testsperformed': cells[12].textContent,
        'testsperformedbypop': cells[13].textContent
      };
      jsonArr.push(JSONbuilder2);
    }
    fs.writeFile('WorldStats.json', JSON.stringify(jsonArr), function (err) {
      if (err)
        return console.log(err);
    });
    console.log(chalk.magenta('Successfully cached world data!!'));
  }
  else {
    console.log(chalk.red('World cache retrieval error: ') + res.status);
  }
}

exports.worldCache = worldMetersCacher;
exports.update = usStatsCacher;
