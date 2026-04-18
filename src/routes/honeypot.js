const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const scamDetector = require('../services/scamDetector');
const agentEngine = require('../services/agentEngine');
const intelligenceExtractor = require('../services/intelligenceExtractor');
const callbackService = require('../services/callbackService');
const intelligenceStore = require('../utils/intelligenceStore');

// Retrieve stored intelligence for the dashboard
router.get('/intelligence', async (req, res) => {
  const data = await intelligenceStore.getAll();
  res.json(data);
});

router.post('/message', authMiddleware, async (req, res) => {
  const { sessionId, message, conversationHistory, metadata } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ status: 'error', message: 'Missing sessionId or message' });
  }

  try {
    // 1. Detect Scam Intent
    const detection = await scamDetector.detect(message, conversationHistory);

    if (!detection.isScam) {
      return res.json({
        status: 'success',
        scamDetected: false,
        message: 'No scam detected',
        reason: detection.reason
      });
    }

    const { isScam, reason, confidence, riskScore } = detection;

    // 2. Engage Agent
    let agentResult = await agentEngine.generateResponse(sessionId, message, conversationHistory, metadata);
    
    // Check if AI failed (e.g. Quota/Connection error)
    if (!agentResult) {
        const session = agentEngine.getSession(sessionId);
        agentResult = {
            text: `Wait, my internet is acting up. Can you say that again? I missed what you meant by ${message.text.substring(0, 20)}...`,
            sessionData: session || { persona: { name: 'Assistant' }, startTime: Date.now(), messageCount: 1 }
        };
    }
    const { text, sessionData } = agentResult;

    // 3. Extract Intelligence
    // Combine history and current message for extraction
    const fullHistory = [...(conversationHistory || []), message];
    const intelligence = await intelligenceExtractor.extract(fullHistory);

    // 4. Summarize behavior for agentNotes
    const agentNotes = `SCAM TYPE: ${intelligence.scamType} | STRATEGY: ${intelligence.nextBestAction} | TACTICS: ${intelligence.suspiciousKeywords.join(', ')} | PERSONA: ${sessionData.persona.name}`;

    // Save to persistent store
    await intelligenceStore.save(sessionId, intelligence, agentNotes);

    // 5. Prepare Response
    const responseBody = {
      status: 'success',
      scamDetected: true,
      detectionReason: reason,
      detectionConfidence: confidence,
      riskScore: riskScore || 0,
      engagementMetrics: {
        engagementDurationSeconds: Math.floor((Date.now() - sessionData.startTime) / 1000),
        totalMessagesExchanged: (conversationHistory?.length || 0) + 2 // History + current + our reply
      },
      extractedIntelligence: intelligence,
      agentNotes: agentNotes,
      agentResponse: text, // Original key
      agentReply: text // Blueprint key compatibility
    };

    // 6. Callback logic (Heuristic: Send after 5 messages or if we have bank/UPI info)
    const hasCriticalInfo = intelligence.bankAccounts.length > 0 || intelligence.upiIds.length > 0;
    if (sessionData.messageCount >= 5 || hasCriticalInfo) {
      // Run as background task to not block response
      callbackService.sendFinalResult(
        sessionId,
        true,
        (conversationHistory?.length || 0) + 2,
        intelligence,
        agentNotes
      ).catch(err => console.error('Delayed callback error:', err));
    }

    res.json(responseBody);

  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;
