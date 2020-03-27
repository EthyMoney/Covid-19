var rp = require('request-promise');
var fs = require('fs');
const chalk = require('chalk');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;



function update2() {
  var options = {
    uri: 'https://www.cdc.gov/coronavirus/2019-ncov/map-cases-us.json',
    json: true // Automatically parses the JSON string in the response
  };
  rp(options)
    .then(function (nice) {
      fs.writeFile("CDC_data.json", JSON.stringify(nice), function (err) {
        if (err)
          return console.log(err);
      });
    })
    .catch(function (err) {
      // API call failed...
      console.log("CDC API Failed to respond...")
    });
  rp('https://www.cdc.gov/coronavirus/2019-ncov/cases-updates/cases-in-us.html')
    .then(function (nice) {
      const dom = new JSDOM(nice);
      let block = dom.window.document.getElementsByClassName("card-body bg-white");
      let DOMcases = block[0].querySelector("ul").firstElementChild;
      let DOMdeaths = DOMcases.nextElementSibling;
      let totalCasesUS = DOMcases.textContent;
      let totalDeathsUS = DOMdeaths.textContent;
      let JSONbuilder = {
        "cases": totalCasesUS,
        "deaths": totalDeathsUS
      }
      fs.writeFile("GeneralStats.json", JSON.stringify(JSONbuilder), function (err) {
        if (err)
          return console.log(err);
      });
      console.log(chalk.magenta("Successfully cached US CDC data!!"));
    })
    .catch(function (err) {
      // API call failed...
      console.log(err)
    });
}


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
        "country": cells[0].textContent,
        "cases": cells[1].textContent,
        "newcases": cells[2].textContent,
        "deaths": cells[3].textContent.trim(), //deaths number has strange trailing whitespace, so it's trimmed here
        "newdeaths": cells[4].textContent,
        "recovered": cells[5].textContent,
        "activecases": cells[6].textContent,
        "criticalcases": cells[7].textContent
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
exports.update = update2;