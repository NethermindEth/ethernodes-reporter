const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { getSpreadSheetValues } = require('./googleSheetsService.js');

const slackToken = process.env.SLACK_TOKEN,
      spreadsheetId = process.env.DOC_ID;

async function postMessage(message) {
  console.log("Sending Slack Message")
  const url = 'https://slack.com/api/chat.postMessage';
  const res = await axios.post(url, {
    channel: 'team-core-public',
    blocks: JSON.stringify(message)
  }, { headers: { 'Content-Type': 'application/json; charset=utf-8', authorization: `Bearer ${slackToken}` } });
  console.log('Done Posting Message');
}

function uploadFile(file) {
  const form = new FormData();

  form.append('token', slackToken)
  form.append('channels', 'monitoring-test')
  form.append('file', fs.createReadStream(file), 'nethermind-versions-usage.csv')

  return axios.post('https://slack.com/api/files.upload', form, {
      headers: form.getHeaders()
  }).then(console.log('Done Uploading File'));
}

const read = async () => {
  console.log("Inside Read");  
  console.log(fs.existsSync('/tmp/data-versions.csv'));

  const callback = async (rows) => {
    return new Promise( resolve => {

      const toCompare = rows.slice(-4,-2);
      const lastTwoRecords = rows.slice(-2);
  
      const allRecords = lastTwoRecords.filter(obj => obj.type === 'all');
      const syncedRecords = lastTwoRecords.filter(obj => obj.type === 'synced');
      const toCompareAllRecords = toCompare.filter(obj => obj.type === 'all');
      const toCompareSyncedRecords = toCompare.filter(obj => obj.type === 'synced');
  
      // data of last 2 records
      let allCount = allRecords.length > 0 ? allRecords[0].count : 0;
      let allPercentage = allRecords.length > 0 ? allRecords[0].percentage : 0;
      let syncedCount = syncedRecords.length > 0 ? syncedRecords[0].count : 0;
      let syncedPercentage = syncedRecords.length > 0 ? syncedRecords[0].percentage : 0;
  
      // data of records from day before
      let prevAllCount = toCompareAllRecords.length > 0 ? toCompareAllRecords[0].count : 0;
      let prevSyncedCount = toCompareSyncedRecords.length > 0 ? toCompareSyncedRecords[0].count : 0;
  
      const countAllGrowth = allCount - prevAllCount;
      const countSyncedGrowth = syncedCount - prevSyncedCount;
  
      if (countAllGrowth > 0) {
        allStats = `growing (+${countAllGrowth} :muscle:)`;
      } else if (countAllGrowth == 0) {
        allStats = `not moving (0 :no_mouth:)`;
      } else {
        allStats = `shrinking (${countAllGrowth} :fire_extinguisher:)`;
      }
  
      if (countSyncedGrowth > 0) {
        syncedStats = `growing (+${countSyncedGrowth} :muscle:)`;
      } else if (countSyncedGrowth == 0) {
        syncedStats = `not moving (0 :no_mouth:)`;
      } else {
        syncedStats = `shrinking (${countSyncedGrowth} :fire_extinguisher:)`;
      }
  
      const syncPercentage = Math.round(( syncedCount / allCount ) * 100);
  
      const chartLabales = rows.map(item => item.timestamp)
        .filter((value, index, self) => self.indexOf(value) === index)
      const allNodesData = rows.filter(item => item.type === 'all').map(item => item.count)
      const syncedNodesData = rows.filter(item => item.type === 'synced').map(item => item.count)
      const chart = {
        type: 'line',
        data: {
          labels: chartLabales,
          datasets: [
            {
              label: 'All nodes',
              data: allNodesData,
            },
            {
              label: 'Synced',
              data: syncedNodesData,
            }
          ],
        },
        options: {
          legend: {
            display: true,
            position: 'right',
            align: 'start'
          }
        }
      }
  
      const encodedChart = encodeURIComponent(JSON.stringify(chart));
      const chartUrl = `https://quickchart.io/chart?c=${encodedChart}`;

      postMessage([
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `Today there are *${allCount}* | *${allPercentage}* Nethermind nodes from which *${syncedCount}* | *${syncedPercentage}* are synced (*${syncPercentage}%*)!
  The number of all nodes is *${allStats}* and synced nodes are *${syncedStats}*`
            }
          },
          {
            "type": "image",
            "title": {
              "type": "plain_text",
              "text": "Ethernodes.org Nethermind nodes data"
            },
            "block_id": "quickchart-image",
            "image_url": `${chartUrl}`,
            "alt_text": "Ethernodes.org statistics of Nethermind nodes"
          }
        ]
      ).then(uploadFile('/tmp/data-versions.csv').catch(err => console.log(err))).catch(err => console.log(err));
    });
  };
  
  const raw_rows = await getSpreadSheetValues({spreadsheetId: spreadsheetId, sheetName: 'data'})
  const rows = raw_rows.map((row) => {
    const [timestamp, name, count, type, percentage] = row;
    return {
      timestamp: timestamp,
      name: name,
      count: count,
      type: type,
      percentage: percentage,
    }
  });
  
  if (rows.length >= 70) {
    await callback(rows.slice(-70));
  }
  else {
    await callback(rows);
  }
};

module.exports = { read };