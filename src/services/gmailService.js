const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;
const scamDetector = require('./scamDetector');
const agentEngine = require('./agentEngine');
const intelligenceExtractor = require('./intelligenceExtractor');
const intelligenceStore = require('../utils/intelligenceStore');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

class GmailService {
  constructor() {
    this.processedIds = new Set(); // Simple in-memory de-duplication
  }

  /**
   * Generates the OAuth URL for a user to authorize.
   */
  generateAuthUrl() {
    const credentials = JSON.parse(require('fs').readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0] || 'http://localhost:3000/api/auth/google/callback');

    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  async getTokens(code) {
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0] || 'http://localhost:3000/api/auth/google/callback');
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens;
  }

  _getOAuthClient(tokens) {
    const credentials = JSON.parse(require('fs').readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0] || 'http://localhost:3000/api/auth/google/callback');
    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
  }

  async getAuthorizedEmail(tokens) {
    const auth = this._getOAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.getProfile({ userId: 'me' });
    return res.data.emailAddress;
  }

  async checkMail(tokens, limit = 10) {
    const auth = this._getOAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:anywhere',
      maxResults: limit
    });

    const messages = res.data.messages || [];
    const results = [];

    for (const msg of messages) {
        if (this.processedIds.has(msg.id)) continue; // Fix 5: Deduplication

        const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const snippet = fullMsg.data.snippet;
        const threadId = fullMsg.data.threadId;
        const headers = fullMsg.data.payload.headers;
        const fromHeader = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';

        // Mark as read immediately to prevent loop
        await gmail.users.messages.batchModify({
            userId: 'me',
            ids: [msg.id],
            removeLabelIds: ['UNREAD']
        });

        this.processedIds.add(msg.id);

        // Analysis logic (Fix 4)
        const detection = await scamDetector.detect({ text: snippet, subject });
        
        let status = 'ignored';
        let agentResponse = null;

        if (detection.isScam) {
            console.log(`[GmailService] SCAM DETECTED: From ${fromHeader}`);
            
            // Fix 8 & 9: Real-time agent logic
            const response = await agentEngine.generateResponse(threadId, { text: snippet }, [], { channel: 'Email', sender: fromHeader });
            
            if (response && response.text) {
                agentResponse = response.text;
                const intelligence = await intelligenceExtractor.extract([{ text: snippet }]);
                await intelligenceStore.save(threadId, intelligence, `[GMAIL SCAN] From: ${fromHeader}`);
                
                await this.sendReply(auth, threadId, fromHeader, subject, agentResponse);
                status = 'replied';
            }
        }

        results.push({ 
            id: msg.id, 
            from: fromHeader, 
            subject: subject, 
            isScam: detection.isScam, 
            status,
            reason: detection.reason,
            agentResponse,
            snippet
        });
    }

    // Fix 2: Strict validation - if no real emails found
    if (results.length === 0) {
        return { message: "No new unread emails found." };
    }

    return results;
  }

  async sendReply(auth, threadId, to, subject, body) {
    const gmail = google.gmail({ version: 'v1', auth });
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: me`,
      `To: ${to}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: Re: ${utf8Subject}`,
      `In-Reply-To: ${threadId}`,
      `References: ${threadId}`,
      '',
      body,
    ];
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage, threadId }
    });
  }
}

module.exports = new GmailService();
