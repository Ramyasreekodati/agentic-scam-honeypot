const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/message';
const API_KEY = process.env.YOUR_SECRET_API_KEY || 'your_actual_api_key_here';

const runTest = async () => {
    try {
        console.log('Sending SCAM message to Honeypot...');
        const resp = await axios.post(API_URL, {
            sessionId: "test-callback-session-" + Date.now(),
            message: {
                sender: "scammer",
                text: "Your account is blocked. Send 5000 to upi@scam immediately.",
                timestamp: new Date().toISOString()
            },
            conversationHistory: [],
            metadata: { channel: "SMS", language: "English", locale: "IN" }
        }, {
            headers: { 'x-api-key': API_KEY }
        });

        console.log('API Response:', JSON.stringify(resp.data, null, 2));
        console.log('\n--- WAIT FOR CALLBACK LOGS IN SERVER CONSOLE ---');
    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
};

runTest();
