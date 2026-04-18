const imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const scamDetector = require('./scamDetector');
const agentEngine = require('./agentEngine');
const intelligenceExtractor = require('./intelligenceExtractor');
const intelligenceStore = require('../utils/intelligenceStore');

class EmailServiceGeneric {
    /**
     * Scans any inbox using provided IMAP configuration.
     * @param {Object} customConfig Optional IMAP configuration.
     * @param {number} limit 
     */
    async scanInbox(customConfig = null, limit = 20) {
        const config = customConfig || {
            imap: {
                user: process.env.EMAIL_USER,
                password: process.env.EMAIL_PASS,
                host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
                port: process.env.EMAIL_IMAP_PORT || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 5000
            }
        };

        if (!config.imap.user || !config.imap.password) {
            throw new Error('IMAP credentials not provided.');
        }

        let connection;
        try {
            connection = await imap.connect(config);
            await connection.openBox('INBOX');

            const searchCriteria = ['UNSEEN'];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: true };

            const messages = await connection.search(searchCriteria, fetchOptions);
            const results = [];

            // Sort to get newest first
            messages.reverse();
            const topMessages = messages.slice(0, limit);

            for (const message of topMessages) {
                const id = message.attributes.uid;
                const idHeader = message.parts.find(part => part.which === 'HEADER');
                const subject = idHeader.body.subject ? idHeader.body.subject[0] : '(No Subject)';
                const from = idHeader.body.from ? idHeader.body.from[0] : 'Unknown';
                const bodyPart = message.parts.find(part => part.which === 'TEXT');
                const body = bodyPart ? bodyPart.body : '';
                const snippet = body.substring(0, 1000).replace(/<[^>]*>?/gm, '');

                const detection = await scamDetector.detect({ text: snippet, subject });
                
                let analysisResult = {
                    id: id,
                    from: from,
                    subject: subject,
                    isScam: detection.isScam,
                    reason: detection.reason,
                    riskScore: detection.confidenceScore || 0,
                    status: 'analyzed',
                    snippet: snippet
                };

                if (detection.isScam) {
                    const response = await agentEngine.generateResponse(id.toString(), { text: snippet }, [], { channel: 'IMAP', sender: from });
                    
                    if (response && response.text) {
                        const intelligence = await intelligenceExtractor.extract([{ text: snippet }]);
                        await intelligenceStore.save(id.toString(), intelligence, `[IMAP] From: ${from}`);
                        
                        await this.sendReply(config, from, `Re: ${subject}`, response.text);
                        analysisResult.status = 'replied';
                        analysisResult.agentResponse = response.text;
                    }
                }
                results.push(analysisResult);
            }
            return results;
        } finally {
            if (connection) connection.end();
        }
    }

    async sendReply(config, to, subject, body) {
        let transporter = nodemailer.createTransport({
            host: config.imap.host.replace('imap.', 'smtp.'),
            port: 465,
            secure: true, 
            auth: {
                user: config.imap.user,
                pass: config.imap.password,
            },
        });

        await transporter.sendMail({
            from: `"Security Honeypot" <${config.imap.user}>`,
            to: to,
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
        });
    }
}

module.exports = new EmailServiceGeneric();
