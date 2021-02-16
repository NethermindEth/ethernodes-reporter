const parse = require('csv-parse')
const fs = require('fs')
const axios = require('axios');
const FormData = require('form-data');
const slackToken = 'slack token here';

async function postMessage(message) {
  const url = 'https://slack.com/api/chat.postMessage';
  const res = await axios.post(url, {
    channel: '#general',
    blocks: JSON.stringify(message)
  }, { headers: { 'Content-Type': 'application/json; charset=utf-8', authorization: `Bearer ${slackToken}` } });

  console.log('Done');
}

function uploadFile(file) {
  const form = new FormData();

  form.append('token', slackToken)
  form.append('channels', 'general')
  form.append('file', fs.createReadStream(file), 'nethermind-versions-usage.csv')

  return axios.post('https://slack.com/api/files.upload', form, {
      headers: form.getHeaders()
  }).then(console.log('Done'));
}

const today = new Date()
const yesterday = new Date(today.setDate(today.getDate() - 1));

fs.readFile('data.csv', function (err, fileData) {
  parse(fileData, {columns: true, trim: true}, function(err, rows) {

    const toCompare = rows.slice(-4,-2)
    const lastTwoRecords = rows.slice(-2)

    const allRecords = lastTwoRecords.filter(obj => obj.type === 'all')
    const syncedRecords = lastTwoRecords.filter(obj => obj.type === 'synced')
    const toCompareAllRecords = toCompare.filter(obj => obj.type === 'all')
    const toCompareSyncedRecords = toCompare.filter(obj => obj.type === 'synced')

    // data of last 2 records
    let allCount = allRecords[0].count
    let allPercentage = allRecords[0].percentage
    let syncedCount = syncedRecords[0].count
    let syncedPercentage = syncedRecords[0].percentage

    // data of records from day before
    let prevAllCount = toCompareAllRecords[0].count
    let prevSyncedCount = toCompareSyncedRecords[0].count

    countAllGrowth = allCount - prevAllCount
    countSyncedGrowth = syncedCount - prevSyncedCount

    if (countAllGrowth > 0) {
      allStats = `growing (+${countAllGrowth} :muscle:)`
    } else if (countAllGrowth == 0) {
      allStats = `not moving (0 :no_mouth:)`
    } else {
      allStats = `shrinking (${countAllGrowth} :fire_extinguisher:)`
    }

    if (countSyncedGrowth > 0) {
      syncedStats = `growing (+${countSyncedGrowth} :muscle:)`
    } else if (countSyncedGrowth == 0) {
      syncedStats = `not moving (0 :no_mouth:)`
    } else {
      syncedStats = `shrinking (${countSyncedGrowth} :fire_extinguisher:)`
    }

    syncPercentage = Math.round(( syncedCount / allCount ) * 100)

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
    ).then(uploadFile('data-versions.csv').catch(err => console.log(err))).catch(err => console.log(err));
  })
})