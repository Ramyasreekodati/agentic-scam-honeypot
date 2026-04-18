require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./src/middleware/auth');
const honeypotRouter = require('./src/routes/honeypot');
const gmailService = require('./src/services/gmailService');
const emailServiceGeneric = require('./src/services/emailServiceGeneric');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});

app.use(limiter);
app.use(bodyParser.json());
app.use(express.static('public'));

// Main Honeypot Route
app.use('/api', honeypotRouter);

// Gmail Account Info
app.get('/api/gmail/account', async (req, res) => {
    try {
        const email = await gmailService.getAuthorizedEmail();
        res.json({ email });
    } catch (err) {
        res.json({ email: 'Not Authorized' });
    }
});

// Gmail Integration Route
app.get('/api/gmail/check', async (req, res) => {
    try {
        const results = await gmailService.checkMail();
        res.json({ status: 'success', results });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Generic Email (IMAP) Route
app.get('/api/email/scan', async (req, res) => {
    try {
        const results = await emailServiceGeneric.scanInbox(50);
        res.json({ status: 'success', results });
    } catch (error) {
        console.error('Email Scan Error:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Agentic Honey-Pot API running on port ${PORT}`);
  
  // Start Real-time Background Polling (Every 5 minutes)
  // [DISABLED FOR NOW TO SAVE API QUOTA FOR EVALUATIONS]
  /*
  console.log('[SYSTEM] Real-time Gmail Monitoring: STARTING...');
  setInterval(async () => {
    try {
        const results = await gmailService.checkMail(5);
        if (results && results.length > 0) {
            console.log(`[BACKGROUND] Processed ${results.length} new emails.`);
        }
    } catch (err) {
        console.error('[BACKGROUND SCAN ERROR]', err.message);
    }
  }, 5 * 60 * 1000); 
  */
});
