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
      console.log(chalk.green("Successfully updated CDC data cache!!"));
    })
    .catch(function (err) {
      // API call failed...
      console.log(err)
    });
} 

exports.update = update2;