const imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const scamDetector = require('./scamDetector');
const agentEngine = require('./agentEngine');
const intelligenceExtractor = require('./intelligenceExtractor');
const intelligenceStore = require('../utils/intelligenceStore');

class EmailServiceGeneric {
    constructor() {
        this.config = {
            imap: {
                user: process.env.EMAIL_USER,
                password: process.env.EMAIL_PASS,
                host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
                port: process.env.EMAIL_IMAP_PORT || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 3000
            }
        };
    }

    async scanInbox(limit = 50) {
        if (!this.config.imap.user || !this.config.imap.password) {
            throw new Error('EMAIL_USER or EMAIL_PASS not configured in .env');
        }

        const connection = await imap.connect(this.config);
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const results = [];

        // Sort to get newest first
        messages.reverse();
        const topMessages = messages.slice(0, limit);

        for (const message of topMessages) {
            const all = message.parts.find(part => part.which === '');
            const id = message.attributes.uid;
            const idHeader = message.parts.find(part => part.which === 'HEADER');
            const subject = idHeader.body.subject ? idHeader.body.subject[0] : '(No Subject)';
            const from = idHeader.body.from ? idHeader.body.from[0] : 'Unknown';

            // Extract body text
            const bodyPart = message.parts.find(part => part.which === 'TEXT');
            const body = bodyPart ? bodyPart.body : '';
            
            // Clean up body (basic)
            const snippet = body.substring(0, 1000).replace(/<[^>]*>?/gm, '');

            // Analysis
            await new Promise(r => setTimeout(r, 1500));
            const detection = await scamDetector.detect({ text: snippet, subject });
            
            const analysisResult = {
                id: id,
                from: from,
                subject: subject,
                isScam: detection.isScam,
                reason: detection.reason,
                riskScore: detection.riskScore || 0,
                status: 'analyzed',
                snippet: snippet
            };

            if (detection.isScam) {
                console.log(`[EmailServiceGeneric] SCAM DETECTED in email from ${from}: ${detection.reason}`);
                
                // Engage Scam Agent
                const response = await agentEngine.generateResponse(id.toString(), { text: snippet }, [], { channel: 'Email', sender: from });
                
                if (response && response.text) {
                    // Extract Intelligence
                    const intelligence = await intelligenceExtractor.extract([{ text: snippet }]);
                    const agentNotes = `[GENERIC EMAIL SCAN] From: ${from} | Persona: ${response.sessionData.persona.name} | Reason: ${detection.reason}`;
                    
                    await intelligenceStore.save(id.toString(), intelligence, agentNotes);
                    
                    // Send Reply
                    await this.sendReply(from, `Re: ${subject}`, response.text);
                    analysisResult.status = 'replied';
                    analysisResult.agentResponse = response.text;
                }
            }

            results.push(analysisResult);
        }

        connection.end();
        return results;
    }

    async sendReply(to, subject, body) {
        let transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SMTP_HOST || this.config.imap.host.replace('imap.', 'smtp.'),
            port: process.env.EMAIL_SMTP_PORT || 465,
            secure: true, 
            auth: {
                user: this.config.imap.user,
                pass: this.config.imap.password,
            },
        });

        await transporter.sendMail({
            from: `"Security Honeypot" <${this.config.imap.user}>`,
            to: to,
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
        });

        console.log(`[EmailServiceGeneric] Reply sent to ${to}`);
    }
}

module.exports = new EmailServiceGeneric();
