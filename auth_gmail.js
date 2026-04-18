const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function authorize() {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🚀 GMAIL AUTHORIZATION REQUIRED');
  console.log('1. Open this URL in your browser:');
  console.log('\n' + authUrl + '\n');
  console.log('2. After authorizing, you will be redirected to localhost (which might fail, that is fine).');
  console.log('3. Copy the "code" parameter from the URL in your browser address bar.');
  console.log('4. Run this script again with the code: node auth_gmail.js YOUR_CODE_HERE');

  const code = process.argv[2];
  if (code) {
    const { tokens } = await oAuth2Client.getToken(code);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ Success! token.json has been created.');
    process.exit(0);
  }
}

authorize().catch(console.error);
