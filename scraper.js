const rp = require('request-promise');
const cheerio = require('cheerio');
const csvWriter = require('csv-write-stream')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const sheets = require('./googleSheetsService.js');
const spreadsheetId = process.env.DOC_ID;

const links = [
  'https://ethernodes.org',
  'https://ethernodes.org/?synced=1'
]

const versions = 'https://ethernodes.org/client/nethermind'

const getNetherminds = async (link) => {
  const html = await rp(link);
  const $ = cheerio.load(html);
  const clientsMap = $('li.list-group-item').map(async (i, e) => {
    const client = $(e).prev().text()
    const text = client.split(' ')[0]
    const percentage = client.split(' ')[1]
    const name = text.slice(0, text.search(/\d+$/));
    const count = text.replace(name, '');
    return {
      name,
      count,
      percentage
    }
  }).get();
  return Promise.all(clientsMap);
};

const getNethermindVersions = async (versions) => {
  const html = await rp(versions);
  const $ = cheerio.load(html);
  const versionsMap = $('li.list-group-item').map(async (i, e) => {
    const tag = $(e).prev().text()
    const numbers = $(e).prev().find('span').text()
    const version = tag.substring(0, tag.indexOf(numbers))
    const percentage = numbers.split(' ')[1]
    const count = numbers.split(' ')[0]

    return {
      version,
      count,
      percentage
    }
  }).get();
  return Promise.all(versionsMap);
};

const scraper = async () => {
  const updateCSV = async (result, link) => {
    for(let i in result){
      if (result[i].name == 'nethermind')
      {
        const values = [[
          new Date().toISOString().split('T')[0],
          result[i].name,
          result[i].count,
          link.endsWith('?synced=1') ? 'synced' : 'all',
          result[i].percentage.replace(/[()]/g,'')
        ]];
        console.log('updating remote csv');
        await sheets.appendValues({spreadsheetId: spreadsheetId, values:values});
      };
    }
  };
  for (const link of links) {
    const result = await getNetherminds(link);
    await(updateCSV(result, link));
  }
  console.log('Scraping done!');
}

const data_versions = async (callback) => {
  const result = await getNethermindVersions(versions).catch(e => { console.log(e) });
  const csvWriter2 = await createCsvWriter({
    path: '/tmp/data-versions.csv',
    header: [
        {id: 'version', title: 'version'},
        {id: 'count', title: 'count'},
        {id: 'percentage', title: 'percentage'}
    ]
  });
  console.log('result');
  console.log(result);
  await csvWriter2.writeRecords(result.slice(1));
  console.log('...Done');  
}

module.exports = { scraper, data_versions };