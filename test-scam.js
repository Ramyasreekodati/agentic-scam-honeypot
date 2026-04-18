const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/message';
const API_KEY = process.env.YOUR_SECRET_API_KEY || 'your_actual_api_key_here';

const testScam = async () => {
  const payload = {
    sessionId: "wertyu-dfghj-ertyui-" + Date.now(),
    message: {
      sender: "scammer",
      text: "Your bank account will be blocked today. Click here to verify: http://bit.ly/fake-bank-login or send 1000 INR to upi@scam",
      timestamp: new Date().toISOString()
    },
    conversationHistory: [],
    metadata: {
      channel: "SMS",
      language: "English",
      locale: "IN"
    }
  };

  try {
    console.log('Sending test scam message...');
    const response = await axios.post(API_URL, payload, {
      headers: { 'x-api-key': API_KEY }
    });
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
};

testScam();
