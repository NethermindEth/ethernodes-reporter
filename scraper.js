const rp = require('request-promise');
const fs = require('fs');
const cheerio = require('cheerio');
const csvWriter = require('csv-write-stream')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

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

links.forEach(link => getNetherminds(link).then(result => {
  for(let i in result){
    if (result[i].name == 'nethermind')
    {
      if (!fs.existsSync('data.csv'))
        writer = csvWriter({ headers: ["timestamp", "name", "count", "type", "percentage"]});
      else
        writer = csvWriter({sendHeaders: false});
        writer.pipe(fs.createWriteStream('data.csv', {flags: 'a'}));
        writer.write({
          timestamp: new Date().toISOString().split('T')[0],
          name: result[i].name,
          count: result[i].count,
          type: link.endsWith('?synced=1') ? 'synced' : 'all',
          percentage: result[i].percentage.replace(/[()]/g,'')
        });
        writer.end();
    };
  }
}).then(() => console.log('Scraping done!')))

getNethermindVersions(versions).then(result => {
  const csvWriter = createCsvWriter({
    path: 'data-versions.csv',
    header: [
        {id: 'version', title: 'version'},
        {id: 'count', title: 'count'},
        {id: 'percentage', title: 'percentage'}
    ]
  });
  console.log(result)
  csvWriter.writeRecords(result.slice(1))
    .then(() => {
        console.log('...Done');
    });
}).then(() => console.log('Scraping done!'))