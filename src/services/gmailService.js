const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('@google-cloud/local-auth');
const scamDetector = require('./scamDetector');
const agentEngine = require('./agentEngine');
const intelligenceExtractor = require('./intelligenceExtractor');
const intelligenceStore = require('../utils/intelligenceStore');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

class GmailService {
  constructor() {
    this.auth = null;
  }

  async authorize() {
    try {
      if (this.auth) return true;
      
      try {
        const token = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        this.auth.setCredentials(JSON.parse(token));
        return true;
      } catch (err) {
        // Token missing or invalid, do not hang the server
        console.warn('[GmailService] token.json not found or invalid. Manual auth required.');
        return false;
      }
    } catch (err) {
      console.error('[GmailService] OAuth Error:', err.message);
      return false;
    }
  }

  async getAuthorizedEmail() {
    if (!this.auth) await this.authorize();
    if (!this.auth) return 'Not Authorized';
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.auth });
      const res = await gmail.users.getProfile({ userId: 'me' });
      return res.data.emailAddress;
    } catch (err) {
      return 'Unknown Account';
    }
  }

  async checkMail(limit = 10) {
    if (!this.auth) await this.authorize();
    if (!this.auth) return { status: 'error', message: 'Not authorized' };

    const gmail = google.gmail({ version: 'v1', auth: this.auth });
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:anywhere',
      maxResults: limit
    });

    const messages = res.data.messages || [];
    const results = [];

    for (const msg of messages) {
        const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const snippet = fullMsg.data.snippet;
        const threadId = fullMsg.data.threadId;
        const fromHeader = fullMsg.data.payload.headers.find(h => h.name === 'From').value;
        const subject = fullMsg.data.payload.headers.find(h => h.name === 'Subject').value;

        // Mark as read (always, so we don't process again)
        await gmail.users.messages.batchModify({
            userId: 'me',
            ids: [msg.id],
            removeLabelIds: ['UNREAD']
        });

        // Throttle AI calls to stay within Free Tier limits
        await new Promise(r => setTimeout(r, 1500));
        const detection = await scamDetector.detect({ text: snippet });
        
        if (detection.isScam) {
            console.log(`[GmailService] SCAM DETECTED in email from ${fromHeader}`);
            
            // Generate Agent Reply
            const response = await agentEngine.generateResponse(threadId, { text: snippet }, [], { channel: 'Email', sender: fromHeader });
            
            if (response && response.text) {
                const { text } = response;

                // Extract Intelligence
                const intelligence = await intelligenceExtractor.extract([{ text: snippet }]);
                const agentNotes = `[EMAIL SCAN] From: ${fromHeader} | Type: ${intelligence.scamType}`;
                await intelligenceStore.save(threadId, intelligence, agentNotes);

                // Send Reply
                await this.sendReply(threadId, fromHeader, subject, text);
                results.push({ 
                    id: msg.id, 
                    from: fromHeader, 
                    subject: subject, 
                    isScam: true, 
                    status: 'replied',
                    reason: detection.reason,
                    agentResponse: text,
                    snippet: snippet
                });
            } else {
                console.warn(`[GmailService] AI failed to generate specific reply for ${fromHeader}, skipping response.`);
                results.push({ 
                    id: msg.id, 
                    from: fromHeader, 
                    subject: subject, 
                    isScam: true, 
                    status: 'ignored',
                    reason: detection.reason,
                    snippet: snippet
                });
            }
        } else {
            results.push({ 
                id: msg.id, 
                from: fromHeader, 
                subject: subject, 
                isScam: false, 
                status: 'ignored',
                snippet: snippet
            });
        }
    }

    return results;
  }

  async sendReply(threadId, to, subject, body) {
    const gmail = google.gmail({ version: 'v1', auth: this.auth });
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
      requestBody: {
        raw: encodedMessage,
        threadId: threadId
      }
    });
  }
}

module.exports = new GmailService();
