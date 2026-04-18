require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./src/middleware/auth');
const honeypotRouter = require('./src/routes/honeypot');
const gmailService = require('./src/services/gmailService');
const emailServiceGeneric = require('./src/services/emailServiceGeneric');

const app = express();
const PORT = process.env.PORT || 3000;

// Session Management (Fix 7)
app.use(session({
  secret: process.env.SESSION_SECRET || 'honeypot-agent-secret-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});

app.use(limiter);
app.use(bodyParser.json());
app.use(express.static('public'));

// Main Honeypot API
app.use('/api', honeypotRouter);

// --- DYNAMIC GMAIL OAUTH (Fix 1 & 3) ---

app.get('/api/auth/google', (req, res) => {
    const authUrl = gmailService.generateAuthUrl();
    res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokens = await gmailService.getTokens(code);
        req.session.tokens = tokens; // Store in session
        const email = await gmailService.getAuthorizedEmail(tokens);
        req.session.userEmail = email;
        res.redirect('/?auth=success');
    } catch (err) {
        console.error('OAuth Callback Error:', err.message);
        res.redirect('/?auth=failed');
    }
});

app.get('/api/gmail/account', async (req, res) => {
    if (req.session.userEmail) {
        return res.json({ email: req.session.userEmail });
    }
    res.json({ email: 'Not Authorized' });
});

app.get('/api/gmail/check', async (req, res) => {
    try {
        if (!req.session.tokens) {
            return res.status(401).json({ status: 'error', message: 'Please login with Google first' });
        }
        const results = await gmailService.checkMail(req.session.tokens);
        res.json({ status: 'success', results });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Generic Email (IMAP) - Fallback (Fix 1)
app.get('/api/email/scan', async (req, res) => {
    try {
        const results = await emailServiceGeneric.scanInbox(20);
        res.json({ status: 'success', results });
    } catch (error) {
        console.error('Email Scan Error:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), user: req.session.userEmail || 'guest' });
});

app.listen(PORT, () => {
  console.log(`Agentic Honey-Pot Production API running on port ${PORT}`);
});
