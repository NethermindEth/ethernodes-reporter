const scraper = require('./scraper');
const reader = require('./reader');

exports.handler = async function(event, context) {
    console.log('writing local');
    await scraper.scraper();
    await scraper.data_versions();
    console.log('reading local and uploading to slack');
    const readres = await reader.read();
    console.log('end');
   
    const response = {
              statusCode: 200,
              body: JSON.stringify('Etherscan-reporter OK'),
          };
        return response;

};