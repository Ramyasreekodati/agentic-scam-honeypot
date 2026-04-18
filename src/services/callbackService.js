const axios = require('axios');

class CallbackService {
  /**
   * Sends the final extracted intelligence to the configured evaluation endpoints.
   */
  async sendFinalResult(sessionId, scamDetected, totalMessages, intelligence, agentNotes) {
    const endpoints = [
      process.env.GUVI_CALLBACK_ENDPOINT,
      process.env.STARTWORLD_CALLBACK_ENDPOINT
    ].filter(Boolean);

    const payload = {
      sessionId: sessionId,
      scamDetected: scamDetected,
      totalMessagesExchanged: totalMessages,
      extractedIntelligence: {
        bankAccounts: intelligence.bankAccounts || [],
        upiIds: intelligence.upiIds || [],
        phishingLinks: intelligence.phishingLinks || [],
        phoneNumbers: intelligence.phoneNumbers || [],
        suspiciousKeywords: intelligence.suspiciousKeywords || []
      },
      agentNotes: agentNotes
    };

    console.log(`[CallbackService] Sending final results for session ${sessionId}...`);

    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(endpoint, payload, { timeout: 10000 });
        console.log(`[CallbackService] Success (${endpoint}): ${response.status}`);
      } catch (error) {
        console.warn(`[CallbackService] Delivery failed to ${endpoint}:`, error.message);
      }
    }
    return true;
  }
}

module.exports = new CallbackService();
