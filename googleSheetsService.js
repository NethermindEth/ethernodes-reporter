const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAuthToken() {
  const auth = new google.auth.GoogleAuth({
    scopes: SCOPES
  });
  const authToken = await auth.getClient();
  return authToken;
}
 
async function appendValues({spreadsheetId, values}) {
    const auth = await getAuthToken();
    return new Promise((resolve, reject) => {
        let resource = {
        values,
        };
        sheets.spreadsheets.values.append({
        spreadsheetId,
        auth,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        resource,
        }, (err, result) => {
        if (err) {
            console.log(err);
            reject(err);
        } else {
            console.log('updated remote csv');
            resolve(result);
        }
        });
    });
}

async function getSpreadSheetValues({spreadsheetId, sheetName}) {
    const auth = await getAuthToken();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      auth,
      range: sheetName
    });
    return res.data.values;
}

module.exports = {
    getAuthToken,
    appendValues,
    getSpreadSheetValues,
};
  