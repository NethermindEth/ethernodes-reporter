const rp = require('request-promise');
const fs = require('fs');
const cheerio = require('cheerio');
const csvWriter = require('csv-write-stream')

const links = [
  'https://ethernodes.org',
  'https://ethernodes.org/?synced=1'
]

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
